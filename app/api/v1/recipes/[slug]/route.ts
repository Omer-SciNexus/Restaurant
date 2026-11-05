import { NextResponse } from "next/server";
import { ApiError, handle } from "@/lib/api";
import { getPublishedRecipe } from "@/lib/recipes";

export const GET = handle(async (_request: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const recipe = await getPublishedRecipe(slug);
  if (!recipe) throw new ApiError(404, "RECIPE_NOT_FOUND", "We could not find that recipe.");
  return NextResponse.json({ recipe });
});
