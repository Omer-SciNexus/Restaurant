import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { filterRecipes, getPublishedRecipes } from "@/lib/recipes";
import { parseRecipeFiltersFromUrl } from "@/lib/validation/recipes";

export const GET = handle(async (request: Request) => {
  const filters = parseRecipeFiltersFromUrl(new URL(request.url).searchParams);
  return NextResponse.json({ recipes: filterRecipes(await getPublishedRecipes(), filters) });
});
