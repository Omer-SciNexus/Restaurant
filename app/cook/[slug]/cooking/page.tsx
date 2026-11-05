import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CookingMode } from "@/components/cook/CookingMode";
import { clampServings, getPublishedRecipe } from "@/lib/recipes";
import { cookingModeSearchSchema } from "@/lib/validation/recipes";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await getPublishedRecipe(slug);
  return { title: recipe ? `Cooking ${recipe.title}` : "Recipe not found", robots: { index: false } };
}

/** Sits outside the site layout on purpose: the whole screen is for the step in front of you. */
export default async function CookingModePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const recipe = await getPublishedRecipe(slug);
  if (!recipe) notFound();
  const { servings, units } = cookingModeSearchSchema.parse(await searchParams);

  return (
    <CookingMode
      slug={recipe.slug}
      title={recipe.title}
      baseServings={recipe.servings}
      servings={clampServings(servings ?? recipe.servings)}
      units={units ?? "us"}
      ingredients={recipe.ingredients}
      steps={recipe.steps}
    />
  );
}
