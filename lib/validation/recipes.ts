import { z } from "zod";
import { DIETS, dietFromSlug, type Diet } from "../domain";
import { DIFFICULTIES, MAX_SERVINGS, MIN_SERVINGS, RECIPE_CATEGORIES, TIME_LIMITS, type RecipeCategory, type RecipeFilters, type TimeLimit } from "../recipe-rules";

const oneValue = z.preprocess((value) => (Array.isArray(value) ? value[0] : value), z.string().trim().max(80).optional());

const filterQuerySchema = z.object({
  diet: z.preprocess((value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]), z.array(z.string().max(40)).max(DIETS.length * 2)).catch([]),
  time: oneValue.catch(undefined),
  difficulty: oneValue.catch(undefined),
  category: oneValue.catch(undefined),
  q: oneValue.catch(undefined),
});

/** Library filters from a URL. Anything unknown is ignored, so an old or edited link still opens. */
export function parseRecipeFilters(raw: Record<string, string | string[] | undefined>): RecipeFilters {
  const parsed = filterQuerySchema.parse(raw);
  const diets = [...new Set(parsed.diet.map(dietFromSlug).filter((diet): diet is Diet => Boolean(diet)))];
  const time = Number(parsed.time);
  const difficulty = parsed.difficulty?.toUpperCase();
  return {
    diets,
    time: TIME_LIMITS.includes(time as TimeLimit) ? (time as TimeLimit) : null,
    difficulty: DIFFICULTIES.find((entry) => entry === difficulty) ?? null,
    category: RECIPE_CATEGORIES.some((entry) => entry.slug === parsed.category) ? (parsed.category as RecipeCategory) : null,
    query: parsed.q ?? "",
  };
}

/** Same thing for an API request's query string. */
export function parseRecipeFiltersFromUrl(searchParams: URLSearchParams): RecipeFilters {
  const single = (key: string) => searchParams.get(key) ?? undefined;
  return parseRecipeFilters({ diet: searchParams.getAll("diet"), time: single("time"), difficulty: single("difficulty"), category: single("category"), q: single("q") });
}

export const cookingModeSearchSchema = z.object({
  servings: z.coerce.number().int().min(MIN_SERVINGS).max(MAX_SERVINGS).optional().catch(undefined),
  units: z.enum(["us", "metric"]).optional().catch(undefined),
});

// ---- Admin

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

const imagePath = z
  .string()
  .trim()
  .max(300)
  .regex(/^(\/images\/[\w./-]+\.(png|jpe?g|webp|avif))?$/, "Use a path under /images, for example /images/dishes/harvest-quinoa-bowl.png")
  .refine((value) => !value.includes(".."), "Use a path under /images")
  .transform((value) => value || null);

const optionalWholeSeconds = (max: number) =>
  z.preprocess((value) => (value === "" || value === null || value === undefined ? null : value), z.coerce.number().int().min(0).max(max).nullable());

export const recipeIngredientSchema = z.object({
  ingredientId: z.string().min(1, "Choose an ingredient"),
  grams: z.coerce.number().positive("Enter the weight in grams").max(50_000),
  displayText: z.string().trim().min(1, "Enter what the guest sees, for example 1 cup cooked quinoa").max(200),
});

export const recipeStepSchema = z.object({
  text: z.string().trim().min(3, "Write the step").max(2000),
  imageUrl: imagePath,
  videoStartSec: optionalWholeSeconds(6 * 60 * 60),
  timerSec: optionalWholeSeconds(24 * 60 * 60).refine((value) => value === null || value > 0, "A timer needs at least one second"),
});

export const recipeFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "Enter a web address")
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens"),
  title: z.string().trim().min(2, "Enter a title").max(120),
  description: z.string().trim().min(10, "Write a short description").max(1000),
  prepMin: z.coerce.number().int().min(0).max(24 * 60),
  cookMin: z.coerce.number().int().min(0).max(24 * 60),
  difficulty: z.enum(DIFFICULTIES),
  servings: z.coerce.number().int().min(MIN_SERVINGS).max(MAX_SERVINGS),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  menuItemId: optionalText(60),
  thumbnailUrl: imagePath,
  transcript: optionalText(50_000),
  ingredients: z
    .array(recipeIngredientSchema)
    .min(1, "Add at least one ingredient")
    .max(60)
    .refine((lines) => new Set(lines.map((line) => line.ingredientId)).size === lines.length, "Each ingredient can be listed once. Add the weights together."),
  steps: z
    .array(recipeStepSchema)
    .min(1, "Add at least one step")
    .max(60)
    .refine((steps) => {
      const starts = steps.flatMap((step) => (step.videoStartSec === null ? [] : [step.videoStartSec]));
      return starts.every((start, index) => index === 0 || start > starts[index - 1]!);
    }, "Chapter start times must go up from one step to the next."),
});
export type RecipeFormInput = z.infer<typeof recipeFormSchema>;
