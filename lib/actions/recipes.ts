"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ADMIN_ROLES } from "../access";
import { ApiError } from "../api";
import { requireApiRole } from "../auth";
import { prisma } from "../db";
import { services, siteUrl } from "../env";
import { Prisma } from "../generated/prisma/client";
import { recipeFormSchema } from "../validation/recipes";
import { createDirectUpload, getUploadPlayback, VIDEO_NOT_CONFIGURED } from "../video";
import { actionError, type ActionState } from "./helpers";

// Every action here is for admins only, checked on the server on each call. A recipe holds
// ingredient ids and weights, never nutrition: those values stay on the ingredient, where any
// edit goes through the second-person approval queue.

function recipeFromForm(form: FormData) {
  const text = (name: string) => form.getAll(name).map(String);
  const ingredientIds = text("ingredientId");
  const grams = text("grams");
  const displayTexts = text("displayText");
  const stepTexts = text("stepText");
  const stepImages = text("stepImage");
  const stepStarts = text("stepVideoStart");
  const stepTimers = text("stepTimer");
  return {
    slug: form.get("slug"),
    title: form.get("title"),
    description: form.get("description"),
    prepMin: form.get("prepMin"),
    cookMin: form.get("cookMin"),
    difficulty: form.get("difficulty"),
    servings: form.get("servings"),
    status: form.get("status"),
    menuItemId: form.get("menuItemId") ?? "",
    thumbnailUrl: form.get("thumbnailUrl") ?? "",
    transcript: form.get("transcript") ?? "",
    ingredients: ingredientIds.map((ingredientId, index) => ({ ingredientId, grams: grams[index], displayText: displayTexts[index] })),
    steps: stepTexts.map((stepText, index) => ({ text: stepText, imageUrl: stepImages[index] ?? "", videoStartSec: stepStarts[index], timerSec: stepTimers[index] })),
  };
}

function revalidateRecipe(id: string, slug: string) {
  revalidatePath("/admin/recipes");
  revalidatePath(`/admin/recipes/${id}`);
  revalidatePath("/cook");
  revalidatePath(`/cook/${slug}`);
}

export async function saveRecipeAction(recipeId: string | null, _state: ActionState, form: FormData): Promise<ActionState> {
  let createdId: string | null = null;
  try {
    await requireApiRole(ADMIN_ROLES);
    const { ingredients, steps, ...fields } = recipeFormSchema.parse(recipeFromForm(form));

    const [knownIngredients, dish] = await Promise.all([
      prisma.ingredient.count({ where: { id: { in: ingredients.map((line) => line.ingredientId) } } }),
      fields.menuItemId ? prisma.menuItem.findUnique({ where: { id: fields.menuItemId }, select: { id: true } }) : null,
    ]);
    if (knownIngredients !== ingredients.length) throw new ApiError(422, "UNKNOWN_INGREDIENT", "One of those ingredients no longer exists. Please choose again.");
    if (fields.menuItemId && !dish) throw new ApiError(422, "UNKNOWN_DISH", "That dish no longer exists. Please choose again.");

    const id = await prisma.$transaction(async (tx) => {
      const row = recipeId ? await tx.recipe.update({ where: { id: recipeId }, data: fields }) : await tx.recipe.create({ data: fields });
      await tx.recipeIngredient.deleteMany({ where: { recipeId: row.id } });
      await tx.recipeIngredient.createMany({ data: ingredients.map((line) => ({ recipeId: row.id, ...line })) });
      await tx.recipeStep.deleteMany({ where: { recipeId: row.id } });
      await tx.recipeStep.createMany({ data: steps.map((step, index) => ({ recipeId: row.id, stepNo: index + 1, ...step })) });
      return row.id;
    });
    revalidateRecipe(id, fields.slug);
    if (!recipeId) createdId = id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Another recipe already uses that web address.", fields: { slug: ["Another recipe already uses this web address."] } };
    }
    return actionError(error);
  }
  // Outside the try block: redirect works by throwing.
  if (createdId) redirect(`/admin/recipes/${createdId}?created=1`);
  return { ok: true };
}

export type VideoUploadState = ActionState & { uploadUrl?: string };

/** Starts a direct upload. With no Mux keys this says so, and nothing is created. */
export async function createVideoUploadAction(recipeId: string): Promise<VideoUploadState> {
  try {
    await requireApiRole(ADMIN_ROLES);
    if (!services.mux) return { error: VIDEO_NOT_CONFIGURED };
    const recipe = await prisma.recipe.findUniqueOrThrow({ where: { id: recipeId }, select: { id: true, slug: true } });

    const video = await prisma.video.create({ data: { provider: "mux" } });
    const { uploadId, uploadUrl } = await createDirectUpload(video.id, siteUrl());
    await prisma.$transaction([
      prisma.video.update({ where: { id: video.id }, data: { uploadId } }),
      prisma.recipe.update({ where: { id: recipe.id }, data: { videoId: video.id } }),
    ]);
    revalidateRecipe(recipe.id, recipe.slug);
    return { ok: true, uploadUrl };
  } catch (error) {
    return actionError(error);
  }
}

/** Asks Mux whether a video has finished processing, in case a webhook was missed. */
export async function refreshVideoStatusAction(recipeId: string): Promise<ActionState> {
  try {
    await requireApiRole(ADMIN_ROLES);
    const recipe = await prisma.recipe.findUniqueOrThrow({ where: { id: recipeId }, select: { id: true, slug: true, video: { select: { id: true, uploadId: true, playbackId: true } } } });
    if (!recipe.video?.uploadId || recipe.video.playbackId) return { ok: true };
    const ready = await getUploadPlayback(recipe.video.uploadId);
    if (!ready) return { error: "Still processing. Please check again in a few minutes." };
    await prisma.video.update({ where: { id: recipe.video.id }, data: ready });
    revalidateRecipe(recipe.id, recipe.slug);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
