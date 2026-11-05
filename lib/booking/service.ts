import { ApiError } from "../api";
import type { CurrentUser } from "../auth";
import { prisma } from "../db";
import { now, services } from "../env";
import type { Prisma } from "../generated/prisma/client";
import { formatTime, fromMinutes, localTime, type OpeningHours } from "../hours";
import { refundPayment, startPayment, type CheckoutPayment, type PaymentMethod } from "../payments";
import { stripe } from "../payments/stripe";
import type { ChangeReservationInput, CreateReservationInput, JoinWaitlistInput } from "../validation/booking";
import { cancellationRule, depositCents, heldCents, isRefundable, planDepositChange, type DepositPolicy } from "./deposits";
import { notifyBooked, notifyCancelled, notifyChanged, notifyDepositDue, notifyLatePaymentRefunded, notifyWaitlistJoined, notifyWaitlistOffer } from "./notify";
import { bookableSlots, bookingWindow, daySlots, DEPOSIT_HOLD_MINUTES, findBookableSlot, fitsInSlot, holdEndsAt, isBookableDate, isHoldActive, seatsTaken, type Slot } from "./slots";
import { checkOffer, offerableSeats, pickOffers, type OfferCheck } from "./waitlist";

const SEAT_HOLDING = ["PENDING_DEPOSIT", "CONFIRMED", "SEATED"] as const;

export const reservationInclude = {
  branch: { select: { id: true, slug: true, name: true, address: true, city: true, phone: true, timezone: true, tableCapacityPerSlot: true } },
  payment: true,
};

type Tx = Prisma.TransactionClient;

async function loadBranch(branchId: string) {
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) throw new ApiError(404, "BRANCH_NOT_FOUND", "We could not find that branch.");
  return branch;
}

/** The deposit amount and cancellation window live in one row, which the owner controls. */
export async function bookingSettings() {
  return (await prisma.settings.findUnique({ where: { id: 1 } })) ?? prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

/**
 * Runs one slot's capacity check and write as a single step. The lock is per branch and slot,
 * so two guests going for the last seats take turns and the second one sees the first booking.
 */
async function withSlotLock<T>(branchId: string, startsAt: Date, work: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${branchId}|${startsAt.toISOString()}`}))`;
      return work(tx);
    },
    { maxWait: 15_000, timeout: 30_000 },
  );
}

function slotRows(client: Tx | typeof prisma, branchId: string, startsAt: Date, excludeReservationId?: string) {
  return client.reservation.findMany({
    where: { branchId, startsAt, status: { in: [...SEAT_HOLDING] }, id: excludeReservationId ? { not: excludeReservationId } : undefined },
    select: { status: true, partySize: true, createdAt: true },
  });
}

function assertBookableSlot(branch: { openingHours: unknown; timezone: string }, startsAt: Date, at: Date): Slot {
  const slot = findBookableSlot(branch.openingHours as OpeningHours, startsAt, branch.timezone, at);
  if (!slot) throw new ApiError(422, "BAD_TIME", "That time is no longer available. Please pick another.");
  return slot;
}

function assertPartyFitsBranch(branch: { name: string; tableCapacityPerSlot: number }, partySize: number): void {
  if (partySize > branch.tableCapacityPerSlot) {
    throw new ApiError(422, "PARTY_TOO_LARGE", `${branch.name} can seat up to ${branch.tableCapacityPerSlot} guests at one time. For a larger group, please send us an event request.`);
  }
}

// ---- Slots

export type DaySlot = Slot & { available: boolean; rule: string };
export type DaySlots = {
  date: string;
  today: string;
  lastDate: string;
  /** Why there is nothing to pick, for the page to explain. */
  reason: "OUT_OF_RANGE" | "CLOSED" | "NONE_LEFT" | null;
  partyTooLarge: boolean;
  deposit: { amountCents: number; perGuestCents: number; minParty: number; freeCancelHours: number };
  slots: DaySlot[];
};

