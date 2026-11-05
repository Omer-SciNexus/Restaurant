import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { BRANCHES } from "./seed-data/branches";
import { INGREDIENTS } from "./seed-data/ingredients";
import { ADD_PROTEIN_OPTIONS, BOWL_BUILDER, CATEGORIES, DISHES } from "./seed-data/menu";
import { RECIPES } from "./seed-data/recipes";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// Test accounts for local and staging only; never created in production.
export const DEV_PASSWORD = "nature-food-dev";

const SEASON_START = new Date("2026-09-01T00:00:00Z");
const SEASON_END = new Date("2027-03-31T00:00:00Z");

async function main() {
  await seedBranches();
  const ingredientIds = await seedIngredients();
  const categoryIds = await seedCategories();
  await seedDishes(ingredientIds, categoryIds);
  await seedBuilder(ingredientIds, categoryIds);
  await seedRecipes(ingredientIds);
  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  if (process.env.NODE_ENV !== "production") await seedTestUsers();

  const counts = {
    branches: await prisma.branch.count(),
    ingredients: await prisma.ingredient.count(),
    categories: await prisma.category.count(),
    dishes: await prisma.menuItem.count(),
    options: await prisma.option.count(),
    recipes: await prisma.recipe.count(),
  };
  console.log("Seeded", counts);
}

async function seedBranches() {
  for (const branch of BRANCHES) {
    await prisma.branch.upsert({ where: { slug: branch.slug }, update: branch, create: branch });
  }
}

async function seedIngredients() {
  const ids = new Map<string, string>();
  for (const ingredient of INGREDIENTS) {
    // Update never touches verifiedAt, so re-seeding cannot silently un-verify or verify a row.
    const row = await prisma.ingredient.upsert({ where: { key: ingredient.key }, update: ingredient, create: ingredient });
    ids.set(row.key, row.id);
  }
  return ids;
}

async function seedCategories() {
  const ids = new Map<string, string>();
  for (const [sortOrder, category] of CATEGORIES.entries()) {
    const data = { ...category, sortOrder };
    const row = await prisma.category.upsert({ where: { slug: category.slug }, update: data, create: data });
    ids.set(row.slug, row.id);
  }
  return ids;
}

function requireId(map: Map<string, string>, key: string, context: string) {
  const id = map.get(key);
  if (!id) throw new Error(`Unknown key "${key}" in ${context}`);
  return id;
}

async function seedDishes(ingredientIds: Map<string, string>, categoryIds: Map<string, string>) {
  for (const [sortOrder, dish] of DISHES.entries()) {
    const data = {
      name: dish.name,
      description: dish.description,
      basePriceCents: dish.priceCents,
      imageUrl: `/images/dishes/${dish.slug}.png`,
      categoryId: requireId(categoryIds, dish.category, dish.slug),
      isSeasonal: Boolean(dish.seasonal),
      availableFrom: dish.seasonal ? SEASON_START : null,
      availableTo: dish.seasonal ? SEASON_END : null,
      sortOrder,
    };
    const row = await prisma.menuItem.upsert({ where: { slug: dish.slug }, update: data, create: { slug: dish.slug, ...data } });

    await prisma.menuItemIngredient.deleteMany({ where: { menuItemId: row.id } });
    await prisma.menuItemIngredient.createMany({
      data: dish.ingredients.map(([key, grams]) => ({
        menuItemId: row.id,
        ingredientId: requireId(ingredientIds, key, dish.slug),
        grams,
      })),
    });

    await prisma.optionGroup.deleteMany({ where: { menuItemId: row.id } });
    if (dish.addProtein) {
      await prisma.optionGroup.create({
        data: {
          menuItemId: row.id,
          name: "Add a protein",
          min: 0,
          max: 1,
          options: {
            create: ADD_PROTEIN_OPTIONS.map((option, index) => ({
              name: option.name,
              extraPriceCents: option.extraCents,
              grams: option.grams,
              ingredientId: requireId(ingredientIds, option.ingredient, dish.slug),
              sortOrder: index,
            })),
          },
        },
      });
    }
  }
}

