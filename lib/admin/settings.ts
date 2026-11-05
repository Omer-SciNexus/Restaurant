// The values the plan leaves as the owner's decisions.

import { z } from "zod";
import { dollarsField, optionalDollarsField } from "./money";

const wholeNumber = (label: string, min: number, max: number) =>
  z.coerce.number(`Enter ${label} as a whole number.`).int(`Enter ${label} as a whole number.`).min(min, `Use ${min} or more for ${label}.`).max(max, `Use ${max} or less for ${label}.`);

export const settingsSchema = z.object({
  freeDeliveryAboveCents: optionalDollarsField("the free delivery threshold"),
  depositPerGuestCents: dollarsField("the deposit per guest"),
  depositMinParty: wholeNumber("the party size", 1, 200),
  freeCancelHours: wholeNumber("the hours", 0, 720),
  cateringMinCents: optionalDollarsField("the catering minimum"),
  cateringLeadDays: wholeNumber("the days", 0, 365),
});