/** Times for one date and party. A full time stays in the list, so the guest can join its waitlist. */
export async function listDaySlots(branchId: string, date: string | undefined, party: number, reservationId?: string): Promise<DaySlots> {
  const branch = await loadBranch(branchId);
  await releaseExpiredHolds(branchId);
  const at = now();
  const hours = branch.openingHours as OpeningHours;
  const { today, lastDate } = bookingWindow(at, branch.timezone);
  const isoDate = date ?? today;
  const settings = await bookingSettings();
  const amountCents = depositCents(party, settings);
  const deposit = { amountCents, perGuestCents: settings.depositPerGuestCents, minParty: settings.depositMinParty, freeCancelHours: settings.freeCancelHours };
  const base = { date: isoDate, today, lastDate, deposit, partyTooLarge: party > branch.tableCapacityPerSlot };

  if (!isBookableDate(isoDate, at, branch.timezone)) return { ...base, reason: "OUT_OF_RANGE", slots: [] };
  const slots = bookableSlots(hours, isoDate, branch.timezone, at);
  if (slots.length === 0) return { ...base, reason: daySlots(hours, isoDate, branch.timezone).length === 0 ? "CLOSED" : "NONE_LEFT", slots: [] };

  const rows = await prisma.reservation.findMany({
    where: { branchId, startsAt: { in: slots.map((slot) => new Date(slot.iso)) }, status: { in: [...SEAT_HOLDING] }, id: reservationId ? { not: reservationId } : undefined },
    select: { startsAt: true, status: true, partySize: true, createdAt: true },
  });
  return {
    ...base,
    reason: null,
    slots: slots.map((slot) => ({
      ...slot,
      available: fitsInSlot(
        branch.tableCapacityPerSlot,
        rows.filter((row) => row.startsAt.toISOString() === slot.iso),
        party,
        at,
      ),
      rule: cancellationRule({ depositCents: amountCents, startsAt: new Date(slot.iso), freeCancelHours: settings.freeCancelHours, timezone: branch.timezone, at }),
    })),
  };
}

// ---- Reservations

export type BookingResult = { reservationId: string; status: string; depositCents: number; payment: CheckoutPayment | null };

/** Takes the deposit for a table already being held, and links the payment to it. */
async function startDeposit(reservation: { id: string; email: string; depositAmountCents: number }, method: PaymentMethod): Promise<CheckoutPayment> {
  const payment = await startPayment({ method, amountCents: reservation.depositAmountCents, purpose: "RESERVATION_DEPOSIT", receiptEmail: reservation.email });
  await prisma.reservation.update({ where: { id: reservation.id }, data: { paymentId: payment.paymentId } });
  return payment;
}

type CreatedReservation = Prisma.ReservationGetPayload<{ include: typeof reservationInclude }>;

/**
 * The table is already saved when this runs, so it must not read the database again: a failure
 * here would tell the guest the booking failed while the booking stands. Messages never throw,
 * so a table with no deposit cannot fail from this point on.
 */
async function finishBooking(reservation: CreatedReservation, method: PaymentMethod, freeCancelHours: number): Promise<BookingResult> {
  const reservationId = reservation.id;
  if (reservation.status === "CONFIRMED") {
    await notifyBooked(reservation, freeCancelHours);
    return { reservationId, status: reservation.status, depositCents: 0, payment: null };
  }
  let payment: CheckoutPayment;
  try {
    payment = await startDeposit(reservation, method);
  } catch (error) {
    // No way to pay means no reason to keep the seats. If this fails too, the hold still ends by itself.
    await prisma.reservation
      .updateMany({ where: { id: reservationId, status: "PENDING_DEPOSIT" }, data: { status: "CANCELLED", cancelledAt: now() } })
      .catch((releaseError) => console.error("Could not release hold", reservationId, releaseError));
    throw error;
  }
  await notifyDepositDue(reservation, holdEndLabel(reservation.createdAt, reservation.branch.timezone));
  return { reservationId, status: reservation.status, depositCents: reservation.depositAmountCents, payment };
}

