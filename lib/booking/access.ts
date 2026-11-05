import { canAccessBranch } from "../access";
import { ApiError } from "../api";
import { getCurrentUser } from "../auth";
import { prisma } from "../db";
import { formatMoney } from "../domain";
import { now } from "../env";
import { localTime, fromMinutes } from "../hours";
import { cancellationRule, DEPOSIT_LABEL, depositCents, depositState, heldCents, isRefundable, type DepositPolicy } from "./deposits";
import { bookingSettings, holdEndLabel, releaseExpiredHolds, reservationInclude } from "./service";
import { formatWhen, isHoldActive } from "./slots";

/**
 * Who can see a booking. A guest booking is reached through its unguessable id, the same link
 * we email them. A booking made while signed in also requires that account, or branch staff.
 */
export async function loadReservationForViewer(reservationId: string) {
  let reservation = await prisma.reservation.findUnique({ where: { id: reservationId }, include: reservationInclude });
  if (!reservation) return null;
  if (reservation.status === "PENDING_DEPOSIT" && !isHoldActive(reservation.createdAt, now())) {
    await releaseExpiredHolds(reservation.branchId);
    reservation = await prisma.reservation.findUniqueOrThrow({ where: { id: reservationId }, include: reservationInclude });
  }
  if (reservation.userId === null) return reservation;
  const user = await getCurrentUser();
  if (user && (user.id === reservation.userId || canAccessBranch(user, reservation.branchId))) return reservation;
  throw new ApiError(403, "FORBIDDEN", "Please sign in to see this booking.");
}

export function requireReservationFound<T>(reservation: T | null): T {
  if (!reservation) throw new ApiError(404, "RESERVATION_NOT_FOUND", "We could not find that booking.");
  return reservation;
}

type LoadedReservation = NonNullable<Awaited<ReturnType<typeof loadReservationForViewer>>>;

/** Only what a guest's browser needs. Payment references stay on the server. */
export function publicReservationView(reservation: LoadedReservation, policy: DepositPolicy) {
  const at = now();
  const { branch, payment } = reservation;
  const timezone = branch.timezone;
  const state = depositState(reservation, payment);
  const held = heldCents(payment);
  const open = (reservation.status === "CONFIRMED" || reservation.status === "PENDING_DEPOSIT") && reservation.startsAt > at;
  const refundable = isRefundable(reservation.startsAt, at, policy.freeCancelHours);
  const local = localTime(reservation.startsAt, timezone);

  let ifCancelledNow = "Nothing is charged if you cancel.";
  if (held > 0) {
    ifCancelledNow = refundable
      ? `If you cancel now, your ${formatMoney(held)} deposit is refunded in full.`
      : `If you cancel now, your ${formatMoney(held)} deposit is kept, because the time to cancel for a refund has passed.`;
  }

  return {
    id: reservation.id,
    status: reservation.status,
    startsAt: reservation.startsAt.toISOString(),
    when: formatWhen(reservation.startsAt, timezone),
    date: local.isoDate,
    time: fromMinutes(local.minutes),
    partySize: reservation.partySize,
    name: reservation.name,
    occasion: reservation.occasion,
    specialRequests: reservation.specialRequests,
    branch: { id: branch.id, slug: branch.slug, name: branch.name, address: branch.address, city: branch.city, phone: branch.phone, capacity: branch.tableCapacityPerSlot },
    deposit: {
      state,
      label: DEPOSIT_LABEL[state],
      amountCents: reservation.depositAmountCents,
      heldCents: held,
      refundedCents: payment?.refundedAmountCents ?? 0,
    },
    holdEnds: reservation.status === "PENDING_DEPOSIT" ? holdEndLabel(reservation.createdAt, timezone) : null,
    rule: cancellationRule({ depositCents: reservation.depositAmountCents, startsAt: reservation.startsAt, freeCancelHours: policy.freeCancelHours, timezone, at }),
    ifCancelledNow,
    canCancel: open,
    canChange: open,
    canMove: open && !(held > 0 && !refundable),
    canPay: reservation.status === "PENDING_DEPOSIT" && isHoldActive(reservation.createdAt, at) && reservation.startsAt > at,
    freeCancelHours: policy.freeCancelHours,
  };
}

export type PublicReservation = ReturnType<typeof publicReservationView>;

export async function publicReservation(reservationId: string): Promise<PublicReservation | null> {
  const reservation = await loadReservationForViewer(reservationId);
  return reservation ? publicReservationView(reservation, await bookingSettings()) : null;
}

/** What a waitlist page shows, including the deposit a table would need if it comes free. */
export async function publicWaitlistEntry(entry: {
  id: string;
  status: string;
  partySize: number;
  name: string;
  startsAt: Date;
  branch: { name: string; address: string; city: string; phone: string; slug: string; timezone: string };
}) {
  const settings = await bookingSettings();
  const deposit = depositCents(entry.partySize, settings);
  return {
    id: entry.id,
    status: entry.status,
    partySize: entry.partySize,
    name: entry.name,
    when: formatWhen(entry.startsAt, entry.branch.timezone),
    branch: { name: entry.branch.name, address: entry.branch.address, city: entry.branch.city, phone: entry.branch.phone, slug: entry.branch.slug },
    depositCents: deposit,
    rule: cancellationRule({ depositCents: deposit, startsAt: entry.startsAt, freeCancelHours: settings.freeCancelHours, timezone: entry.branch.timezone, at: now() }),
  };
}

export type PublicWaitlistEntry = Awaited<ReturnType<typeof publicWaitlistEntry>>;
