// Delivery zones: a 2 km circle around each branch by default, or a drawn polygon.

export type LatLng = { lat: number; lng: number };

export type ZonedBranch = LatLng & {
  deliveryRadiusKm: number;
  deliveryPolygon?: readonly (readonly [number, number])[] | null;
};

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Ray casting. Accurate enough for a polygon a few km across. */
export function isInsidePolygon(point: LatLng, polygon: readonly (readonly [number, number])[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i]!;
    const [latJ, lngJ] = polygon[j]!;
    const crosses = lngI > point.lng !== lngJ > point.lng && point.lat < ((latJ - latI) * (point.lng - lngI)) / (lngJ - lngI) + latI;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function isInDeliveryZone(branch: ZonedBranch, point: LatLng): boolean {
  if (branch.deliveryPolygon && branch.deliveryPolygon.length >= 3) {
    return isInsidePolygon(point, branch.deliveryPolygon);
  }
  return distanceKm(branch, point) <= branch.deliveryRadiusKm;
}

export type NearestResult<B> = { branch: B; distanceKm: number; deliverable: boolean };

/** The closest branch that delivers to this point, or simply the closest if none does. */
export function nearestBranch<B extends ZonedBranch>(branches: readonly B[], point: LatLng): NearestResult<B> | null {
  const ranked = branches
    .map((branch) => ({ branch, distanceKm: distanceKm(branch, point), deliverable: isInDeliveryZone(branch, point) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
  return ranked.find((r) => r.deliverable) ?? ranked[0] ?? null;
}
