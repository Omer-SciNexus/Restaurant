import { cache } from "react";
import { deriveFacts, type DishFacts, type IngredientFacts } from "./diet";
import { prisma } from "./db";
import { now } from "./env";
import { isInSeason, isServedAt, type OpeningHours } from "./hours";
import { roundNutrition, totalNutrition, type Nutrition, type NutritionLine } from "./nutrition";
import type { Prisma } from "./generated/prisma/client";

// ---- Branches

export const getBranches = cache(async () => prisma.branch.findMany({ orderBy: { name: "asc" } }));

export const getBranchBySlug = cache(async (slug: string) => prisma.branch.findUnique({ where: { slug } }));

export const getBranchById = cache(async (id: string) => prisma.branch.findUnique({ where: { id } }));

export function branchHours(branch: { openingHours: unknown }): OpeningHours {
  return branch.openingHours as OpeningHours;
}

// ---- Menu views

const dishInclude = {
  category: true,
  ingredients: { include: { ingredient: { include: { supplier: true } } }, orderBy: { grams: "desc" } },
  optionGroups: {
    orderBy: { sortOrder: "asc" },
    include: { options: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, include: { ingredient: true } } },
  },
} satisfies Prisma.MenuItemInclude;

type DishRow = Prisma.MenuItemGetPayload<{ include: typeof dishInclude }>;
type IngredientRow = DishRow["ingredients"][number]["ingredient"];

function per100g(row: IngredientRow | DishRow["optionGroups"][number]["options"][number]["ingredient"]): Nutrition {
  return { kcal: row.kcal, protein: row.protein, carbs: row.carbs, fat: row.fat, fibre: row.fibre, sugar: row.sugar, salt: row.salt };
}

export function factsOf(row: { isVegan: boolean; isVegetarian: boolean; isGlutenFree: boolean; allergens: string[]; mayContain: string[] }): IngredientFacts {
  return {
    isVegan: row.isVegan,
    isVegetarian: row.isVegetarian,
    isGlutenFree: row.isGlutenFree,
    allergens: row.allergens as IngredientFacts["allergens"],
    mayContain: row.mayContain as IngredientFacts["mayContain"],
  };
}

export type DishSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  priceCents: number;
  isSeasonal: boolean;
  isBuilder: boolean;
  soldOut: boolean;
  facts: DishFacts;
  nutrition: Nutrition;
  /** False until a nutritionist has approved every ingredient in the dish. */
  verified: boolean;
  categorySlug: string;
};

export type OptionView = {
  id: string;
  name: string;
  extraPriceCents: number;
  imageUrl: string | null;
  grams: number;
  per100g: Nutrition;
  facts: IngredientFacts;
  verified: boolean;
};

export type OptionGroupView = {
  id: string;
  name: string;
  min: number;
  max: number;
  options: OptionView[];
};

export type DishDetail = DishSummary & {
  categoryName: string;
  servedFrom: string | null;
  servedUntil: string | null;
  isServing: boolean;
  ingredients: { name: string; grams: number; supplier: { name: string; slug: string; region: string } | null }[];
  baseLines: NutritionLine[];
  baseFacts: IngredientFacts[];
  groups: OptionGroupView[];
};

function toSummary(row: DishRow, branchRow?: { isAvailable: boolean; isHidden: boolean; priceOverrideCents: number | null }): DishSummary {
  const lines = row.ingredients.map((line) => ({ grams: line.grams, per100g: per100g(line.ingredient) }));
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    priceCents: branchRow?.priceOverrideCents ?? row.basePriceCents,
    isSeasonal: row.isSeasonal,
    isBuilder: row.isBuilder,
    // A hidden dish reached by a direct link reads as unavailable rather than orderable.
    soldOut: branchRow ? !branchRow.isAvailable || branchRow.isHidden : false,
    facts: deriveFacts(row.ingredients.map((line) => factsOf(line.ingredient))),
    nutrition: roundNutrition(totalNutrition(lines)),
    verified: row.ingredients.length > 0 && row.ingredients.every((line) => line.ingredient.verifiedAt !== null),
    categorySlug: row.category.slug,
  };
}

