import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecipeForm } from "@/components/admin/RecipeForm";
import { VideoUpload } from "@/components/admin/VideoUpload";
import { ADMIN_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { services } from "@/lib/env";
import type { Difficulty } from "@/lib/recipes";

export const metadata: Metadata = { title: "Edit recipe" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> };

export default async function EditRecipePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { created } = await searchParams;
  await requirePageRole(ADMIN_ROLES, `/admin/recipes/${id}`);
  const [recipe, ingredients, dishes] = await Promise.all([
    prisma.recipe.findUnique({
      where: { id },
      include: {
        video: { select: { playbackId: true, uploadId: true } },
        ingredients: { orderBy: [{ grams: "desc" }, { ingredientId: "asc" }] },
        steps: { orderBy: { stepNo: "asc" } },
      },
    }),
    prisma.ingredient.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.menuItem.findMany({ where: { isActive: true, isBuilder: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!recipe) notFound();

  return (
    <div className="max-w-4xl">
      <Link href="/admin/recipes" className="text-sm text-forest underline">
        All recipes
      </Link>
      <h1 className="mt-2 text-3xl">{recipe.title}</h1>
      <p className="mt-1 text-sm">
        <Link href={`/cook/${recipe.slug}`} className="text-forest underline">
          {recipe.status === "PUBLISHED" ? "See the recipe page" : "Preview the draft"}
        </Link>
      </p>
      {created ? (
        <p role="status" className="mt-3 rounded-brand bg-sage p-3 text-sm">
          Recipe created.
        </p>
      ) : null}

      <VideoUpload recipeId={recipe.id} configured={services.mux} status={recipe.video?.playbackId ? "ready" : recipe.video?.uploadId ? "processing" : "none"} />

      <RecipeForm
        recipeId={recipe.id}
        ingredients={ingredients}
        dishes={dishes}
        values={{
          slug: recipe.slug,
          title: recipe.title,
          description: recipe.description,
          prepMin: recipe.prepMin,
          cookMin: recipe.cookMin,
          difficulty: recipe.difficulty as Difficulty,
          servings: recipe.servings,
          status: recipe.status,
          menuItemId: recipe.menuItemId,
          thumbnailUrl: recipe.thumbnailUrl,
          transcript: recipe.transcript,
          ingredients: recipe.ingredients.map((line) => ({ ingredientId: line.ingredientId, grams: line.grams, displayText: line.displayText })),
          steps: recipe.steps.map((step) => ({ text: step.text, imageUrl: step.imageUrl, videoStartSec: step.videoStartSec, timerSec: step.timerSec })),
        }}
      />
    </div>
  );
}