export function holdEndLabel(createdAt: Date, timezone: string): string {
  return formatTime(fromMinutes(localTime(holdEndsAt(createdAt), timezone).minutes));
}

export async function createReservation(input: CreateReservationInput, user: CurrentUser | null): Promise<BookingResult> {
  const branch = await loadBranch(input.branchId);
  const startsAt = new Date(input.startsAt);
  const at = now();
  assertBookableSlot(branch, startsAt, at);
  assertPartyFitsBranch(branch, input.partySize);
  await releaseExpiredHolds(branch.id);
  const settings = await bookingSettings();
  const deposit = depositCents(input.partySize, settings);

  const reservation = await withSlotLock(branch.id, startsAt, async (tx) => {
    const rows = await slotRows(tx, branch.id, startsAt);
    if (!fitsInSlot(branch.tableCapacityPerSlot, rows, input.partySize, at)) {
      throw new ApiError(409, "SLOT_FULL", "That time has just filled up. Please pick another, or join its waitlist.");
    }
    return tx.reservation.create({
      data: {
        branchId: branch.id,
        userId: user?.id ?? null,
        name: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone,
        startsAt,
        partySize: input.partySize,
        status: deposit > 0 ? "PENDING_DEPOSIT" : "CONFIRMED",
        occasion: input.occasion || null,
        specialRequests: input.specialRequests || null,
        depositAmountCents: deposit,
        // The hold is timed by the rules clock, the same one that expires it.
        createdAt: at,
      },
      include: reservationInclude,
    });
  });
  return finishBooking(reservation, input.paymentMethod, settings.freeCancelHours);
}

/** Starts or restarts payment for a table still being held. */
export async function startReservationPayment(reservationId: string, method: PaymentMethod): Promise<BookingResult> {
  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId }, include: { payment: true } });
  if (!reservation) throw new ApiError(404, "RESERVATION_NOT_FOUND", "We could not find that booking.");
  if (reservation.status !== "PENDING_DEPOSIT") throw new ApiError(409, "NOTHING_TO_PAY", "There is no deposit to pay on this booking.");
  if (!isHoldActive(reservation.createdAt, now())) throw new ApiError(409, "HOLD_EXPIRED", "The hold on this table has ended, so it can no longer be paid. Please book again.");
  const previous = reservation.payment;
  const payment = await startDeposit(reservation, method);
  if (previous) await voidPayment(previous);
  return { reservationId, status: reservation.status, depositCents: reservation.depositAmountCents, payment };
}

