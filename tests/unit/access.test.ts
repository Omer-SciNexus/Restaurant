import { describe, expect, it } from "vitest";
import { canAccessBranch, canApproveNutritionChange, hasRole, homeForRole, STAFF_ROLES, type Actor } from "@/lib/access";

const staffA: Actor = { id: "s1", role: "STAFF", branchId: "a" };
const managerA: Actor = { id: "m1", role: "MANAGER", branchId: "a" };
const driverA: Actor = { id: "d1", role: "DRIVER", branchId: "a" };
const admin: Actor = { id: "x1", role: "ADMIN", branchId: null };
const customer: Actor = { id: "c1", role: "CUSTOMER", branchId: null };
const unassigned: Actor = { id: "s2", role: "STAFF", branchId: null };

describe("canAccessBranch", () => {
  it("keeps staff, managers and drivers to their own branch", () => {
    for (const actor of [staffA, managerA, driverA]) {
      expect(canAccessBranch(actor, "a")).toBe(true);
      expect(canAccessBranch(actor, "b")).toBe(false);
    }
  });

  it("lets admins reach every branch and customers none", () => {
    expect(canAccessBranch(admin, "b")).toBe(true);
    expect(canAccessBranch(customer, "a")).toBe(false);
  });

  it("denies staff with no branch assigned", () => {
    expect(canAccessBranch(unassigned, "a")).toBe(false);
  });
});

describe("hasRole", () => {
  it("does not treat drivers or customers as staff", () => {
    expect(hasRole(staffA, STAFF_ROLES)).toBe(true);
    expect(hasRole(managerA, STAFF_ROLES)).toBe(true);
    expect(hasRole(driverA, STAFF_ROLES)).toBe(false);
    expect(hasRole(customer, STAFF_ROLES)).toBe(false);
  });
});

describe("canApproveNutritionChange", () => {
  it("requires a second admin", () => {
    expect(canApproveNutritionChange(admin, "someone-else")).toBe(true);
    expect(canApproveNutritionChange(admin, admin.id)).toBe(false);
  });

  it("does not let non-admins approve", () => {
    expect(canApproveNutritionChange(managerA, "someone-else")).toBe(false);
  });
});

describe("homeForRole", () => {
  it("sends each role to its own area", () => {
    expect(homeForRole("ADMIN")).toBe("/admin");
    expect(homeForRole("STAFF")).toBe("/staff/orders");
    expect(homeForRole("MANAGER")).toBe("/staff/orders");
    expect(homeForRole("DRIVER")).toBe("/driver");
    expect(homeForRole("CUSTOMER")).toBe("/account");
  });
});
