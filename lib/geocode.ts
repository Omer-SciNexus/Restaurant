import { ApiError } from "./api";
import { isProduction, services } from "./env";
import type { LatLng } from "./delivery/zones";

/**
 * Turns a typed address into coordinates for the delivery-zone check. Without a Google Maps
 * key (local development only) it returns null and the caller uses a stand-in location.
 */
export async function geocode(street: string, city: string): Promise<LatLng | null> {
  if (!services.maps) {
    if (isProduction) throw new ApiError(503, "MAPS_UNAVAILABLE", "We cannot check addresses right now.");
    return null;
  }
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", `${street}, ${city}`);
  url.searchParams.set("key", process.env.GOOGLE_MAPS_API_KEY!);
  const response = await fetch(url);
  if (!response.ok) throw new ApiError(502, "MAPS_ERROR", "We could not check that address. Please try again.");
  const body = (await response.json()) as { results?: { geometry: { location: LatLng } }[] };
  const location = body.results?.[0]?.geometry.location;
  if (!location) throw new ApiError(422, "ADDRESS_NOT_FOUND", "We could not find that address. Please check it.");
  return location;
}
