// Who can give whom which role. Kept apart from the database, so every rule has a unit test.

import { type Actor, canAccessBranch, type Role } from "../access";

export const ROLES = ["CUSTOMER", "STAFF", "DRIVER", "MANAGER", "ADMIN"] as const satisfies readonly Role[];
export const BRANCH_ROLES: readonly Role[] = ["STAFF", "DRIVER", "MANAGER"];
/** The only roles a manager can hand out, on their own branch. */
export const MANAGER_ASSIGNABLE_ROLES: readonly Role[] = ["STAFF", "DRIVER"];

export const ROLE_LABEL: Record<Role, string> = {
  CUSTOMER: "Customer",
  STAFF: "Staff",
  DRIVER: "Driver",
  MANAGER: "Manager",
  ADMIN: "Admin",
};

export function roleNeedsBranch(role: Role): boolean {
  return BRANCH_ROLES.includes(role);
}

export type Assignment = { ok: true; role: Role; branchId: string | null } | { ok: false; error: string };
export type Person = { id: string; role: Role; branchId: string | null };

const refuse = (error: string): Assignment => ({ ok: false, error });

/** An admin assigning a role. Admin and customer never keep a branch. */
export function checkAdminAssignment(actor: Actor, target: Person, role: Role, branchId: string | null): Assignment {
  if (actor.role !== "ADMIN") return refuse("Only an admin can do this.");
  // The person pressing the button is always an admin, so the system can never lose its last one.
  if (actor.id === target.id && role !== "ADMIN") return refuse("You cannot remove your own admin role. Ask another admin to do it.");
  if (!roleNeedsBranch(role)) return { ok: true, role, branchId: null };
  if (!branchId) return refuse(`The ${ROLE_LABEL[role].toLowerCase()} role needs a branch.`);
  return { ok: true, role, branchId };
}

function managerScope(actor: Actor, branchId: string): string | null {
  if (actor.role !== "MANAGER" && actor.role !== "ADMIN") return "Only a manager can do this.";
  if (!canAccessBranch(actor, branchId)) return "This belongs to another branch.";
  return null;
}

/**
 * A manager giving someone a role on their own branch. They can take on a customer, or
 * move their own people between staff and driver, and nothing else.
 */
export function checkManagerAssignment(actor: Actor, branchId: string, target: Person, role: Role): Assignment {
  const scope = managerScope(actor, branchId);
  if (scope) return refuse(scope);
  if (!MANAGER_ASSIGNABLE_ROLES.includes(role)) return refuse("Managers can only assign the staff and driver roles.");
  if (actor.id === target.id) return refuse("You cannot change your own role.");
  if (target.role === "CUSTOMER") return { ok: true, role, branchId };
  if (MANAGER_ASSIGNABLE_ROLES.includes(target.role) && target.branchId === branchId) return { ok: true, role, branchId };
  return refuse("This person is already part of the team elsewhere. Please ask an admin to move them.");
}

/** A manager taking someone off their own branch. They go back to being a customer. */
export function checkManagerRemoval(actor: Actor, branchId: string, target: Person): Assignment {
  const scope = managerScope(actor, branchId);
  if (scope) return refuse(scope);
  if (actor.id === target.id) return refuse("You cannot change your own role.");
  if (!MANAGER_ASSIGNABLE_ROLES.includes(target.role) || target.branchId !== branchId) return refuse("You can only remove staff and drivers from your own branch.");
  return { ok: true, role: "CUSTOMER", branchId: null };
}

/** A driver with a delivery under way has to finish it, or the order is left with nobody on it. */
export function leavesDeliveriesBehind(target: Person, next: { role: Role; branchId: string | null }, activeDeliveries: number): boolean {
  if (target.role !== "DRIVER" || activeDeliveries === 0) return false;
  return next.role !== "DRIVER" || next.branchId !== target.branchId;
}
