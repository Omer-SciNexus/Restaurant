// Role and branch rules, kept as plain functions so every rule has a unit test.

export type Role = "CUSTOMER" | "STAFF" | "DRIVER" | "MANAGER" | "ADMIN";
export type Actor = { id: string; role: Role; branchId: string | null };

export const STAFF_ROLES: readonly Role[] = ["STAFF", "MANAGER", "ADMIN"];
export const DRIVER_ROLES: readonly Role[] = ["DRIVER", "MANAGER", "ADMIN"];
export const MANAGER_ROLES: readonly Role[] = ["MANAGER", "ADMIN"];
export const ADMIN_ROLES: readonly Role[] = ["ADMIN"];

export function hasRole(actor: Actor, roles: readonly Role[]): boolean {
  return roles.includes(actor.role);
}

/** Admins reach every branch; everyone else only the branch they are assigned to. */
export function canAccessBranch(actor: Actor, branchId: string): boolean {
  if (actor.role === "ADMIN") return true;
  if (actor.role === "CUSTOMER") return false;
  return actor.branchId !== null && actor.branchId === branchId;
}

/** Second-person rule: nobody can approve their own nutrition or allergen change. */
export function canApproveNutritionChange(actor: Actor, changedById: string): boolean {
  return actor.role === "ADMIN" && actor.id !== changedById;
}

/** Where each role lands after signing in. */
export function homeForRole(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "MANAGER":
    case "STAFF":
      return "/staff/orders";
    case "DRIVER":
      return "/driver";
    default:
      return "/account";
  }
}