export async function changeReservation(reservationId: string, input: ChangeReservationInput) {
  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId }, include: reservationInclude });
  if (!reservation) throw new ApiError(404, "RESERVATION_NOT_FOUND", "We could not find that booking.");
  const at = now();
  if ((reservation.status !== "CONFIRMED" && reservation.status !== "PENDING_DEPOSIT") || reservation.startsAt <= at) {
    throw new ApiError(409, "CANNOT_CHANGE", "This booking can no longer be changed.");
  }
  const holding = reservation.status === "PENDING_DEPOSIT";
  if (holding && !isHoldActive(reservation.createdAt, at)) {
    throw new ApiError(409, "HOLD_EXPIRED", "The hold on this table has ended. Please book again.");
  }

  const branch = await loadBranch(reservation.branchId);
  const startsAt = input.startsAt ? new Date(input.startsAt) : reservation.startsAt;
  const partySize = input.partySize ?? reservation.partySize;
  const moving = startsAt.getTime() !== reservation.startsAt.getTime();
  const growing = partySize > reservation.partySize;
  if (moving) assertBookableSlot(branch, startsAt, at);
  if (growing) assertPartyFitsBranch(branch, partySize);

  const settings = await bookingSettings();
  const refundable = isRefundable(reservation.startsAt, at, settings.freeCancelHours);
  const held = heldCents(reservation.payment);

  let refundCents = 0;
  let newDeposit: number;
  if (holding) {
    // Nothing has been paid yet, so the deposit is simply worked out again.
    newDeposit = depositCents(partySize, settings);
  } else {
    const plan = planDepositChange({ heldCents: held, currentParty: reservation.partySize, newParty: partySize, moving, refundable, policy: settings });
    if (!plan.ok) throw depositChangeError(plan.reason, partySize, settings, reservation.branch.phone);
    refundCents = plan.refundCents;
    newDeposit = plan.newDepositCents;
  }

  // An unpaid hold keeps its original clock, so changing it cannot buy more time.
  const unpaidHoldChanged = holding && newDeposit !== reservation.depositAmountCents;
  const data = {
    startsAt,
    partySize,
    depositAmountCents: newDeposit,
    status: holding && newDeposit === 0 ? ("CONFIRMED" as const) : reservation.status,
    paymentId: unpaidHoldChanged ? null : reservation.paymentId,
    occasion: input.occasion === undefined ? reservation.occasion : input.occasion || null,
    specialRequests: input.specialRequests === undefined ? reservation.specialRequests : input.specialRequests || null,
  };

  const addsSeats = moving || growing;
  const apply = async (tx: Tx) => {
    if (addsSeats) {
      const rows = await slotRows(tx, branch.id, startsAt, reservation.id);
      if (!fitsInSlot(branch.tableCapacityPerSlot, rows, partySize, at)) {
        throw new ApiError(409, "SLOT_FULL", "There is not enough room at that time. Please pick another.");
      }
    }
    const updated = await tx.reservation.updateMany({ where: { id: reservation.id, status: reservation.status, startsAt: reservation.startsAt }, data });
    if (updated.count === 0) throw new ApiError(409, "CANNOT_CHANGE", "This booking has just changed. Please refresh.");
  };
  if (addsSeats) await withSlotLock(branch.id, startsAt, apply);
  else await prisma.$transaction(apply);

  if (refundCents > 0) {
    try {
      await refundPayment(reservation.paymentId!, refundCents);
    } catch (error) {
      // Put the booking back so the guest can try again; the refund key makes a retry safe.
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { startsAt: reservation.startsAt, partySize: reservation.partySize, depositAmountCents: reservation.depositAmountCents, occasion: reservation.occasion, specialRequests: reservation.specialRequests },
      });
      console.error(error);
      throw new ApiError(502, "REFUND_FAILED", "We could not refund the difference, so your booking has not changed. Please try again.");
    }
  }
  if (unpaidHoldChanged && reservation.payment) await voidPayment(reservation.payment);

  const updated = await prisma.reservation.findUniqueOrThrow({ where: { id: reservation.id }, include: reservationInclude });
  await notifyChanged(updated, settings.freeCancelHours, refundCents);
  if (moving || partySize < reservation.partySize) await tellWaitlist(branch.id, reservation.startsAt);
  return updated;
}

function depositChangeError(reason: "DEPOSIT_INCREASE" | "WINDOW_CLOSED", partySize: number, settings: DepositPolicy, phone: string): ApiError {
  if (reason === "WINDOW_CLOSED") {
    return new ApiError(
      409,
      "WINDOW_CLOSED",
      `Your deposit is paid and your table is less than ${settings.freeCancelHours} hours away, so its time cannot be moved online. Please call the branch on ${phone}.`,
    );
  }
  return new ApiError(
    409,
    "DEPOSIT_INCREASE",
    `A party of ${partySize} needs a larger deposit than this booking has, so this cannot be done as a change. Please make a new booking for the larger party, then cancel this one.`,
  );
}

export type CancelResult = { status: "CANCELLED"; refundedCents: number; keptCents: number };