async function seedBuilder(ingredientIds: Map<string, string>, categoryIds: Map<string, string>) {
  const data = {
    name: BOWL_BUILDER.name,
    description: BOWL_BUILDER.description,
    basePriceCents: BOWL_BUILDER.priceCents,
    imageUrl: BOWL_BUILDER.imageUrl,
    categoryId: requireId(categoryIds, BOWL_BUILDER.category, BOWL_BUILDER.slug),
    isBuilder: true,
  };
  const item = await prisma.menuItem.upsert({
    where: { slug: BOWL_BUILDER.slug },
    update: data,
    create: { slug: BOWL_BUILDER.slug, ...data },
  });
  await prisma.optionGroup.deleteMany({ where: { menuItemId: item.id } });
  for (const [sortOrder, group] of BOWL_BUILDER.groups.entries()) {
    await prisma.optionGroup.create({
      data: {
        menuItemId: item.id,
        name: group.name,
        required: group.min > 0,
        min: group.min,
        max: group.max,
        sortOrder,
        options: {
          create: group.options.map((option, index) => ({
            name: option.name,
            extraPriceCents: option.extraCents ?? 0,
            grams: option.grams,
            ingredientId: requireId(ingredientIds, option.ingredient, BOWL_BUILDER.slug),
            imageUrl: `/images/builder/${group.folder}/${option.image}.png`,
            sortOrder: index,
          })),
        },
      },
    });
  }
}

/**
 * Re-seeding keeps each recipe's id and video, so saved cookbook entries and a real upload
 * survive. Grams come from the linked dish, so a serving matches the menu's nutrition.
 */
async function seedRecipes(ingredientIds: Map<string, string>) {
  for (const recipe of RECIPES) {
    const dish = DISHES.find((entry) => entry.slug === recipe.dish);
    if (!dish) throw new Error(`Unknown dish "${recipe.dish}" in recipe ${recipe.slug}`);
    const menuItem = await prisma.menuItem.findUniqueOrThrow({ where: { slug: dish.slug } });

    const listed = Object.keys(recipe.ingredients).sort();
    const expected = dish.ingredients.map(([key]) => key).sort();
    if (listed.join() !== expected.join()) {
      throw new Error(`Recipe ${recipe.slug} lists [${listed}] but dish ${dish.slug} has [${expected}]`);
    }

    const data = {
      title: recipe.title,
      menuItemId: menuItem.id,
      description: recipe.description,
      prepMin: recipe.prepMin,
      cookMin: recipe.cookMin,
      difficulty: recipe.difficulty,
      servings: recipe.servings,
      thumbnailUrl: `/images/dishes/${dish.slug}.png`,
      status: "PUBLISHED" as const,
    };
    const row = await prisma.recipe.upsert({ where: { slug: recipe.slug }, update: data, create: { slug: recipe.slug, ...data } });

    await prisma.recipeIngredient.deleteMany({ where: { recipeId: row.id } });
    await prisma.recipeIngredient.createMany({
      data: dish.ingredients.map(([key, grams]) => ({
        recipeId: row.id,
        ingredientId: requireId(ingredientIds, key, recipe.slug),
        grams: grams * recipe.servings,
        // The check above guarantees this recipe has a line for every key.
        displayText: recipe.ingredients[key]!,
      })),
    });

    await prisma.recipeStep.deleteMany({ where: { recipeId: row.id } });
    await prisma.recipeStep.createMany({
      data: recipe.steps.map((step, index) => ({
        recipeId: row.id,
        stepNo: index + 1,
        text: step.text,
        timerSec: step.timerSec ?? null,
      })),
    });
  }
}

async function seedTestUsers() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
  const downtown = await prisma.branch.findUniqueOrThrow({ where: { slug: "downtown" } });
  const riverside = await prisma.branch.findUniqueOrThrow({ where: { slug: "riverside" } });
  const users = [
    { email: "admin@nature.test", name: "Avery Admin", role: "ADMIN", branchId: null },
    { email: "nutrition@nature.test", name: "Noor Nutrition", role: "ADMIN", branchId: null },
    { email: "manager@nature.test", name: "Morgan Manager", role: "MANAGER", branchId: downtown.id },
    { email: "staff@nature.test", name: "Sam Staff", role: "STAFF", branchId: downtown.id },
    { email: "driver@nature.test", name: "Dana Driver", role: "DRIVER", branchId: downtown.id },
    { email: "staff.riverside@nature.test", name: "Riley Riverside", role: "STAFF", branchId: riverside.id },
    { email: "guest@nature.test", name: "Gale Guest", role: "CUSTOMER", branchId: null },
  ] as const;
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, branchId: user.branchId, passwordHash },
      create: { ...user, passwordHash },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
