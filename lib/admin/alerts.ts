// What the admin dashboard calls out, as plain functions. "Today" is each branch's own day,
// because the branches can sit in different timezones.

import { localTime, zonedToUtc } from "../hours";

/** A paid order nobody has accepted, or a finished delivery with no driver, after this long. */
export const LATE_AFTER_MINUTES = 10;

export function todayWindow(timezone: string, at: Date): { start: Date; end: Date } {
  const { isoDate } = localTime(at, timezone);
  const next = new Date(`${isoDate}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return { start: zonedToUtc(isoDate, "00:00", timezone), end: zonedToUtc(next.toISOString().slice(0, 10), "00:00", timezone) };
}

type AlertOrder = {
  status: string;
  type: string;
  updatedAt: Date;
  delivery: { driverId: string | null; courierRef: string | null } | null;
};

/** The two ways an order gets stuck: the kitchen has not accepted it, or no driver has it. */
export function lateOrderCounts(orders: readonly AlertOrder[], at: Date): { unaccepted: number; noDriver: number } {
  const cutoff = at.getTime() - LATE_AFTER_MINUTES * 60_000;
  let unaccepted = 0;
  let noDriver = 0;
  for (const order of orders) {
    if (order.updatedAt.getTime() > cutoff) continue;
    if (order.status === "RECEIVED") unaccepted++;
    if (order.status === "READY" && order.type === "DELIVERY" && !order.delivery?.driverId && !order.delivery?.courierRef) noDriver++;
  }
  return { unaccepted, noDriver };
}

export type Alert = { key: string; text: string; href: string; level: "urgent" | "notice" };

type AlertInput = {
  branches: readonly { name: string; slug: string; onlineOrderingOpen: boolean; late: { unaccepted: number; noDriver: number } }[];
  failedPayments: number;
  awaitingDeposit: number;
  newEventRequests: number;
};

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function buildAlerts(input: AlertInput): Alert[] {
  const alerts: Alert[] = [];
  for (const branch of input.branches) {
    if (!branch.onlineOrderingOpen) {
      alerts.push({ key: `paused-${branch.slug}`, level: "urgent", text: `${branch.name} is in-store only, and is not taking online orders.`, href: "/admin/branches" });
    }
    if (branch.late.unaccepted > 0) {
      alerts.push({
        key: `late-${branch.slug}`,
        level: "urgent",
        text: `${branch.name}: ${plural(branch.late.unaccepted, "order", "orders")} waiting more than ${LATE_AFTER_MINUTES} minutes to be accepted.`,
        href: `/staff/orders?branch=${branch.slug}`,
      });
    }
    if (branch.late.noDriver > 0) {
      alerts.push({
        key: `driver-${branch.slug}`,
        level: "urgent",
        text: `${branch.name}: ${plural(branch.late.noDriver, "delivery", "deliveries")} ready for more than ${LATE_AFTER_MINUTES} minutes with no driver.`,
        href: `/staff/orders?branch=${branch.slug}`,
      });
    }
  }
  if (input.failedPayments > 0) {
    alerts.push({ key: "failed-payments", level: "notice", text: `${plural(input.failedPayments, "payment", "payments")} failed today.`, href: "/admin/orders" });
  }
  if (input.awaitingDeposit > 0) {
    alerts.push({ key: "deposits", level: "notice", text: `${plural(input.awaitingDeposit, "booking", "bookings")} today still waiting for a deposit.`, href: "/staff/reservations" });
  }
  if (input.newEventRequests > 0) {
    alerts.push({ key: "events", level: "notice", text: `${plural(input.newEventRequests, "new event request", "new event requests")} to answer.`, href: "/admin/events" });
  }
  return alerts;
}
