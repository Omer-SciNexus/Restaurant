import { prisma } from "../db";
import { now } from "../env";
import { publicEventView } from "../events/service";
import { DEPOSIT_LABEL, depositState } from "./deposits";
import { reservationInclude } from "./service";
import { formatWhen } from "./slots";

/** A signed-in guest's own bookings and event requests. Only ever filtered by their own id. */
export async function listUserBookings(userId: string) {
  const [reservations, events] = await Promise.all([
    prisma.reservation.findMany({ where: { userId }, orderBy: { startsAt: "desc" }, take: 100, include: reservationInclude }),
    prisma.eventRequest.findMany({
      where: { userId },
      orderBy: { eventDate: "desc" },
      take: 100,
      include: { branch: { select: { id: true, name: true, timezone: true } }, payment: true },
    }),
  ]);
  const at = now();
  return {
    reservations: reservations.map((row) => ({
      id: row.id,
      status: row.status,
      when: formatWhen(row.startsAt, row.branch.timezone),
      upcoming: row.startsAt > at && (row.status === "CONFIRMED" || row.status === "PENDING_DEPOSIT"),
      partySize: row.partySize,
      branchName: row.branch.name,
      depositLabel: DEPOSIT_LABEL[depositState(row, row.payment)],
    })),
    events: events.map(publicEventView),
  };
}
