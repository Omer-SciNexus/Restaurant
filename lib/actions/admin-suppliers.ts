"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ADMIN_ROLES } from "../access";
import { uniqueSlug } from "../admin/menu";
import { supplierSchema } from "../admin/suppliers";
import { ApiError } from "../api";
import { requireApiRole } from "../auth";
import { prisma } from "../db";
import { actionError, type ActionState } from "./helpers";

function revalidateSupplier(slug: string) {
  revalidatePath("/admin/suppliers");
  revalidatePath("/farms");
  revalidatePath(`/farms/${slug}`);
  revalidatePath("/dish/[slug]", "page");
}

/** Reads which ingredients come from this supplier, and checks they exist. */
async function ingredientIdsFrom(form: FormData): Promise<string[]> {
  const ids = [...new Set(form.getAll("ingredientIds").map(String))];
  const found = await prisma.ingredient.count({ where: { id: { in: ids } } });
  if (found !== ids.length) throw new ApiError(422, "INGREDIENT_NOT_FOUND", "Choose ingredients from the list.");
  return ids;
}

export async function createSupplierAction(_state: ActionState, form: FormData): Promise<ActionState> {
  let id: string;
  try {
    await requireApiRole(ADMIN_ROLES);
    const data = supplierSchema.parse(Object.fromEntries(form));
    const ingredientIds = await ingredientIdsFrom(form);
    const taken = await prisma.supplier.findMany({ select: { slug: true } });
    const supplier = await prisma.supplier.create({
      data: { ...data, slug: uniqueSlug(data.name, new Set(taken.map((row) => row.slug))), ingredients: { connect: ingredientIds.map((ingredientId) => ({ id: ingredientId })) } },
    });
    id = supplier.id;
    revalidateSupplier(supplier.slug);
  } catch (error) {
    return actionError(error);
  }
  redirect(`/admin/suppliers/${id}`);
}

/** The slug is not in the schema: a supplier's public address never changes once it has one. */
export async function updateSupplierAction(supplierId: string, _state: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireApiRole(ADMIN_ROLES);
    const data = supplierSchema.parse(Object.fromEntries(form));
    const ingredientIds = await ingredientIdsFrom(form);
    const existing = await prisma.supplier.findUnique({ where: { id: supplierId }, select: { slug: true } });
    if (!existing) throw new ApiError(404, "SUPPLIER_NOT_FOUND", "We could not find that supplier.");
    await prisma.supplier.update({ where: { id: supplierId }, data: { ...data, ingredients: { set: ingredientIds.map((id) => ({ id })) } } });
    revalidateSupplier(existing.slug);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteSupplierAction(supplierId: string): Promise<ActionState> {
  try {
    await requireApiRole(ADMIN_ROLES);
    const existing = await prisma.supplier.findUnique({ where: { id: supplierId }, select: { slug: true } });
    if (!existing) throw new ApiError(404, "SUPPLIER_NOT_FOUND", "We could not find that supplier.");
    // Ingredients stay in the menu; they simply stop naming a supplier.
    await prisma.$transaction([prisma.ingredient.updateMany({ where: { supplierId }, data: { supplierId: null } }), prisma.supplier.delete({ where: { id: supplierId } })]);
    revalidateSupplier(existing.slug);
  } catch (error) {
    return actionError(error);
  }
  redirect("/admin/suppliers");
}
