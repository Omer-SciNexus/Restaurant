import { describe, expect, it, vi } from "vitest";
import { buildAlerts, lateOrderCounts, todayWindow } from "@/lib/admin/alerts";

vi.mock("@/lib/db", () => ({ prisma: {} }));
const { parseOrderQuery } = await import("@/lib/admin/order-search");

describe("todayWindow", () => {
  it("follows the branch's own day, not UTC", () => {
    // 01:00 UTC on 6 Nov is still 5 Nov in Chicago (UTC-6 in November).
    const { start, end } = todayWindow("America/Chicago", new Date("2026-11-06T01:00:00Z"));
    expect(start.toISOString()).toBe("2026-11-05T06:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-06T06:00:00.000Z");
  });

  it("copes with the short day when the clocks change", () => {
    const { start, end } = todayWindow("America/Chicago", new Date("2027-03-14T12:00:00Z"));
    expect(end.getTime() - start.getTime()).toBe(23 * 60 * 60 * 1000);
  });
});

describe("lateOrderCounts", () => {
  const at = new Date("2026-11-05T18:30:00Z");
  const minutesAgo = (minutes: number) => new Date(at.getTime() - minutes * 60_000);

  it("counts orders left unaccepted past the limit", () => {
    const orders = [
      { status: "RECEIVED", type: "PICKUP", updatedAt: minutesAgo(11), delivery: null },
      { status: "RECEIVED", type: "PICKUP", updatedAt: minutesAgo(9), delivery: null },
    ];
    expect(lateOrderCounts(orders, at)).toEqual({ unaccepted: 1, noDriver: 0 });
  });

  it("counts ready deliveries nobody has, but not ones with a driver or courier", () => {
    const orders = [
      { status: "READY", type: "DELIVERY", updatedAt: minutesAgo(20), delivery: { driverId: null, courierRef: null } },
      { status: "READY", type: "DELIVERY", updatedAt: minutesAgo(20), delivery: { driverId: "d", courierRef: null } },
      { status: "READY", type: "DELIVERY", updatedAt: minutesAgo(20), delivery: { driverId: null, courierRef: "c" } },
      { status: "READY", type: "PICKUP", updatedAt: minutesAgo(20), delivery: null },
    ];
    expect(lateOrderCounts(orders, at)).toEqual({ unaccepted: 0, noDriver: 1 });
  });
});

describe("buildAlerts", () => {
  const quiet = { name: "Downtown", slug: "downtown", onlineOrderingOpen: true, late: { unaccepted: 0, noDriver: 0 } };
  const none = { failedPayments: 0, awaitingDeposit: 0, newEventRequests: 0 };

  it("is empty when nothing is wrong", () => {
    expect(buildAlerts({ branches: [quiet], ...none })).toEqual([]);
  });

  it("calls out a branch that is in-store only", () => {
    const [alert] = buildAlerts({ branches: [{ ...quiet, onlineOrderingOpen: false }], ...none });
    expect(alert).toMatchObject({ level: "urgent", href: "/admin/branches" });
    expect(alert?.text).toContain("in-store only");
  });

  it("links late orders to that branch's board, with the right plural", () => {
    const alerts = buildAlerts({ branches: [{ ...quiet, late: { unaccepted: 2, noDriver: 1 } }], ...none });
    expect(alerts[0]?.text).toContain("2 orders");
    expect(alerts[1]?.text).toContain("1 delivery");
    expect(alerts[0]?.href).toBe("/staff/orders?branch=downtown");
  });

  it("includes failed payments, deposits and event requests as notices", () => {
    const alerts = buildAlerts({ branches: [], failedPayments: 1, awaitingDeposit: 2, newEventRequests: 3 });
    expect(alerts.map((alert) => alert.key)).toEqual(["failed-payments", "deposits", "events"]);
    expect(alerts.every((alert) => alert.level === "notice")).toBe(true);
  });
});

describe("parseOrderQuery", () => {
  it("reads a phone number as digits, however it was typed", () => {
    expect(parseOrderQuery("+1 (512) 555-0199").digits).toBe("15125550199");
    expect(parseOrderQuery("555 0199").digits).toBe("5550199");
  });

  it("does not read a reference or email as a phone number", () => {
    expect(parseOrderQuery("NF-4F7K2Q").digits).toBeNull();
    expect(parseOrderQuery("guest123456@example.com").digits).toBeNull();
    expect(parseOrderQuery("12").digits).toBeNull();
  });

  it("trims and limits the text", () => {
    expect(parseOrderQuery("  NF-4F7K2Q ").text).toBe("NF-4F7K2Q");
    expect(parseOrderQuery("x".repeat(500)).text).toHaveLength(100);
  });
});
