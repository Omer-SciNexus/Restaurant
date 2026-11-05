import { prisma } from "../db";
import type { Prisma } from "../generated/prisma/client";
import { orderViewInclude } from "./service";

const ACTIVE = ["RECEIVED", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY"] as const;

/** The live board for one branch: everything paid and not yet finished, oldest first. */
export async function listBoardOrders(branchId: string) {
  const orders = await prisma.order.findMany({
    where: { branchId, status: { in: [...ACTIVE] } },
    orderBy: { createdAt: "asc" },
    include: orderViewInclude,
  });
  return orders.map(toBoardOrder);
}

export type BoardOrder = ReturnType<typeof toBoardOrder>;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderViewInclude }>;

function toBoardOrder(order: OrderRow) {
  return {
    id: order.id,
    branchId: order.branchId,
    reference: order.reference,
    status: order.status,
    type: order.type,
    createdAt: order.createdAt.toISOString(),
    scheduledFor: order.scheduledFor?.toISOString() ?? null,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    allergyNote: order.allergyNote,
    deliveryStreet: order.deliveryStreet,
    deliveryCity: order.deliveryCity,
    deliveryNotes: order.deliveryNotes,
    totalCents: order.totalCents,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.nameSnapshot,
      quantity: item.quantity,
      options: (item.selectedOptions as { name: string }[]).map((option) => option.name),
      note: item.note,
    })),
    delivery: order.delivery
      ? {
          method: order.delivery.method,
          status: order.delivery.status,
          courierProvider: order.delivery.courierProvider,
          driver: order.delivery.driver ? { id: order.delivery.driver.id, name: order.delivery.driver.name } : null,
        }
      : null,
  };
}

/** One order for the detail page, in any status. The caller checks the branch. */
export async function loadStaffOrder(id: string) {
  const order = await prisma.order.findUnique({ where: { id }, include: orderViewInclude });
  if (!order) return null;
  return {
    board: toBoardOrder(order),
    customerEmail: order.customerEmail,
    rejectionReason: order.rejectionReason,
    timezone: order.branch.timezone,
    payments: order.payments.map((payment) => ({ id: payment.id, status: payment.status, amountCents: payment.amountCents, refundedAmountCents: payment.refundedAmountCents })),
    events: order.events.map((event) => ({ id: event.id, status: event.status, createdAt: event.createdAt.toISOString() })),
  };
}

export type StaffOrder = NonNullable<Awaited<ReturnType<typeof loadStaffOrder>>>;

export async function listBranchDrivers(branchId: string) {
  return prisma.user.findMany({ where: { branchId, role: "DRIVER" }, select: { id: true, name: true }, orderBy: { name: "asc" } });
}
