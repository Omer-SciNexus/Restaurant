import type { Metadata } from "next";
import Link from "next/link";
import { RecipeForm } from "@/components/admin/RecipeForm";
import { ADMIN_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "New recipe" };

export default async function NewRecipePage() {
  await requirePageRole(ADMIN_ROLES, "/admin/recipes/new");
  const [ingredients, dishes] = await Promise.all([
    prisma.ingredient.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.menuItem.findMany({ where: { isActive: true, isBuilder: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="max-w-4xl">
      <Link href="/admin/recipes" className="text-sm text-forest underline">
        All recipes
      </Link>
      <h1 className="mt-2 text-3xl">New recipe</h1>
      <p className="mt-1 text-sm text-stone">You can upload a video once the recipe is created.</p>
      <RecipeForm recipeId={null} ingredients={ingredients} dishes={dishes} />
    </div>
  );
}
