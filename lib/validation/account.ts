import { z } from "zod";
import { ALLERGENS, DIETS } from "../domain";

// None of these schemas has a user id or a role. Unknown keys are stripped, so a request can
// only ever change the signed-in user's own name, phone, diets, addresses and cookbook.

const phone = z
  .string()
  .trim()
  .regex(/^[+\d][\d\s().-]{6,20}$/, "Enter a valid phone number");

export const profileSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name").max(100).optional(),
    phone: z.union([phone, z.literal("").transform(() => null), z.null()]).optional(),
  })
  .refine((value) => value.name !== undefined || value.phone !== undefined, "Nothing to change.");

export const dietProfileSchema = z.object({
  diets: z.array(z.enum(DIETS)).max(DIETS.length),
  allergies: z.array(z.enum(ALLERGENS)).max(ALLERGENS.length),
});

const addressFields = {
  label: z.string().trim().min(1, "Give this address a name, for example Home").max(40),
  street: z.string().trim().min(3, "Enter your street address").max(200),
  city: z.string().trim().min(2, "Enter your city").max(100),
  notes: z
    .string()
    .trim()
    .max(300)
    .nullish()
    .transform((value) => value || null),
};

/** Coordinates are never accepted from the browser; they come from lib/geocode.ts. */
export const addressSchema = z.object(addressFields);
export const addressPatchSchema = z
  .object({
    label: addressFields.label.optional(),
    street: addressFields.street.optional(),
    city: addressFields.city.optional(),
    notes: z.string().trim().max(300).nullable().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), "Nothing to change.");

export const cookbookSaveSchema = z.object({
  recipeId: z.string().min(1).max(60),
  note: z.string().trim().max(2000).nullable().optional(),
});

export const cookbookRemoveSchema = z.object({ recipeId: z.string().min(1).max(60) });
