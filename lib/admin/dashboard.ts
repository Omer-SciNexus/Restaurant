import { prisma } from "../db";
import { buildAlerts, lateOrderCounts, todayWindow } from "./alerts";

const PAID = ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"] as const;
const ENDED = ["COMPLETED", "REJECTED", "CANCELLED"] as const;

/** Today's numbers across all branches. "Today" follows each branch's own clock. */
export async function loadDashboard() {
  // The real clock, not the demo clock: this reports on timestamps the database really recorded.
  const at = new Date();
  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, timezone: true, onlineOrderingOpen: true } });
  const windows = new Map(branches.map((branch) => [branch.id, todayWindow(branch.timezone, at)]));
  const earliest = new Date(Math.min(...[...windows.values()].map((w) => w.start.getTime())));
  const latest = new Date(Math.max(...[...windows.values()].map((w) => w.end.getTime())));
  const during = { gte: earliest, lt: latest };

  // One at a time. A page this small does not need eight connections at once, and the local
  // Postgres from `prisma dev` drops connections when asked to open that many together.
  const orders = await prisma.order.findMany({ where: { createdAt: during, payments: { some: { status: { in: [...PAID] } } } }, select: { branchId: true, createdAt: true, status: true, totalCents: true } });
  const activeOrders = await prisma.order.findMany({
    where: { status: { in: ["RECEIVED", "READY"] } },
    select: { branchId: true, status: true, type: true, updatedAt: true, delivery: { select: { driverId: true, courierRef: true } } },
  });
  const reservations = await prisma.reservation.findMany({ where: { startsAt: during, status: { not: "CANCELLED" } }, select: { branchId: true, startsAt: true, status: true, partySize: true } });
  const failedPayments = await prisma.payment.count({ where: { status: "FAILED", updatedAt: during } });
  const unverifiedIngredients = await prisma.ingredient.count({ where: { verifiedAt: null } });
  const ingredients = await prisma.ingredient.count();
  const pendingApprovals = await prisma.nutritionChange.count({ where: { status: "PENDING" } });
  const newEventRequests = await prisma.eventRequest.count({ where: { status: "NEW" } });

  const inWindow = (branchId: string, instant: Date) => {
    const window = windows.get(branchId)!;
    return instant >= window.start && instant < window.end;
  };

  const rows = branches.map((branch) => {
    const today = orders.filter((order) => order.branchId === branch.id && inWindow(branch.id, order.createdAt));
    const bookings = reservations.filter((booking) => booking.branchId === branch.id && inWindow(branch.id, booking.startsAt));
    return {
      ...branch,
      orders: today.length,
      activeOrders: today.filter((order) => !ENDED.includes(order.status as (typeof ENDED)[number])).length,
      takenCents: today.filter((order) => order.status !== "REJECTED" && order.status !== "CANCELLED").reduce((sum, order) => sum + order.totalCents, 0),
      bookings: bookings.length,
      guests: bookings.reduce((sum, booking) => sum + booking.partySize, 0),
      awaitingDeposit: bookings.filter((booking) => booking.status === "PENDING_DEPOSIT").length,
      late: lateOrderCounts(activeOrders.filter((order) => order.branchId === branch.id), at),
    };
  });

  return {
    rows,
    totals: {
      orders: rows.reduce((sum, row) => sum + row.orders, 0),
      activeOrders: rows.reduce((sum, row) => sum + row.activeOrders, 0),
      bookings: rows.reduce((sum, row) => sum + row.bookings, 0),
      unverifiedIngredients,
      ingredients,
      pendingApprovals,
    },
    alerts: buildAlerts({
      branches: rows,
      failedPayments,
      awaitingDeposit: rows.reduce((sum, row) => sum + row.awaitingDeposit, 0),
      newEventRequests,
    }),
  };
}
