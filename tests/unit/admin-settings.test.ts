import { describe, expect, it } from "vitest";
import { settingsSchema } from "@/lib/admin/settings";

const valid = { freeDeliveryAboveCents: "35", depositPerGuestCents: "10.00", depositMinParty: "7", freeCancelHours: "24", cateringMinCents: "", cateringLeadDays: "3" };

describe("settingsSchema", () => {
  it("converts dollars to cents, and empty to not set", () => {
    expect(settingsSchema.parse(valid)).toEqual({ freeDeliveryAboveCents: 3500, depositPerGuestCents: 1000, depositMinParty: 7, freeCancelHours: 24, cateringMinCents: null, cateringLeadDays: 3 });
  });

  it("refuses bad values", () => {
    expect(settingsSchema.safeParse({ ...valid, depositPerGuestCents: "" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...valid, freeDeliveryAboveCents: "lots" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...valid, depositMinParty: "0" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...valid, freeCancelHours: "1.5" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...valid, cateringLeadDays: "-1" }).success).toBe(false);
  });
});