export async function cancelReservation(reservationId: string): Promise<CancelResult> {
  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId }, include: reservationInclude });
  if (!reservation) throw new ApiError(404, "RESERVATION_NOT_FOUND", "We could not find that booking.");
  const at = now();
  if ((reservation.status !== "CONFIRMED" && reservation.status !== "PENDING_DEPOSIT") || reservation.startsAt <= at) {
    throw new ApiError(409, "CANNOT_CANCEL", "This booking can no longer be cancelled.");
  }

  // Read before cancelling: a failed read afterwards would leave a cancelled table and no refund.
  const settings = await bookingSettings();

  // Conditional on the status we read, so pressing cancel twice can never refund twice.
  const claimed = await prisma.reservation.updateMany({ where: { id: reservationId, status: reservation.status }, data: { status: "CANCELLED", cancelledAt: at } });
  if (claimed.count === 0) throw new ApiError(409, "CANNOT_CANCEL", "This booking can no longer be cancelled.");

  const held = heldCents(reservation.payment);
  const refundable = isRefundable(reservation.startsAt, at, settings.freeCancelHours);
  let refundedCents = 0;
  if (held > 0 && refundable) {
    try {
      refundedCents = await refundPayment(reservation.paymentId!);
    } catch (error) {
      await prisma.reservation.update({ where: { id: reservationId }, data: { status: reservation.status, cancelledAt: null } });
      console.error(error);
      throw new ApiError(502, "REFUND_FAILED", "We could not refund your deposit, so your booking has not been cancelled. Please try again.");
    }
  }
  if (reservation.payment) await voidPayment(reservation.payment);

  const keptCents = refundable ? 0 : held;
  await notifyCancelled(reservation, refundedCents, keptCents);
  await tellWaitlist(reservation.branchId, reservation.startsAt);
  return { status: "CANCELLED", refundedCents, keptCents };
}

/**
 * Called by markPaymentSucceeded, once per payment. Money that arrives for a table no longer
 * held, or for a payment replaced by a newer one, goes straight back: it cannot be kept
 * against a table we have let go.
 */
export async function applyReservationDeposit(paymentId: string): Promise<void> {
  const reservation = await prisma.reservation.findUnique({ where: { paymentId }, include: reservationInclude });
  if (!reservation) {
    await refundPayment(paymentId);
    return;
  }
  // An earlier attempt confirmed the table before failing, so this retry has nothing to do.
  if (reservation.status === "CONFIRMED") return;
  const at = now();
  const settings = await bookingSettings();
  const confirmed = isHoldActive(reservation.createdAt, at)
    ? await prisma.reservation.updateMany({ where: { id: reservation.id, status: "PENDING_DEPOSIT" }, data: { status: "CONFIRMED" } })
    : { count: 0 };
  if (confirmed.count === 1) {
    await notifyBooked(reservation, settings.freeCancelHours);
    return;
  }
  const refunded = await refundPayment(paymentId);
  await prisma.reservation.updateMany({ where: { id: reservation.id, status: "PENDING_DEPOSIT" }, data: { status: "CANCELLED", cancelledAt: at } });
  await notifyLatePaymentRefunded(reservation, refunded);
}

/**
 * Best effort: stops an abandoned card payment being completed in another tab. If it fails or
 * the guest pays anyway, applyReservationDeposit refunds them.
 */
export async function voidPayment(payment: { id: string; provider: string; providerRef: string | null; status: string }): Promise<void> {
  if (payment.provider !== "STRIPE" || !payment.providerRef || !services.stripe) return;
  if (payment.status !== "PENDING" && payment.status !== "FAILED") return;
  try {
    await stripe().paymentIntents.cancel(payment.providerRef);
  } catch (error) {
    console.error("Could not cancel payment", payment.id, error);
  }
}

/**
 * Lets go of tables whose 30 minutes to pay have run out. There is no scheduler, so this runs
 * whenever someone looks at that branch's slots or day, which is whenever it can matter.
 */
