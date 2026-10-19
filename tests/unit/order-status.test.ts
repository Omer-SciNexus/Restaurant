import { describe, expect, it } from "vitest";
import { canTransition, staffActions, trackingSteps } from "@/lib/orders/status";

describe("canTransition", () => {
  it("walks a pickup order through its happy path", () => {
    expect(canTransition("PENDING_PAYMENT", "RECEIVED", "system", "PICKUP")).toBe(true);
    expect(canTransition("RECEIVED", "ACCEPTED", "staff", "PICKUP")).toBe(true);
    expect(canTransition("ACCEPTED", "PREPARING", "staff", "PICKUP")).toBe(true);
    expect(canTransition("PREPARING", "READY", "staff", "PICKUP")).toBe(true);
    expect(canTransition("READY", "COMPLETED", "staff", "PICKUP")).toBe(true);
  });

  it("walks a delivery order through its happy path", () => {
    expect(canTransition("READY", "OUT_FOR_DELIVERY", "driver", "DELIVERY")).toBe(true);
    expect(canTransition("READY", "OUT_FOR_DELIVERY", "courier", "DELIVERY")).toBe(true);
    expect(canTransition("OUT_FOR_DELIVERY", "COMPLETED", "driver", "DELIVERY")).toBe(true);
  });

  it("stops a delivery order being marked collected, and a pickup order going out", () => {
    expect(canTransition("READY", "COMPLETED", "staff", "DELIVERY")).toBe(false);
    expect(canTransition("READY", "OUT_FOR_DELIVERY", "driver", "PICKUP")).toBe(false);
  });

  it("does not allow skipping steps or moving backwards", () => {
    expect(canTransition("RECEIVED", "READY", "staff", "PICKUP")).toBe(false);
    expect(canTransition("READY", "PREPARING", "staff", "PICKUP")).toBe(false);
  });

  it("only the payment result can move an unpaid order to the kitchen", () => {
    expect(canTransition("PENDING_PAYMENT", "RECEIVED", "staff", "PICKUP")).toBe(false);
    expect(canTransition("PENDING_PAYMENT", "RECEIVED", "guest", "PICKUP")).toBe(false);
  });

  it("lets a guest cancel only before the kitchen accepts", () => {
    expect(canTransition("RECEIVED", "CANCELLED", "guest", "PICKUP")).toBe(true);
    expect(canTransition("ACCEPTED", "CANCELLED", "guest", "PICKUP")).toBe(false);
  });

  it("treats finished orders as final", () => {
    for (const from of ["COMPLETED", "REJECTED", "CANCELLED"] as const) {
      expect(canTransition(from, "RECEIVED", "staff", "PICKUP")).toBe(false);
      expect(canTransition(from, "RECEIVED", "system", "PICKUP")).toBe(false);
    }
  });
});

describe("staffActions", () => {
  it("offers accept or reject on a new order", () => {
    expect(staffActions("RECEIVED", "PICKUP")).toEqual(["ACCEPTED", "REJECTED"]);
  });

  it("offers collected only for pickup", () => {
    expect(staffActions("READY", "PICKUP")).toEqual(["COMPLETED"]);
    expect(staffActions("READY", "DELIVERY")).toEqual([]);
  });
});

describe("trackingSteps", () => {
  it("shows four guest steps and the current one", () => {
    const steps = trackingSteps("PREPARING", "DELIVERY");
    expect(steps.map((s) => s.label)).toEqual(["Received", "Preparing", "On the way", "Delivered"]);
    expect(steps.find((s) => s.current)?.label).toBe("Preparing");
    expect(steps[0]?.done).toBe(true);
    expect(steps[2]?.done).toBe(false);
  });

  it("hides the kitchen's internal accepted state from the guest", () => {
    expect(trackingSteps("ACCEPTED", "PICKUP").find((s) => s.current)?.label).toBe("Received");
  });

  it("shows no progress for a rejected order", () => {
    expect(trackingSteps("REJECTED", "PICKUP").some((s) => s.current || s.done)).toBe(false);
  });
});
