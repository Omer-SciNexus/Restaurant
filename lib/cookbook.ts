import { ApiError } from "./api";
import { prisma } from "./db";
import { recipeInclude, toRecipeDetail, type RecipeDetail } from "./recipes";

export type CookbookEntryView = { note: string | null; addedAt: string; recipe: RecipeDetail };

/** One person's saved recipes. A recipe taken back to draft drops out until it returns. */
export async function getCookbook(userId: string): Promise<CookbookEntryView[]> {
  const rows = await prisma.cookbookEntry.findMany({
    where: { userId, recipe: { status: "PUBLISHED" } },
    orderBy: { addedAt: "desc" },
    include: { recipe: { include: recipeInclude } },
  });
  return rows.map((row) => ({ note: row.note, addedAt: row.addedAt.toISOString(), recipe: toRecipeDetail(row.recipe) }));
}

export async function isInCookbook(userId: string, recipeId: string): Promise<boolean> {
  const row = await prisma.cookbookEntry.findUnique({ where: { userId_recipeId: { userId, recipeId } }, select: { recipeId: true } });
  return row !== null;
}

/** Saves a recipe, or updates its note when one is sent. Saving twice leaves one entry. */
export async function saveToCookbook(userId: string, recipeId: string, note: string | null | undefined) {
  const recipe = await prisma.recipe.findFirst({ where: { id: recipeId, status: "PUBLISHED" }, select: { id: true } });
  if (!recipe) throw new ApiError(404, "RECIPE_NOT_FOUND", "We could not find that recipe.");
  const cleanNote = note === undefined ? undefined : note || null;
  return prisma.cookbookEntry.upsert({
    where: { userId_recipeId: { userId, recipeId } },
    create: { userId, recipeId, note: cleanNote ?? null },
    update: { note: cleanNote },
    select: { recipeId: true, note: true, addedAt: true },
  });
}

export async function removeFromCookbook(userId: string, recipeId: string): Promise<boolean> {
  const { count } = await prisma.cookbookEntry.deleteMany({ where: { userId, recipeId } });
  return count > 0;
}