export async function releaseExpiredHolds(branchId: string): Promise<void> {
  const at = now();
  const cutoff = new Date(at.getTime() - DEPOSIT_HOLD_MINUTES * 60_000);
  const stale = await prisma.reservation.findMany({ where: { branchId, status: "PENDING_DEPOSIT", createdAt: { lt: cutoff } }, include: { payment: true } });
  for (const reservation of stale) {
    const released = await prisma.reservation.updateMany({ where: { id: reservation.id, status: "PENDING_DEPOSIT" }, data: { status: "CANCELLED", cancelledAt: at } });
    if (released.count === 0) continue;
    if (reservation.payment) await voidPayment(reservation.payment);
    await tellWaitlist(branchId, reservation.startsAt);
  }
}

// ---- Waitlist

/** A problem offering a table must never undo the cancellation that freed it. */
async function tellWaitlist(branchId: string, startsAt: Date): Promise<void> {
  try {
    await offerFreedRoom(branchId, startsAt);
  } catch (error) {
    console.error("Could not offer freed room", error);
  }
}

/** Offers the room now free in one slot, oldest entry first. */
export async function offerFreedRoom(branchId: string, startsAt: Date, onlyEntryId?: string) {
  const at = now();
  if (startsAt <= at) return [];
  const branch = await loadBranch(branchId);
  const offered = await withSlotLock(branchId, startsAt, async (tx) => {
    const rows = await slotRows(tx, branchId, startsAt);
    const entries = await tx.waitlistEntry.findMany({ where: { branchId, startsAt, status: { in: ["WAITING", "OFFERED"] } } });
    const free = offerableSeats(branch.tableCapacityPerSlot, seatsTaken(rows, at), entries.filter((entry) => entry.status === "OFFERED"));
    const waiting = entries.filter((entry) => entry.status === "WAITING" && (!onlyEntryId || entry.id === onlyEntryId));
    const picks = pickOffers(waiting, free);
    if (picks.length > 0) {
      await tx.waitlistEntry.updateMany({ where: { id: { in: picks.map((entry) => entry.id) }, status: "WAITING" }, data: { status: "OFFERED" } });
    }
    return picks;
  });
  await Promise.all(offered.map((entry) => notifyWaitlistOffer({ ...entry, branch })));
  return offered;
}

export async function joinWaitlist(input: JoinWaitlistInput) {
  const branch = await loadBranch(input.branchId);
  const startsAt = new Date(input.startsAt);
  const at = now();
  assertBookableSlot(branch, startsAt, at);
  assertPartyFitsBranch(branch, input.partySize);
  await releaseExpiredHolds(branch.id);
  const email = input.email.toLowerCase();

  const { entry, fresh } = await withSlotLock(branch.id, startsAt, async (tx) => {
    const rows = await slotRows(tx, branch.id, startsAt);
    if (fitsInSlot(branch.tableCapacityPerSlot, rows, input.partySize, at)) {
      throw new ApiError(409, "SLOT_AVAILABLE", "Good news: that time has a table free now, so you can book it straight away.");
    }
    // Joining twice keeps the guest's original place.
    const existing = await tx.waitlistEntry.findFirst({ where: { branchId: branch.id, startsAt, email, status: { in: ["WAITING", "OFFERED"] } } });
    if (existing) return { entry: existing, fresh: false };
    const created = await tx.waitlistEntry.create({ data: { branchId: branch.id, startsAt, partySize: input.partySize, name: input.name, email, phone: input.phone } });
    return { entry: created, fresh: true };
  });
  if (fresh) await notifyWaitlistJoined({ ...entry, branch });
  return { id: entry.id, status: entry.status };
}

