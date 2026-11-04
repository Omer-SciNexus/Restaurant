import { ApiError } from "../api";
import { canAccessBranch } from "../access";
import { getCurrentUser } from "../auth";
import { prisma } from "../db";
import { orderViewInclude } from "./service";

/**
 * Who can see an order. A guest order is reached through its unguessable id, the same link
 * we email them. An order placed while signed in also requires that account, or staff of
 * that branch.
 */
export async function loadOrderForViewer(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: orderViewInclude });
  if (!order) return null;
  if (order.userId === null) return order;
  const user = await getCurrentUser();
  if (user && (user.id === order.userId || canAccessBranch(user, order.branchId))) return order;
  throw new ApiError(403, "FORBIDDEN", "Please sign in to see this order.");
}

/** Only what a guest's browser needs. Staff notes and payment references stay on the server. */
export function publicOrderView(order: NonNullable<Awaited<ReturnType<typeof loadOrderForViewer>>>) {
  const paid = order.payments.find((payment) => payment.purpose === "ORDER");
  return {
    id: order.id,
    reference: order.reference,
    status: order.status,
    type: order.type,
    createdAt: order.createdAt.toISOString(),
    scheduledFor: order.scheduledFor?.toISOString() ?? null,
    customerName: order.customerName,
    deliveryStreet: order.deliveryStreet,
    deliveryCity: order.deliveryCity,
    subtotalCents: order.subtotalCents,
    deliveryFeeCents: order.deliveryFeeCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    rejectionReason: order.rejectionReason,
    refundedCents: paid?.refundedAmountCents ?? 0,
    payment: paid ? { id: paid.id, provider: paid.provider, status: paid.status } : null,
    branch: { name: order.branch.name, address: order.branch.address, city: order.branch.city, phone: order.branch.phone },
    items: order.items.map((item) => ({
      id: item.id,
      name: item.nameSnapshot,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      options: (item.selectedOptions as { name: string }[]).map((option) => option.name),
    })),
  };
}

export type PublicOrder = ReturnType<typeof publicOrderView>;

export function requireOrderFound<T>(order: T | null): T {
  if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "We could not find that order.");
  return order;
}
