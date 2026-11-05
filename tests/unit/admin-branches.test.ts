import { describe, expect, it } from "vitest";
import { parseBranchAdmin, parseBranchOperations, parsePolygon } from "@/lib/admin/branches";

function branchForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  const values = {
    "mon-open-0": "07:00",
    "mon-close-0": "21:00",
    deliveryRadiusKm: "2",
    deliveryPolygon: "",
    tableCapacityPerSlot: "20",
    deliveryFeeCents: "3.99",
    minOrderCents: "12",
    taxRateBps: "8.25",
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return form;
}

describe("parsePolygon", () => {
  it("treats empty as no polygon", () => {
    expect(parsePolygon("  ")).toEqual({ polygon: null });
  });

  it("accepts three or more lat, lng pairs", () => {
    expect(parsePolygon("[[30.1,-97.1],[30.2,-97.2],[30.3,-97.1]]")).toEqual({ polygon: [[30.1, -97.1], [30.2, -97.2], [30.3, -97.1]] });
  });

  it.each([
    ["not json", "nope"],
    ["too few points", "[[30,-97],[31,-97]]"],
    ["not an array", '{"a":1}'],
    ["a point that is not a pair", "[[30],[31,-97],[32,-97]]"],
    ["strings for numbers", '[["30","-97"],[31,-97],[32,-97]]'],
    ["lat and lng swapped", "[[-97,300],[31,-97],[32,-97]]"],
  ])("refuses %s", (_label, text) => {
    expect(parsePolygon(text)).toHaveProperty("error");
  });
});

describe("parseBranchAdmin", () => {
  it("converts money to cents and tax to basis points on the server", () => {
    const data = parseBranchAdmin(branchForm());
    expect(data.deliveryFeeCents).toBe(399);
    expect(data.minOrderCents).toBe(1200);
    expect(data.taxRateBps).toBe(825);
    expect(data.openingHours.mon).toEqual([{ open: "07:00", close: "21:00" }]);
    expect(data.openingHours.sun).toEqual([]);
    expect(data.deliveryPolygon).toBeNull();
  });

  it("refuses bad values", () => {
    expect(() => parseBranchAdmin(branchForm({ taxRateBps: "26" }))).toThrow();
    expect(() => parseBranchAdmin(branchForm({ deliveryFeeCents: "-1" }))).toThrow();
    expect(() => parseBranchAdmin(branchForm({ deliveryRadiusKm: "0" }))).toThrow();
    expect(() => parseBranchAdmin(branchForm({ deliveryRadiusKm: "abc" }))).toThrow();
    expect(() => parseBranchAdmin(branchForm({ tableCapacityPerSlot: "0" }))).toThrow();
    expect(() => parseBranchAdmin(branchForm({ tableCapacityPerSlot: "2.5" }))).toThrow();
    expect(() => parseBranchAdmin(branchForm({ "mon-close-0": "06:00" }))).toThrow();
  });
});

describe("parseBranchOperations", () => {
  it("never returns fees, tax or the rollback switch, whatever the form sends", () => {
    const data = parseBranchOperations(branchForm({ onlineOrderingOpen: "false", slug: "elsewhere" }));
    expect(Object.keys(data).sort()).toEqual(["deliveryPolygon", "deliveryRadiusKm", "openingHours", "tableCapacityPerSlot"]);
  });
});
