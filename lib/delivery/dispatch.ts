import { ApiError } from "../api";
import { prisma } from "../db";
import { isProduction } from "../env";
import { transitionOrder } from "../orders/service";
import { publishOrderUpdate } from "../realtime";

/** Gives a delivery order to one of this branch's own drivers. */
export async function assignDriver(orderId: string, driverId: string, branchId: string) {
  const driver = await prisma.user.findFirst({ where: { id: driverId, role: "DRIVER", branchId } });
  if (!driver) throw new ApiError(422, "BAD_DRIVER", "That driver does not work at this branch.");

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { delivery: true } });
  if (!order || order.branchId !== branchId) throw new ApiError(404, "ORDER_NOT_FOUND", "We could not find that order.");
  if (order.type !== "DELIVERY" || !order.delivery) throw new ApiError(422, "NOT_DELIVERY", "This is not a delivery order.");
  if (order.delivery.status === "PICKED_UP" || order.delivery.status === "DELIVERED") {
    throw new ApiError(409, "ALREADY_OUT", "This order has already left the kitchen.");
  }

  await prisma.delivery.update({
    where: { orderId },
    data: { method: "OWN", driverId, status: "ASSIGNED", courierProvider: null, courierRef: null },
  });
  await publishOrderUpdate(order, driverId);
}

/**
 * Hands an order to the third-party courier. The Uber Direct or DoorDash Drive adapter goes
 * here once a sandbox account exists (plan week 8). Until then a stand-in marks the hand-off
 * locally, and production refuses it rather than pretending a courier is coming.
 */
export async function sendToCourier(orderId: string, branchId: string) {
  if (isProduction) {
    throw new ApiError(503, "COURIER_UNAVAILABLE", "Third-party courier is not set up yet. Please use your own driver.");
  }
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { delivery: true } });
  if (!order || order.branchId !== branchId) throw new ApiError(404, "ORDER_NOT_FOUND", "We could not find that order.");
  if (order.type !== "DELIVERY" || !order.delivery) throw new ApiError(422, "NOT_DELIVERY", "This is not a delivery order.");
  if (order.delivery.status === "PICKED_UP" || order.delivery.status === "DELIVERED") {
    throw new ApiError(409, "ALREADY_OUT", "This order has already left the kitchen.");
  }

  await prisma.delivery.update({
    where: { orderId },
    data: { method: "THIRD_PARTY", driverId: null, status: "ASSIGNED", courierProvider: "simulated", courierRef: `sim-${orderId.slice(0, 8)}` },
  });
  await publishOrderUpdate(order);
}

/** A driver marks an assigned delivery picked up, then delivered. */
export async function updateDriverDelivery(orderId: string, driverId: string, status: "PICKED_UP" | "DELIVERED") {
  const delivery = await prisma.delivery.findUnique({ where: { orderId }, include: { order: true } });
  if (!delivery || delivery.driverId !== driverId) throw new ApiError(404, "DELIVERY_NOT_FOUND", "This delivery is not assigned to you.");

  if (status === "PICKED_UP") {
    await transitionOrder(orderId, "OUT_FOR_DELIVERY", { actor: "driver", actorId: driverId });
    await prisma.delivery.update({ where: { orderId }, data: { status: "PICKED_UP", pickedUpAt: new Date() } });
  } else {
    await transitionOrder(orderId, "COMPLETED", { actor: "driver", actorId: driverId });
    await prisma.delivery.update({ where: { orderId }, data: { status: "DELIVERED", deliveredAt: new Date() } });
  }
}

export async function listDriverDeliveries(driverId: string) {
  const rows = await prisma.delivery.findMany({
    where: { driverId, status: { in: ["ASSIGNED", "PICKED_UP"] } },
    orderBy: { createdAt: "asc" },
    include: { order: { include: { items: true, branch: { select: { name: true, address: true, city: true } } } } },
  });
  return rows.map((row) => ({
    orderId: row.orderId,
    reference: row.order.reference,
    deliveryStatus: row.status,
    orderStatus: row.order.status,
    customerName: row.order.customerName,
    customerPhone: row.order.customerPhone,
    street: row.order.deliveryStreet,
    city: row.order.deliveryCity,
    notes: row.order.deliveryNotes,
    branch: row.order.branch,
    itemCount: row.order.items.reduce((sum, item) => sum + item.quantity, 0),
  }));
}

export type DriverDelivery = Awaited<ReturnType<typeof listDriverDeliveries>>[number];
