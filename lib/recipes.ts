import { cache } from "react";
import { deriveFacts, type IngredientFacts } from "./diet";
import { prisma } from "./db";
import type { Prisma } from "./generated/prisma/client";
import { roundNutrition, scaleNutrition, totalNutrition, type Nutrition } from "./nutrition";
import { recipeCategory, type Difficulty, type RecipeSummary } from "./recipe-rules";

export * from "./recipe-rules";

export const recipeInclude = {
  video: true,
  menuItem: { include: { category: true } },
  ingredients: { include: { ingredient: true }, orderBy: [{ grams: "desc" }, { ingredientId: "asc" }] },
  steps: { orderBy: { stepNo: "asc" } },
} satisfies Prisma.RecipeInclude;

export type RecipeRow = Prisma.RecipeGetPayload<{ include: typeof recipeInclude }>;
type IngredientRow = RecipeRow["ingredients"][number]["ingredient"];

function per100g(row: IngredientRow): Nutrition {
  return { kcal: row.kcal, protein: row.protein, carbs: row.carbs, fat: row.fat, fibre: row.fibre, sugar: row.sugar, salt: row.salt };
}

function factsOf(row: IngredientRow): IngredientFacts {
  return {
    isVegan: row.isVegan,
    isVegetarian: row.isVegetarian,
    isGlutenFree: row.isGlutenFree,
    allergens: row.allergens as IngredientFacts["allergens"],
    mayContain: row.mayContain as IngredientFacts["mayContain"],
  };
}

export type RecipeDetail = RecipeSummary & {
  status: "DRAFT" | "PUBLISHED";
  transcript: string | null;
  /** Only set once there is something to play. Until then the page says the video is coming. */
  video: { playbackId: string; durationSec: number | null; captionsUrl: string | null } | null;
  /** The dish behind "Too busy? Order it", when it is on the menu. */
  dish: { slug: string; name: string } | null;
  ingredients: { ingredientId: string; name: string; grams: number; displayText: string }[];
  steps: { stepNo: number; text: string; imageUrl: string | null; videoStartSec: number | null; timerSec: number | null }[];
};

export function toRecipeDetail(row: RecipeRow): RecipeDetail {
  const lines = row.ingredients.map((line) => ({ grams: line.grams, per100g: per100g(line.ingredient) }));
  const playbackId = row.video?.playbackId ?? null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    prepMin: row.prepMin,
    cookMin: row.cookMin,
    totalMin: row.prepMin + row.cookMin,
    difficulty: row.difficulty as Difficulty,
    servings: row.servings,
    thumbnailUrl: row.thumbnailUrl,
    hasVideo: playbackId !== null,
    category: recipeCategory(row.menuItem?.category.slug),
    ingredientNames: row.ingredients.map((line) => line.ingredient.name),
    facts: deriveFacts(row.ingredients.map((line) => factsOf(line.ingredient))),
    // Grams are for the whole recipe, so the label divides by what it serves.
    nutrition: roundNutrition(scaleNutrition(totalNutrition(lines), 1 / row.servings)),
    verified: row.ingredients.length > 0 && row.ingredients.every((line) => line.ingredient.verifiedAt !== null),
    status: row.status,
    transcript: row.transcript,
    video: playbackId ? { playbackId, durationSec: row.video?.durationSec ?? null, captionsUrl: row.video?.captionsUrl ?? null } : null,
    dish: row.menuItem?.isActive ? { slug: row.menuItem.slug, name: row.menuItem.name } : null,
    ingredients: row.ingredients.map((line) => ({
      ingredientId: line.ingredientId,
      name: line.ingredient.name,
      grams: line.grams,
      displayText: line.displayText,
    })),
    steps: row.steps.map((step) => ({
      stepNo: step.stepNo,
      text: step.text,
      imageUrl: step.imageUrl,
      videoStartSec: step.videoStartSec,
      timerSec: step.timerSec,
    })),
  };
}

function toSummary(detail: RecipeDetail): RecipeSummary {
  const { id, slug, title, description, prepMin, cookMin, totalMin, difficulty, servings, thumbnailUrl, hasVideo, category, ingredientNames, facts, nutrition, verified } = detail;
  return { id, slug, title, description, prepMin, cookMin, totalMin, difficulty, servings, thumbnailUrl, hasVideo, category, ingredientNames, facts, nutrition, verified };
}

/** Published recipes only: a draft is never reachable from the library or the API. */
export const getPublishedRecipes = cache(async (): Promise<RecipeSummary[]> => {
  const rows = await prisma.recipe.findMany({ where: { status: "PUBLISHED" }, orderBy: { title: "asc" }, include: recipeInclude });
  return rows.map((row) => toSummary(toRecipeDetail(row)));
});

export const getPublishedRecipe = cache(async (slug: string): Promise<RecipeDetail | null> => {
  const row = await prisma.recipe.findFirst({ where: { slug, status: "PUBLISHED" }, include: recipeInclude });
  return row ? toRecipeDetail(row) : null;
});

/** Any status. Callers must have checked that the viewer is an admin. */
export const getRecipeForAdminPreview = cache(async (slug: string): Promise<RecipeDetail | null> => {
  const row = await prisma.recipe.findUnique({ where: { slug }, include: recipeInclude });
  return row ? toRecipeDetail(row) : null;
});