/** The guest takes the offered table. Capacity is checked again, because the offer held nothing. */
export async function confirmWaitlistOffer(entryId: string, method: PaymentMethod, user: CurrentUser | null): Promise<BookingResult> {
  const entry = await prisma.waitlistEntry.findUnique({ where: { id: entryId } });
  if (!entry) throw new ApiError(404, "WAITLIST_NOT_FOUND", "We could not find that waitlist place.");
  const branch = await loadBranch(entry.branchId);
  await releaseExpiredHolds(branch.id);
  const at = now();
  const settings = await bookingSettings();
  const deposit = depositCents(entry.partySize, settings);

  const result = await withSlotLock<{ check: OfferCheck; reservation?: CreatedReservation }>(branch.id, entry.startsAt, async (tx) => {
    const current = await tx.waitlistEntry.findUniqueOrThrow({ where: { id: entryId } });
    const rows = await slotRows(tx, branch.id, entry.startsAt);
    const check = checkOffer({ status: current.status, startsAt: entry.startsAt, at, partySize: entry.partySize, capacity: branch.tableCapacityPerSlot, taken: seatsTaken(rows, at) });
    if (check === "EXPIRED") await tx.waitlistEntry.update({ where: { id: entryId }, data: { status: "EXPIRED" } });
    // Someone booked the seats first: the guest goes back to waiting, with their place kept.
    if (check === "FULL") await tx.waitlistEntry.update({ where: { id: entryId }, data: { status: "WAITING" } });
    if (check !== "OK") return { check };
    await tx.waitlistEntry.update({ where: { id: entryId }, data: { status: "CONFIRMED" } });
    const reservation = await tx.reservation.create({
      data: {
        branchId: branch.id,
        userId: user?.id ?? null,
        name: entry.name,
        email: entry.email,
        phone: entry.phone,
        startsAt: entry.startsAt,
        partySize: entry.partySize,
        status: deposit > 0 ? "PENDING_DEPOSIT" : "CONFIRMED",
        depositAmountCents: deposit,
        createdAt: at,
      },
      include: reservationInclude,
    });
    return { check, reservation };
  });

  if (result.check === "NOT_OFFERED") throw new ApiError(409, "NOT_OFFERED", "There is no table on offer for this place on the waitlist.");
  if (result.check === "EXPIRED") throw new ApiError(409, "OFFER_EXPIRED", "That time has passed, so this offer has ended.");
  if (result.check === "FULL") throw new ApiError(409, "TABLE_TAKEN", "Sorry, that table has just been taken. You are still on the waitlist and we will tell you if another comes free.");

  try {
    return await finishBooking(result.reservation!, method, settings.freeCancelHours);
  } catch (error) {
    await prisma.waitlistEntry
      .update({ where: { id: entryId }, data: { status: "OFFERED" } })
      .catch((restoreError) => console.error("Could not restore waitlist offer", entryId, restoreError));
    throw error;
  }
}

export async function leaveWaitlist(entryId: string): Promise<void> {
  const entry = await prisma.waitlistEntry.findUnique({ where: { id: entryId } });
  if (!entry) throw new ApiError(404, "WAITLIST_NOT_FOUND", "We could not find that waitlist place.");
  const left = await prisma.waitlistEntry.updateMany({ where: { id: entryId, status: { in: ["WAITING", "OFFERED"] } }, data: { status: "CANCELLED" } });
  if (left.count === 0) throw new ApiError(409, "CANNOT_LEAVE", "This place on the waitlist has already ended.");
  // Their offer, if they had one, can now go to the next guest.
  if (entry.status === "OFFERED") await tellWaitlist(entry.branchId, entry.startsAt);
}

/** Loads a waitlist place, closing it first if its time has passed. */
export async function loadWaitlistEntry(entryId: string) {
  const entry = await prisma.waitlistEntry.findUnique({ where: { id: entryId }, include: { branch: { select: { id: true, name: true, address: true, city: true, phone: true, slug: true, timezone: true } } } });
  if (!entry) return null;
  if ((entry.status === "WAITING" || entry.status === "OFFERED") && entry.startsAt <= now()) {
    await prisma.waitlistEntry.updateMany({ where: { id: entryId, status: entry.status }, data: { status: "EXPIRED" } });
    return { ...entry, status: "EXPIRED" as const };
  }
  return entry;
}
