// Rules for editing the shared menu. A slug is set once and never changes, because it is
// the dish's public address, and past links and saved recipes point at it.

import { z } from "zod";
import { checkboxField, dollarsField } from "./money";
import { servingWindowProblem } from "./hours";

export const MAX_GRAMS = 5000;

export function slugify(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return slug || "item";
}

/** The slug for a new row: its name, with a number on the end if that is already taken. */
export function uniqueSlug(name: string, taken: ReadonlySet<string>): string {
  const base = slugify(name);
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

const PHOTO_PATH = /^\/images\/[A-Za-z0-9._/-]+\.(png|jpe?g|webp|avif|svg)$/;

/** A photo is a path under public/images, because that is all next/image is set up to serve. */
export function isPhotoPath(value: string): boolean {
  return PHOTO_PATH.test(value) && !value.includes("..") && !value.includes("//");
}

const photoPathField = z
  .string("Enter a photo path.")
  .trim()
  .refine(isPhotoPath, { message: "Use a path under /images, like /images/dishes/green-juice.png." });

const name = z.string("Enter a name.").trim().min(2, "Enter a name.").max(120, "That name is too long.");

const optionalTime = z
  .string()
  .optional()
  .transform((value) => value?.trim() || null);

export const categorySchema = z
  .object({
    name,
    sortOrder: z.coerce.number("Enter a whole number.").int("Enter a whole number.").min(0, "Use 0 or more.").max(9999, "Use a smaller number."),
    servedFrom: optionalTime,
    servedUntil: optionalTime,
  })
  .superRefine((value, ctx) => {
    const problem = servingWindowProblem(value.servedFrom, value.servedUntil);
    if (problem) ctx.addIssue({ code: "custom", message: problem, path: ["servedFrom"] });
  });

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: string, suffix: string): Date | null {
  if (!ISO_DATE.test(value)) return null;
  const date = new Date(`${value}${suffix}`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

/** A seasonal dish needs both dates. The last day counts, so it ends at the close of that day. */
export function seasonalDates(isSeasonal: boolean, from: string, to: string): { availableFrom: Date | null; availableTo: Date | null } | { error: string } {
  if (!isSeasonal) return { availableFrom: null, availableTo: null };
  const availableFrom = parseDate(from, "T00:00:00.000Z");
  const availableTo = parseDate(to, "T23:59:59.999Z");
  if (!availableFrom || !availableTo) return { error: "A seasonal dish needs a first and a last day." };
  if (availableFrom > availableTo) return { error: "The first day must not be after the last day." };
  return { availableFrom, availableTo };
}

export const dishSchema = z
  .object({
    name,
    description: z.string("Enter a description.").trim().min(10, "Describe the dish in a sentence.").max(600, "Keep the description under 600 characters."),
    categoryId: z.string("Choose a category.").min(1, "Choose a category."),
    basePriceCents: dollarsField("the price").refine((cents) => cents > 0, { message: "The price must be more than $0." }),
    imageUrl: photoPathField,
    isSeasonal: checkboxField,
    availableFrom: z.string().optional().default(""),
    availableTo: z.string().optional().default(""),
  })
  .transform((value, ctx) => {
    const dates = seasonalDates(value.isSeasonal, value.availableFrom, value.availableTo);
    if ("error" in dates) {
      ctx.addIssue({ code: "custom", message: dates.error, path: ["availableFrom"] });
      return z.NEVER;
    }
    return { ...value, ...dates };
  });

/** The ingredient lines of a dish. Each ingredient appears once, and each weighs something. */
export const recipeSchema = z
  .array(
    z.object({
      ingredientId: z.string().min(1),
      grams: z.number("Every ingredient needs a weight in grams.").gt(0, "Every ingredient needs a weight above 0 g.").max(MAX_GRAMS, `No ingredient can weigh more than ${MAX_GRAMS} g.`),
    }),
  )
  .refine((lines) => new Set(lines.map((line) => line.ingredientId)).size === lines.length, { message: "Each ingredient can only be listed once." });

export type RecipeLine = z.infer<typeof recipeSchema>[number];

/** A dish on the menu must show its nutrition, so it cannot be live without ingredients. */
export function activationProblem(dish: { isBuilder: boolean; ingredientCount: number }): string | null {
  if (dish.isBuilder || dish.ingredientCount > 0) return null;
  return "Add the dish's ingredients first, so guests can see what is in it.";
}

/** Past orders and recipes keep pointing at a dish, so it can only be hidden. */
export function deleteProblem(dish: { isBuilder: boolean; orderCount: number; recipeCount: number }): string | null {
  if (dish.isBuilder) return "The bowl builder cannot be deleted. Hide it instead.";
  if (dish.orderCount > 0) return "This dish has been ordered, so it cannot be deleted. Hide it instead.";
  if (dish.recipeCount > 0) return "A Cook at home recipe uses this dish, so it cannot be deleted. Hide it instead.";
  return null;
}

export const optionGroupSchema = z.object({
  name,
  min: z.coerce.number("Enter a whole number.").int("Enter a whole number.").min(0, "Use 0 or more.").max(50, "Use a smaller number."),
  max: z.coerce.number("Enter a whole number.").int("Enter a whole number.").min(1, "Use 1 or more.").max(50, "Use a smaller number."),
});

/**
 * Checkout refuses a dish with too few options picked, so a group asking for more than it
 * offers would make the dish impossible to order.
 */
export function optionGroupProblem(group: { min: number; max: number; activeOptions: number }): string | null {
  if (group.min > group.max) return "The minimum cannot be more than the maximum.";
  if (group.min > group.activeOptions) return `This group offers ${group.activeOptions} ${group.activeOptions === 1 ? "option" : "options"}, so guests cannot be asked to pick ${group.min}. Add the options first, then raise the minimum.`;
  return null;
}

export const optionSchema = z.object({
  name,
  extraPriceCents: z
    .string()
    .optional()
    .transform((value) => value?.trim() || "0")
    .pipe(dollarsField("the extra price")),
  ingredientId: z.string("Choose an ingredient.").min(1, "Choose an ingredient."),
  grams: z.coerce.number("Enter a weight in grams.").gt(0, "Enter a weight above 0 g.").max(MAX_GRAMS, `No option can weigh more than ${MAX_GRAMS} g.`),
});
