import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DishForm } from "@/components/admin/DishForm";
import { DishVisibility } from "@/components/admin/DishVisibility";
import { OptionGroups } from "@/components/admin/OptionGroups";
import { RecipeEditor, type CatalogueIngredient } from "@/components/admin/RecipeEditor";
import { ADMIN_ROLES } from "@/lib/access";
import { deleteProblem } from "@/lib/admin/menu";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Allergen } from "@/lib/domain";
import { roundNutrition, totalNutrition } from "@/lib/nutrition";

export const metadata: Metadata = { title: "Edit dish" };

export default async function DishEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePageRole(ADMIN_ROLES, `/admin/menu/${id}`);
  const [dish, categories, ingredients] = await Promise.all([
    prisma.menuItem.findUnique({
      where: { id },
      include: {
        ingredients: { orderBy: { grams: "desc" } },
        optionGroups: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" }, include: { ingredient: true } } } },
        _count: { select: { orderItems: true, recipes: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.ingredient.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!dish) notFound();

  const catalogue: CatalogueIngredient[] = ingredients.map((row) => ({
    id: row.id,
    name: row.name,
    per100g: { kcal: row.kcal, protein: row.protein, carbs: row.carbs, fat: row.fat, fibre: row.fibre, sugar: row.sugar, salt: row.salt },
    facts: { isVegan: row.isVegan, isVegetarian: row.isVegetarian, isGlutenFree: row.isGlutenFree, allergens: row.allergens as Allergen[], mayContain: row.mayContain as Allergen[] },
    verified: row.verifiedAt !== null,
  }));
  const choices = ingredients.map((row) => ({ id: row.id, name: row.name }));
  const groups = dish.optionGroups.map((group) => ({
    id: group.id,
    name: group.name,
    min: group.min,
    max: group.max,
    options: group.options.map((option) => ({
      id: option.id,
      name: option.name,
      extraPriceCents: option.extraPriceCents,
      ingredientId: option.ingredientId,
      ingredientName: option.ingredient.name,
      grams: option.grams,
      isActive: option.isActive,
      kcal: roundNutrition(totalNutrition([{ grams: option.grams, per100g: option.ingredient }])).kcal,
    })),
  }));

  return (
    <div className="max-w-6xl">
      <Link href="/admin/menu" className="text-sm text-forest underline">
        Back to the menu
      </Link>
      <h1 className="mt-2 text-3xl">{dish.name}</h1>
      <p className="mt-1 text-sm text-stone">
        Web address: <span className="font-mono text-xs">/dish/{dish.slug}</span>. This never changes.{" "}
        {dish.isActive && !dish.isBuilder ? (
          <Link href={`/dish/${dish.slug}`} className="text-forest underline">
            See the guest page
          </Link>
        ) : null}
      </p>

      <div className="mt-6 max-w-3xl">
        <DishVisibility dishId={dish.id} isActive={dish.isActive} deleteBlockedBy={deleteProblem({ isBuilder: dish.isBuilder, orderCount: dish._count.orderItems, recipeCount: dish._count.recipes })} />
      </div>

      <section aria-labelledby="details" className="mt-8 max-w-3xl">
        <h2 id="details" className="mb-3 text-2xl">
          Details
        </h2>
        <DishForm dish={dish} categories={categories} />
      </section>

      <section aria-labelledby="recipe" className="mt-8">
        <h2 id="recipe" className="mb-3 text-2xl">
          Ingredients
        </h2>
        {dish.isBuilder ? (
          <p className="max-w-3xl rounded-brand bg-paper p-5 text-sm shadow-soft">The bowl builder has no fixed recipe. Its nutrition comes from the options the guest picks, below.</p>
        ) : (
          <RecipeEditor dishId={dish.id} catalogue={catalogue} initial={dish.ingredients.map((line) => ({ ingredientId: line.ingredientId, grams: line.grams }))} />
        )}
      </section>

      <section aria-labelledby="options" className="mt-8 max-w-4xl">
        <h2 id="options" className="mb-3 text-2xl">
          Options
        </h2>
        <OptionGroups dishId={dish.id} groups={groups} ingredients={choices} />
      </section>
    </div>
  );
}
