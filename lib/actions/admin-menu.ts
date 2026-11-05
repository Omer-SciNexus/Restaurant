"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ADMIN_ROLES } from "../access";
import { activationProblem, categorySchema, deleteProblem, dishSchema, optionGroupProblem, optionGroupSchema, optionSchema, recipeSchema, uniqueSlug } from "../admin/menu";
import { ApiError } from "../api";
import { requireApiRole } from "../auth";
import { prisma } from "../db";
import { actionError, type ActionState } from "./helpers";

function revalidateMenu(dishId?: string, slug?: string) {
  revalidatePath("/admin/menu");
  revalidatePath("/menu", "layout");
  revalidatePath("/build-a-bowl");
  if (dishId) revalidatePath(`/admin/menu/${dishId}`);
  if (slug) revalidatePath(`/dish/${slug}`);
}

async function loadDish(id: string) {
  const dish = await prisma.menuItem.findUnique({
    where: { id },
    select: { id: true, slug: true, isBuilder: true, isActive: true, _count: { select: { ingredients: true, orderItems: true, recipes: true } } },
  });
  if (!dish) throw new ApiError(404, "DISH_NOT_FOUND", "We could not find that dish.");
  return dish;
}

async function requireCategory(id: string) {
  const category = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  if (!category) throw new ApiError(422, "CATEGORY_NOT_FOUND", "Choose a category from the list.");
}

// ---- Categories

