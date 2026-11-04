import { type Actor, canApproveNutritionChange } from "./access";
import { ApiError } from "./api";
import { prisma } from "./db";
import { type IngredientValues, ingredientValuesSchema, pickValues, sameValues } from "./nutrition-review";

/** Saves a proposed change. Nothing guests see moves until a second person approves it. */
export async function proposeNutritionChange(ingredientId: string, rawValues: unknown, actor: Actor, note?: string) {
  const values = ingredientValuesSchema.parse(rawValues);
  const ingredient = await prisma.ingredient.findUnique({ where: { id: ingredientId } });
  if (!ingredient) throw new ApiError(404, "INGREDIENT_NOT_FOUND", "We could not find that ingredient.");

  const pending = await prisma.nutritionChange.findFirst({ where: { ingredientId, status: "PENDING" }, select: { id: true } });
  if (pending) throw new ApiError(409, "CHANGE_PENDING", "This ingredient already has a change waiting for approval.");

  return prisma.nutritionChange.create({
    data: {
      ingredientId,
      oldValues: pickValues(ingredient as unknown as IngredientValues),
      newValues: values,
      changedById: actor.id,
      note: note?.trim() || null,
    },
  });
}

/** Applies the change and records who verified it. The author can never approve their own. */
export async function approveNutritionChange(changeId: string, actor: Actor) {
  const change = await prisma.nutritionChange.findUnique({ where: { id: changeId }, include: { ingredient: true } });
  if (!change) throw new ApiError(404, "CHANGE_NOT_FOUND", "We could not find that change.");
  if (!canApproveNutritionChange(actor, change.changedById)) {
    throw new ApiError(403, "SECOND_PERSON_REQUIRED", "A second person has to approve this change.");
  }

  // If the ingredient moved after this was proposed, the reviewer was looking at a stale comparison.
  const current = pickValues(change.ingredient as unknown as IngredientValues);
  if (!sameValues(current, change.oldValues as IngredientValues)) {
    throw new ApiError(409, "CHANGE_STALE", "This ingredient has changed since this was proposed. Please reject it and propose it again.");
  }
  const values = ingredientValuesSchema.parse(change.newValues);

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.nutritionChange.updateMany({
      where: { id: changeId, status: "PENDING" },
      data: { status: "APPROVED", approvedById: actor.id, reviewedAt: new Date() },
    });
    if (claimed.count === 0) throw new ApiError(409, "CHANGE_REVIEWED", "This change has already been reviewed.");
    await tx.ingredient.update({
      where: { id: change.ingredientId },
      data: { ...values, verifiedById: actor.id, verifiedAt: new Date() },
    });
  });
}

export async function rejectNutritionChange(changeId: string, actor: Actor) {
  const change = await prisma.nutritionChange.findUnique({ where: { id: changeId }, select: { id: true } });
  if (!change) throw new ApiError(404, "CHANGE_NOT_FOUND", "We could not find that change.");
  const claimed = await prisma.nutritionChange.updateMany({
    where: { id: changeId, status: "PENDING" },
    data: { status: "REJECTED", approvedById: actor.id, reviewedAt: new Date() },
  });
  if (claimed.count === 0) throw new ApiError(409, "CHANGE_REVIEWED", "This change has already been reviewed.");
}
