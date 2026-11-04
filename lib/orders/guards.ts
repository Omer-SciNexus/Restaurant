import { STAFF_ROLES } from "../access";
import { ApiError } from "../api";
import { requireApiRole, requireBranchAccess } from "../auth";
import { prisma } from "../db";

/** Staff can act on an order only if it belongs to their branch. */
export async function requireStaffForOrder(orderId: string) {
  const user = await requireApiRole(STAFF_ROLES);
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, branchId: true } });
  if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "We could not find that order.");
  requireBranchAccess(user, order.branchId);
  return { user, order };
}