export type MenuCategory = {
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  servedFrom: string | null;
  servedUntil: string | null;
  isServing: boolean;
  items: DishSummary[];
};

/**
 * The menu for one branch, or the shared menu when no branch is chosen yet. Dishes outside
 * their season are left out. A category outside its serving window (breakfast) keeps its
 * entry so the page can say when it returns, but lists no dishes.
 */
export const getMenu = cache(async (branchId: string | null, timezone: string): Promise<MenuCategory[]> => {
  const at = now();
  const [categories, rows, branchRows] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.menuItem.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, include: dishInclude }),
    branchId ? prisma.branchMenuItem.findMany({ where: { branchId } }) : Promise.resolve([]),
  ]);
  const byItem = new Map(branchRows.map((row) => [row.menuItemId, row]));

  return categories.map((category) => {
    const isServing = isServedAt(category.servedFrom, category.servedUntil, at, timezone);
    const items = isServing
      ? rows
          .filter((row) => row.categoryId === category.id && isInSeason(row.availableFrom, row.availableTo, at) && !byItem.get(row.id)?.isHidden)
          .map((row) => toSummary(row, byItem.get(row.id)))
      : [];
    return {
      slug: category.slug,
      name: category.name,
      description: category.description,
      imageUrl: category.imageUrl,
      servedFrom: category.servedFrom,
      servedUntil: category.servedUntil,
      isServing,
      items,
    };
  });
});

export const getDish = cache(async (slug: string, branchId: string | null, timezone: string): Promise<DishDetail | null> => {
  const at = now();
  const row = await prisma.menuItem.findUnique({ where: { slug }, include: dishInclude });
  if (!row || !row.isActive) return null;
  const branchRow = branchId
    ? await prisma.branchMenuItem.findUnique({ where: { branchId_menuItemId: { branchId, menuItemId: row.id } } })
    : null;
  const summary = toSummary(row, branchRow ?? undefined);
  return {
    ...summary,
    categoryName: row.category.name,
    servedFrom: row.category.servedFrom,
    servedUntil: row.category.servedUntil,
    isServing: isServedAt(row.category.servedFrom, row.category.servedUntil, at, timezone) && isInSeason(row.availableFrom, row.availableTo, at),
    ingredients: row.ingredients.map((line) => ({
      name: line.ingredient.name,
      grams: line.grams,
      // A supplier is shown only once its profile is published, so no unproven sourcing claim leaks out.
      supplier:
        line.ingredient.supplier?.isPublished
          ? { name: line.ingredient.supplier.name, slug: line.ingredient.supplier.slug, region: line.ingredient.supplier.region }
          : null,
    })),
    baseLines: row.ingredients.map((line) => ({ grams: line.grams, per100g: per100g(line.ingredient) })),
    baseFacts: row.ingredients.map((line) => factsOf(line.ingredient)),
    groups: row.optionGroups.map((group) => ({
      id: group.id,
      name: group.name,
      min: group.min,
      max: group.max,
      options: group.options.map((option) => ({
        id: option.id,
        name: option.name,
        extraPriceCents: option.extraPriceCents,
        imageUrl: option.imageUrl,
        grams: option.grams,
        per100g: per100g(option.ingredient),
        facts: factsOf(option.ingredient),
        verified: option.ingredient.verifiedAt !== null,
      })),
    })),
  };
});

export const getBuilderDish = cache(async (branchId: string | null, timezone: string) => {
  const row = await prisma.menuItem.findFirst({ where: { isBuilder: true, isActive: true }, select: { slug: true } });
  return row ? getDish(row.slug, branchId, timezone) : null;
});

/** Dishes in season now, for the home page. */
export const getSeasonalDishes = cache(async (limit: number): Promise<DishSummary[]> => {
  const at = now();
  const rows = await prisma.menuItem.findMany({
    where: { isActive: true, isSeasonal: true },
    orderBy: { sortOrder: "asc" },
    include: dishInclude,
  });
  return rows
    .filter((row) => isInSeason(row.availableFrom, row.availableTo, at))
    .slice(0, limit)
    .map((row) => toSummary(row));
});