export async function createCategoryAction(_state: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireApiRole(ADMIN_ROLES);
    const data = categorySchema.parse(Object.fromEntries(form));
    const taken = await prisma.category.findMany({ select: { slug: true } });
    await prisma.category.create({ data: { ...data, slug: uniqueSlug(data.name, new Set(taken.map((row) => row.slug))) } });
    revalidateMenu();
    revalidatePath("/admin/menu/categories");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateCategoryAction(categoryId: string, _state: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireApiRole(ADMIN_ROLES);
    const data = categorySchema.parse(Object.fromEntries(form));
    await requireCategory(categoryId);
    await prisma.category.update({ where: { id: categoryId }, data });
    revalidateMenu();
    revalidatePath("/admin/menu/categories");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

// ---- Dishes

/** A new dish starts hidden: it cannot go on the menu until it has its ingredients. */
export async function createDishAction(_state: ActionState, form: FormData): Promise<ActionState> {
  let id: string;
  try {
    await requireApiRole(ADMIN_ROLES);
    const data = dishSchema.parse(Object.fromEntries(form));
    await requireCategory(data.categoryId);
    const [taken, last] = await Promise.all([prisma.menuItem.findMany({ select: { slug: true } }), prisma.menuItem.aggregate({ _max: { sortOrder: true } })]);
    const dish = await prisma.menuItem.create({
      data: { ...data, slug: uniqueSlug(data.name, new Set(taken.map((row) => row.slug))), isActive: false, sortOrder: (last._max.sortOrder ?? 0) + 1 },
    });
    id = dish.id;
    revalidatePath("/admin/menu");
  } catch (error) {
    return actionError(error);
  }
  redirect(`/admin/menu/${id}`);
}

/** The slug is not in the schema, so it cannot change here whatever the form sends. */
export async function updateDishAction(dishId: string, _state: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireApiRole(ADMIN_ROLES);
    const dish = await loadDish(dishId);
    const data = dishSchema.parse(Object.fromEntries(form));
    await requireCategory(data.categoryId);
    await prisma.menuItem.update({ where: { id: dishId }, data });
    revalidateMenu(dishId, dish.slug);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function setDishActiveAction(dishId: string, isActive: boolean): Promise<ActionState> {
  try {
    await requireApiRole(ADMIN_ROLES);
    const dish = await loadDish(dishId);
    if (isActive) {
      const problem = activationProblem({ isBuilder: dish.isBuilder, ingredientCount: dish._count.ingredients });
      if (problem) throw new ApiError(422, "DISH_INCOMPLETE", problem);
    }
    await prisma.menuItem.update({ where: { id: dishId }, data: { isActive } });
    revalidateMenu(dishId, dish.slug);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteDishAction(dishId: string): Promise<ActionState> {
  try {
    await requireApiRole(ADMIN_ROLES);
    const dish = await loadDish(dishId);
    const problem = deleteProblem({ isBuilder: dish.isBuilder, orderCount: dish._count.orderItems, recipeCount: dish._count.recipes });
    if (problem) throw new ApiError(409, "DISH_IN_USE", problem);
    try {
      await prisma.menuItem.delete({ where: { id: dishId } });
    } catch (error) {
      // An order placed in the moment since the check above: the database refuses, and the rule holds.
      if ((error as { code?: string }).code === "P2003") throw new ApiError(409, "DISH_IN_USE", "This dish has just been ordered, so it cannot be deleted. Hide it instead.");
      throw error;
    }
    revalidateMenu(undefined, dish.slug);
  } catch (error) {
    return actionError(error);
  }
  redirect("/admin/menu");
}

/** Replaces the dish's ingredient lines. Totals and diet tags follow, as they are calculated. */
export async function saveRecipeAction(dishId: string, _state: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireApiRole(ADMIN_ROLES);
    const dish = await loadDish(dishId);
    const parsed = recipeSchema.safeParse(JSON.parse(String(form.get("lines") ?? "[]")));
    // Errors on list items have no form field to sit beside, so the first one is shown on its own.
    if (!parsed.success) throw new ApiError(422, "BAD_RECIPE", parsed.error.issues[0]?.message ?? "Please check the weights.");
    const lines = parsed.data;
    if (dish.isActive) {
      const problem = activationProblem({ isBuilder: dish.isBuilder, ingredientCount: lines.length });
      if (problem) throw new ApiError(422, "DISH_INCOMPLETE", "A dish on the menu needs at least one ingredient. Hide it first if you need to empty it.");
    }
    const found = await prisma.ingredient.count({ where: { id: { in: lines.map((line) => line.ingredientId) } } });
    if (found !== lines.length) throw new ApiError(422, "INGREDIENT_NOT_FOUND", "Choose ingredients from the list.");
    await prisma.$transaction([
      prisma.menuItemIngredient.deleteMany({ where: { menuItemId: dishId } }),
      prisma.menuItemIngredient.createMany({ data: lines.map((line) => ({ menuItemId: dishId, ingredientId: line.ingredientId, grams: line.grams })) }),
    ]);
    revalidateMenu(dishId, dish.slug);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

// ---- Option groups and options

async function loadGroup(groupId: string) {
  const group = await prisma.optionGroup.findUnique({
    where: { id: groupId },
    include: { menuItem: { select: { id: true, slug: true } }, options: { select: { id: true, isActive: true } } },
  });
  if (!group) throw new ApiError(404, "GROUP_NOT_FOUND", "We could not find that option group.");
  return group;
}

export async function createOptionGroupAction(dishId: string, _state: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireApiRole(ADMIN_ROLES);
    const dish = await loadDish(dishId);
    const data = optionGroupSchema.parse(Object.fromEntries(form));
    const problem = optionGroupProblem({ ...data, activeOptions: 0 });
    if (problem) throw new ApiError(422, "BAD_GROUP", problem);
    const last = await prisma.optionGroup.aggregate({ where: { menuItemId: dishId }, _max: { sortOrder: true } });
    await prisma.optionGroup.create({ data: { ...data, required: data.min > 0, menuItemId: dishId, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
    revalidateMenu(dishId, dish.slug);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateOptionGroupAction(groupId: string, _state: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireApiRole(ADMIN_ROLES);
    const group = await loadGroup(groupId);
    const data = optionGroupSchema.parse(Object.fromEntries(form));
    const problem = optionGroupProblem({ ...data, activeOptions: group.options.filter((option) => option.isActive).length });
    if (problem) throw new ApiError(422, "BAD_GROUP", problem);
    await prisma.optionGroup.update({ where: { id: groupId }, data: { ...data, required: data.min > 0 } });
    revalidateMenu(group.menuItem.id, group.menuItem.slug);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteOptionGroupAction(groupId: string): Promise<ActionState> {
  try {
    await requireApiRole(ADMIN_ROLES);
    const group = await loadGroup(groupId);
    // Past orders keep their own copy of what was chosen, so nothing is lost with the group.
    await prisma.optionGroup.delete({ where: { id: groupId } });
    revalidateMenu(group.menuItem.id, group.menuItem.slug);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

async function requireIngredient(id: string) {
  const ingredient = await prisma.ingredient.findUnique({ where: { id }, select: { id: true } });
  if (!ingredient) throw new ApiError(422, "INGREDIENT_NOT_FOUND", "Choose an ingredient from the list.");
}

export async function createOptionAction(groupId: string, _state: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireApiRole(ADMIN_ROLES);
    const group = await loadGroup(groupId);
    const data = optionSchema.parse(Object.fromEntries(form));
    await requireIngredient(data.ingredientId);
    await prisma.option.create({ data: { ...data, optionGroupId: groupId, sortOrder: group.options.length } });
    revalidateMenu(group.menuItem.id, group.menuItem.slug);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

const optionIdSchema = z.string().min(1);

async function loadOptionWithGroup(optionId: string) {
  const option = await prisma.option.findUnique({ where: { id: optionIdSchema.parse(optionId) }, select: { id: true, isActive: true, optionGroupId: true } });
  if (!option) throw new ApiError(404, "OPTION_NOT_FOUND", "We could not find that option.");
  return { option, group: await loadGroup(option.optionGroupId) };
}

/** Taking away an option must not leave its group with fewer than guests are asked to pick. */
function assertCanLoseOption(group: Awaited<ReturnType<typeof loadGroup>>, optionId: string) {
  const left = group.options.filter((row) => row.isActive && row.id !== optionId).length;
  const problem = optionGroupProblem({ min: group.min, max: group.max, activeOptions: left });
  if (problem) throw new ApiError(422, "BAD_GROUP", `Guests must pick ${group.min} from ${group.name}, so this option has to stay. Lower the minimum first.`);
}

export async function updateOptionAction(optionId: string, _state: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireApiRole(ADMIN_ROLES);
    const { group } = await loadOptionWithGroup(optionId);
    const data = optionSchema.parse(Object.fromEntries(form));
    await requireIngredient(data.ingredientId);
    await prisma.option.update({ where: { id: optionId }, data });
    revalidateMenu(group.menuItem.id, group.menuItem.slug);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function setOptionActiveAction(optionId: string, isActive: boolean): Promise<ActionState> {
  try {
    await requireApiRole(ADMIN_ROLES);
    const { group } = await loadOptionWithGroup(optionId);
    if (!isActive) assertCanLoseOption(group, optionId);
    await prisma.option.update({ where: { id: optionId }, data: { isActive } });
    revalidateMenu(group.menuItem.id, group.menuItem.slug);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteOptionAction(optionId: string): Promise<ActionState> {
  try {
    await requireApiRole(ADMIN_ROLES);
    const { group } = await loadOptionWithGroup(optionId);
    assertCanLoseOption(group, optionId);
    await prisma.option.delete({ where: { id: optionId } });
    revalidateMenu(group.menuItem.id, group.menuItem.slug);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
