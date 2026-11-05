import { STAFF_ROLES } from "../access";
import { ApiError } from "../api";
import { requireApiRole, requireBranchAccess } from "../auth";
import { prisma } from "../db";
import { now } from "../env";
import { fromMinutes, formatTime, localTime, zonedToUtc } from "../hours";
import { DEPOSIT_LABEL, depositState, heldCents } from "./deposits";
import { notifyNoShow } from "./notify";
import { offerFreedRoom, releaseExpiredHolds, reservationInclude } from "./service";
import { addDays, formatWhen } from "./slots";
import { canStaffMove, type StaffReservationStatus } from "./status";

/** Staff can act on a booking only if it belongs to their branch. */
export async function requireStaffForReservation(reservationId: string) {
  const user = await requireApiRole(STAFF_ROLES);
  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId }, select: { id: true, branchId: true } });
  if (!reservation) throw new ApiError(404, "RESERVATION_NOT_FOUND", "We could not find that booking.");
  requireBranchAccess(user, reservation.branchId);
  return { user, reservation };
}

export async function requireStaffForWaitlistEntry(entryId: string) {
  const user = await requireApiRole(STAFF_ROLES);
  const entry = await prisma.waitlistEntry.findUnique({ where: { id: entryId }, select: { id: true, branchId: true } });
  if (!entry) throw new ApiError(404, "WAITLIST_NOT_FOUND", "We could not find that waitlist place.");
  requireBranchAccess(user, entry.branchId);
  return { user, entry };
}

function timeLabel(instant: Date, timezone: string): string {
  return formatTime(fromMinutes(localTime(instant, timezone).minutes));
}

/** One branch's bookings for one date in branch time, in time order. */
export async function listDayReservations(branch: { id: string; timezone: string }, isoDate: string) {
  await releaseExpiredHolds(branch.id);
  const rows = await prisma.reservation.findMany({
    where: { branchId: branch.id, startsAt: { gte: zonedToUtc(isoDate, "00:00", branch.timezone), lt: zonedToUtc(addDays(isoDate, 1), "00:00", branch.timezone) } },
    orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
    include: reservationInclude,
  });
  const at = now();
  return rows.map((row) => {
    const state = depositState(row, row.payment);
    return {
      id: row.id,
      status: row.status,
      time: timeLabel(row.startsAt, branch.timezone),
      partySize: row.partySize,
      name: row.name,
      phone: row.phone,
      occasion: row.occasion,
      specialRequests: row.specialRequests,
      depositLabel: DEPOSIT_LABEL[state],
      depositState: state,
      depositCents: heldCents(row.payment) || row.depositAmountCents,
      slotStarted: row.startsAt <= at,
    };
  });
}

export type StaffReservation = Awaited<ReturnType<typeof listDayReservations>>[number];

/** The single path for staff changes. Conditional on the status we read, so two taps cannot both apply. */
export async function moveReservation(reservationId: string, to: StaffReservationStatus) {
  const reservation = await prisma.reservation.findUniqueOrThrow({ where: { id: reservationId }, include: reservationInclude });
  if (!canStaffMove(reservation.status, to, reservation.startsAt, now())) {
    throw new ApiError(409, "BAD_TRANSITION", to === "NO_SHOW" && reservation.status === "CONFIRMED" ? "A table can only be marked as a no-show once its time has come." : "This booking has already moved on. Please refresh.");
  }
  const moved = await prisma.reservation.updateMany({ where: { id: reservationId, status: reservation.status }, data: { status: to } });
  if (moved.count === 0) throw new ApiError(409, "BAD_TRANSITION", "This booking has already moved on. Please refresh.");
  if (to === "NO_SHOW") await notifyNoShow(reservation, heldCents(reservation.payment));
  return to;
}

/** Everyone still waiting or offered a table at this branch, soonest time first. */
export async function listBranchWaitlist(branch: { id: string; timezone: string }) {
  const rows = await prisma.waitlistEntry.findMany({
    where: { branchId: branch.id, status: { in: ["WAITING", "OFFERED"] }, startsAt: { gt: now() } },
    orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    when: formatWhen(row.startsAt, branch.timezone),
    partySize: row.partySize,
    name: row.name,
    phone: row.phone,
    email: row.email,
    joined: row.createdAt.toISOString(),
  }));
}

export type StaffWaitlistEntry = Awaited<ReturnType<typeof listBranchWaitlist>>[number];

export async function offerToEntry(entryId: string): Promise<void> {
  const entry = await prisma.waitlistEntry.findUniqueOrThrow({ where: { id: entryId } });
  if (entry.status !== "WAITING") throw new ApiError(409, "NOT_WAITING", "This guest is no longer waiting. Please refresh.");
  const offered = await offerFreedRoom(entry.branchId, entry.startsAt, entryId);
  if (offered.length === 0) throw new ApiError(409, "NO_ROOM", "There is no room for this party at that time yet.");
}
