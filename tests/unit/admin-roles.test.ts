import { describe, expect, it } from "vitest";
import type { Actor } from "@/lib/access";
import { checkAdminAssignment, checkManagerAssignment, checkManagerRemoval, leavesDeliveriesBehind, type Person, roleNeedsBranch } from "@/lib/admin/roles";

const admin: Actor = { id: "admin", role: "ADMIN", branchId: null };
const managerA: Actor = { id: "managerA", role: "MANAGER", branchId: "a" };
const staffA: Actor = { id: "staffA", role: "STAFF", branchId: "a" };

const customer: Person = { id: "c", role: "CUSTOMER", branchId: null };
const staffOfA: Person = { id: "s", role: "STAFF", branchId: "a" };
const driverOfA: Person = { id: "d", role: "DRIVER", branchId: "a" };
const staffOfB: Person = { id: "t", role: "STAFF", branchId: "b" };
const otherManager: Person = { id: "m", role: "MANAGER", branchId: "a" };
const otherAdmin: Person = { id: "x", role: "ADMIN", branchId: null };

describe("roleNeedsBranch", () => {
  it("is true for staff, driver and manager only", () => {
    expect(["STAFF", "DRIVER", "MANAGER"].every((role) => roleNeedsBranch(role as Actor["role"]))).toBe(true);
    expect(roleNeedsBranch("ADMIN")).toBe(false);
    expect(roleNeedsBranch("CUSTOMER")).toBe(false);
  });
});

describe("checkAdminAssignment", () => {
  it("requires a branch for staff, driver and manager", () => {
    for (const role of ["STAFF", "DRIVER", "MANAGER"] as const) {
      expect(checkAdminAssignment(admin, customer, role, null).ok).toBe(false);
      expect(checkAdminAssignment(admin, customer, role, "a")).toEqual({ ok: true, role, branchId: "a" });
    }
  });

  it("gives admin and customer no branch, even if one was sent", () => {
    expect(checkAdminAssignment(admin, staffOfA, "ADMIN", "a")).toEqual({ ok: true, role: "ADMIN", branchId: null });
    expect(checkAdminAssignment(admin, staffOfA, "CUSTOMER", "a")).toEqual({ ok: true, role: "CUSTOMER", branchId: null });
  });

  it("stops an admin removing their own admin role", () => {
    const self: Person = { id: admin.id, role: "ADMIN", branchId: null };
    for (const role of ["CUSTOMER", "STAFF", "DRIVER", "MANAGER"] as const) {
      const result = checkAdminAssignment(admin, self, role, "a");
      expect(result.ok).toBe(false);
    }
    expect(checkAdminAssignment(admin, self, "ADMIN", null).ok).toBe(true);
  });

  it("lets an admin change another admin", () => {
    expect(checkAdminAssignment(admin, otherAdmin, "CUSTOMER", null).ok).toBe(true);
  });

  it("refuses anyone who is not an admin", () => {
    expect(checkAdminAssignment(managerA, customer, "STAFF", "a").ok).toBe(false);
    expect(checkAdminAssignment(staffA, customer, "ADMIN", null).ok).toBe(false);
  });
});

describe("checkManagerAssignment", () => {
  it("lets a manager take on a customer as staff or driver on their own branch", () => {
    expect(checkManagerAssignment(managerA, "a", customer, "STAFF")).toEqual({ ok: true, role: "STAFF", branchId: "a" });
    expect(checkManagerAssignment(managerA, "a", customer, "DRIVER")).toEqual({ ok: true, role: "DRIVER", branchId: "a" });
  });

  it("lets a manager move their own people between staff and driver", () => {
    expect(checkManagerAssignment(managerA, "a", staffOfA, "DRIVER").ok).toBe(true);
    expect(checkManagerAssignment(managerA, "a", driverOfA, "STAFF").ok).toBe(true);
  });

  it("never lets a manager give the manager or admin role", () => {
    for (const role of ["MANAGER", "ADMIN", "CUSTOMER"] as const) {
      expect(checkManagerAssignment(managerA, "a", staffOfA, role).ok).toBe(false);
      expect(checkManagerAssignment(managerA, "a", customer, role).ok).toBe(false);
    }
  });

  it("keeps a manager to their own branch", () => {
    const result = checkManagerAssignment(managerA, "b", customer, "STAFF");
    expect(result).toEqual({ ok: false, error: "This belongs to another branch." });
  });

  it("does not let a manager take someone from another branch", () => {
    expect(checkManagerAssignment(managerA, "a", staffOfB, "STAFF").ok).toBe(false);
  });

  it("does not let a manager change another manager or an admin", () => {
    expect(checkManagerAssignment(managerA, "a", otherManager, "STAFF").ok).toBe(false);
    expect(checkManagerAssignment(managerA, "a", otherAdmin, "STAFF").ok).toBe(false);
  });

  it("does not let a manager demote themselves", () => {
    expect(checkManagerAssignment(managerA, "a", { id: managerA.id, role: "MANAGER", branchId: "a" }, "STAFF").ok).toBe(false);
  });

  it("refuses staff, who cannot manage at all", () => {
    expect(checkManagerAssignment(staffA, "a", customer, "STAFF").ok).toBe(false);
  });

  it("lets an admin use the same screen on any branch, with the same limits", () => {
    expect(checkManagerAssignment(admin, "b", customer, "DRIVER").ok).toBe(true);
    expect(checkManagerAssignment(admin, "b", customer, "MANAGER").ok).toBe(false);
  });
});

describe("checkManagerRemoval", () => {
  it("takes staff and drivers back to customer, with no branch", () => {
    expect(checkManagerRemoval(managerA, "a", staffOfA)).toEqual({ ok: true, role: "CUSTOMER", branchId: null });
    expect(checkManagerRemoval(managerA, "a", driverOfA)).toEqual({ ok: true, role: "CUSTOMER", branchId: null });
  });

  it("refuses another branch's people, other managers, admins and customers", () => {
    expect(checkManagerRemoval(managerA, "a", staffOfB).ok).toBe(false);
    expect(checkManagerRemoval(managerA, "b", staffOfB).ok).toBe(false);
    expect(checkManagerRemoval(managerA, "a", otherManager).ok).toBe(false);
    expect(checkManagerRemoval(managerA, "a", otherAdmin).ok).toBe(false);
    expect(checkManagerRemoval(managerA, "a", customer).ok).toBe(false);
  });
});

describe("leavesDeliveriesBehind", () => {
  it("blocks a driver with active deliveries from leaving the role or the branch", () => {
    expect(leavesDeliveriesBehind(driverOfA, { role: "CUSTOMER", branchId: null }, 1)).toBe(true);
    expect(leavesDeliveriesBehind(driverOfA, { role: "STAFF", branchId: "a" }, 1)).toBe(true);
    expect(leavesDeliveriesBehind(driverOfA, { role: "DRIVER", branchId: "b" }, 2)).toBe(true);
  });

  it("allows it with none active, or when nothing really changes", () => {
    expect(leavesDeliveriesBehind(driverOfA, { role: "CUSTOMER", branchId: null }, 0)).toBe(false);
    expect(leavesDeliveriesBehind(driverOfA, { role: "DRIVER", branchId: "a" }, 3)).toBe(false);
    expect(leavesDeliveriesBehind(staffOfA, { role: "CUSTOMER", branchId: null }, 3)).toBe(false);
  });
});
