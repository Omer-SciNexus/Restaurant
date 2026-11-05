// What admins and managers may change on a branch. Managers get the operations half only:
// the schema drops everything else, so a tampered form cannot touch fees or the switch.

import { z } from "zod";
import { dollarsField, percentToBps } from "./money";
import { hoursFromForm, openingHoursSchema } from "./hours";

export const MAX_RADIUS_KM = 50;
export const MAX_TAX_BPS = 2500;

type Polygon = [number, number][];

/** A drawn delivery zone, as JSON [[lat, lng], ...]. Empty means use the radius. */
export function parsePolygon(text: string): { polygon: Polygon | null } | { error: string } {
  const trimmed = text.trim();
  if (!trimmed) return { polygon: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { error: "This is not valid JSON. Use the form [[30.26, -97.74], [30.27, -97.73], [30.25, -97.72]]." };
  }
  if (!Array.isArray(parsed) || parsed.length < 3) return { error: "A delivery zone needs at least three points." };
  const points: Polygon = [];
  for (const point of parsed) {
    const valid = Array.isArray(point) && point.length === 2 && point.every((n) => typeof n === "number" && Number.isFinite(n));
    if (!valid) return { error: "Each point must be a pair of numbers: [lat, lng]." };
    const [lat, lng] = point as [number, number];
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return { error: "A point is off the map. Latitude comes first, then longitude." };
    points.push([lat, lng]);
  }
  return { polygon: points };
}

const operationsSchema = z.object({
  openingHours: openingHoursSchema,
  deliveryRadiusKm: z.coerce.number("Enter the radius in km.").gt(0, "The radius must be more than 0 km.").max(MAX_RADIUS_KM, `The radius cannot be more than ${MAX_RADIUS_KM} km.`),
  deliveryPolygon: z
    .string()
    .optional()
    .transform((value, ctx) => {
      const result = parsePolygon(value ?? "");
      if ("error" in result) {
        ctx.addIssue({ code: "custom", message: result.error });
        return z.NEVER;
      }
      return result.polygon;
    }),
  tableCapacityPerSlot: z.coerce.number("Enter a whole number of seats.").int("Enter a whole number of seats.").min(1, "A branch needs at least 1 seat per slot.").max(1000, "That is more than 1000 seats per slot."),
});

const adminSchema = operationsSchema.extend({
  deliveryFeeCents: dollarsField("the delivery fee"),
  minOrderCents: dollarsField("the minimum order"),
  taxRateBps: z.string("Enter the tax rate as a percentage, like 8.25.").transform((value, ctx) => {
    const bps = percentToBps(value);
    if (bps === null || bps > MAX_TAX_BPS) {
      ctx.addIssue({ code: "custom", message: `Enter the tax rate as a percentage from 0 to ${MAX_TAX_BPS / 100}, like 8.25.` });
      return z.NEVER;
    }
    return bps;
  }),
});

function raw(form: FormData) {
  return { ...Object.fromEntries(form), openingHours: hoursFromForm(form) };
}

/** Hours, delivery zone and table capacity: what a manager can change on their own branch. */
export function parseBranchOperations(form: FormData) {
  return operationsSchema.parse(raw(form));
}

/** Everything an admin can change on a branch, as integer cents and basis points. */
export function parseBranchAdmin(form: FormData) {
  return adminSchema.parse(raw(form));
}
