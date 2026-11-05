import type { Role } from "../access";
import { ApiError } from "../api";
import { prisma } from "../db";
import { type Assignment, leavesDeliveriesBehind, type Person } from "./roles";

export async function loadPerson(userId: string) {
  const person = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true, branchId: true } });
  if (!person) throw new ApiError(404, "USER_NOT_FOUND", "We could not find that person.");
  return person;
}

/** Saves a role change the rules have allowed, unless it would strand a delivery under way. */
export async function applyAssignment(target: Person, assignment: Assignment): Promise<{ role: Role; branchId: string | null }> {
  if (!assignment.ok) throw new ApiError(403, "ROLE_NOT_ALLOWED", assignment.error);
  const { role, branchId } = assignment;
  if (branchId) {
    const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { id: true } });
    if (!branch) throw new ApiError(404, "BRANCH_NOT_FOUND", "We could not find that branch.");
  }
  const activeDeliveries = await prisma.delivery.count({ where: { driverId: target.id, status: { in: ["ASSIGNED", "PICKED_UP"] } } });
  if (leavesDeliveriesBehind(target, { role, branchId }, activeDeliveries)) {
    throw new ApiError(409, "DELIVERIES_ACTIVE", "This driver has deliveries under way. Reassign or finish them first.");
  }
  await prisma.user.update({ where: { id: target.id }, data: { role, branchId } });
  return { role, branchId };
}
