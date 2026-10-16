import { describe, expect, it } from "vitest";
import { distanceKm, isInDeliveryZone, isInsidePolygon, nearestBranch } from "@/lib/delivery/zones";

// One degree of latitude is about 111.19 km.
const KM_PER_DEGREE_LAT = 111.19;
const branch = { id: "a", lat: 30.27, lng: -97.74, deliveryRadiusKm: 2 };
const north = (km: number) => ({ lat: branch.lat + km / KM_PER_DEGREE_LAT, lng: branch.lng });

describe("distanceKm", () => {
  it("is zero at the same point and symmetric", () => {
    expect(distanceKm(branch, branch)).toBe(0);
    expect(distanceKm(branch, north(5))).toBeCloseTo(distanceKm(north(5), branch), 9);
  });

  it("measures a known distance", () => {
    expect(distanceKm(branch, north(5))).toBeCloseTo(5, 1);
  });
});

describe("isInDeliveryZone", () => {
  it("delivers within the 2 km radius and not beyond it", () => {
    expect(isInDeliveryZone(branch, north(1.99))).toBe(true);
    expect(isInDeliveryZone(branch, north(2.01))).toBe(false);
  });

  it("uses the polygon instead of the radius when one is set", () => {
    const polygon = [
      [30.27, -97.74],
      [30.37, -97.74],
      [30.37, -97.64],
      [30.27, -97.64],
    ] as [number, number][];
    const zoned = { ...branch, deliveryPolygon: polygon };
    const farButInside = { lat: 30.32, lng: -97.69 };
    expect(isInDeliveryZone(branch, farButInside)).toBe(false);
    expect(isInDeliveryZone(zoned, farButInside)).toBe(true);
    expect(isInsidePolygon({ lat: 30.2, lng: -97.69 }, polygon)).toBe(false);
  });
});

describe("nearestBranch", () => {
  const far = { id: "b", lat: 30.4, lng: -97.74, deliveryRadiusKm: 2 };

  it("returns the closest deliverable branch", () => {
    const result = nearestBranch([far, branch], north(1));
    expect(result?.branch.id).toBe("a");
    expect(result?.deliverable).toBe(true);
  });

  it("returns the closest branch, marked undeliverable, when none delivers", () => {
    const result = nearestBranch([far, branch], north(4));
    expect(result?.branch.id).toBe("a");
    expect(result?.deliverable).toBe(false);
  });

  it("prefers a farther branch that delivers over a nearer one that does not", () => {
    const tinyNear = { id: "tiny", lat: branch.lat, lng: branch.lng, deliveryRadiusKm: 0.1 };
    const wideFar = { id: "wide", lat: branch.lat + 3 / KM_PER_DEGREE_LAT, lng: branch.lng, deliveryRadiusKm: 5 };
    expect(nearestBranch([tinyNear, wideFar], north(1))?.branch.id).toBe("wide");
  });

  it("returns null with no branches", () => {
    expect(nearestBranch([], north(1))).toBeNull();
  });
});
