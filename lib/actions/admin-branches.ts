"use server";

import { revalidatePath } from "next/cache";
import { ADMIN_ROLES } from "../access";
import { parseBranchAdmin } from "../admin/branches";
import { ApiError } from "../api";
import { requireApiRole } from "../auth";
import { prisma } from "../db";
import { Prisma } from "../generated/prisma/client";
import { actionError, type ActionState } from "./helpers";

function revalidateBranches(slug?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/branches");
  revalidatePath("/branches");
  revalidatePath("/checkout");
  revalidatePath("/contact");
  if (slug) revalidatePath(`/branches/${slug}`);
}

export async function updateBranchAction(branchId: string, _state: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireApiRole(ADMIN_ROLES);
    const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { slug: true } });
    if (!branch) throw new ApiError(404, "BRANCH_NOT_FOUND", "We could not find that branch.");
    const data = parseBranchAdmin(form);
    await prisma.branch.update({ where: { id: branchId }, data: { ...data, deliveryPolygon: data.deliveryPolygon ?? Prisma.DbNull } });
    revalidateBranches(branch.slug);
    revalidatePath(`/admin/branches/${branchId}`);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

/** The rollback switch. The orders service checks this on every new order, so it applies at once. */
export async function setOnlineOrderingAction(branchId: string, open: boolean): Promise<ActionState> {
  try {
    await requireApiRole(ADMIN_ROLES);
    const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { slug: true } });
    if (!branch) throw new ApiError(404, "BRANCH_NOT_FOUND", "We could not find that branch.");
    await prisma.branch.update({ where: { id: branchId }, data: { onlineOrderingOpen: open } });
    revalidateBranches(branch.slug);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

/** Every branch at once, for launch morning and for the rollback plan. */
export async function setAllOnlineOrderingAction(open: boolean): Promise<ActionState> {
  try {
    await requireApiRole(ADMIN_ROLES);
    await prisma.branch.updateMany({ data: { onlineOrderingOpen: open } });
    revalidateBranches();
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
