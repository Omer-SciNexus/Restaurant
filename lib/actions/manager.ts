"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MANAGER_ROLES } from "../access";
import { parseBranchOperations } from "../admin/branches";
import { applyAssignment, loadPerson } from "../admin/people";
import { checkManagerAssignment, checkManagerRemoval, ROLES } from "../admin/roles";
import { ApiError } from "../api";
import { requireApiRole, requireBranchAccess } from "../auth";
import { prisma } from "../db";
import { Prisma } from "../generated/prisma/client";
import { actionError, type ActionState } from "./helpers";

// Every action here takes the branch from the form and checks it against the signed-in
// person, read fresh from the database. The role is checked by the rules, never trusted.

const branchIdSchema = z.string("We could not tell which branch this is.").min(1, "We could not tell which branch this is.");
const roleSchema = z.enum(["STAFF", "DRIVER"], "Choose staff or driver.");

function branchIdFrom(form: FormData): string {
  return branchIdSchema.parse(form.get("branchId") ?? undefined);
}

export async function updateBranchOperationsAction(_state: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requireApiRole(MANAGER_ROLES);
    const branchId = branchIdFrom(form);
    requireBranchAccess(actor, branchId);
    const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { slug: true } });
    if (!branch) throw new ApiError(404, "BRANCH_NOT_FOUND", "We could not find that branch.");
    const data = parseBranchOperations(form);
    await prisma.branch.update({ where: { id: branchId }, data: { ...data, deliveryPolygon: data.deliveryPolygon ?? Prisma.DbNull } });
    revalidatePath("/manager/branch");
    revalidatePath("/admin/branches");
    revalidatePath(`/admin/branches/${branchId}`);
    revalidatePath(`/branches/${branch.slug}`);
    revalidatePath("/checkout");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

/** Takes someone on by the email of their account. They need to have signed up first. */
export async function addPersonAction(_state: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requireApiRole(MANAGER_ROLES);
    const branchId = branchIdFrom(form);
    requireBranchAccess(actor, branchId);
    const { email, role } = z
      .object({ email: z.email("Enter the email of their account.").transform((value) => value.toLowerCase()), role: roleSchema })
      .parse(Object.fromEntries(form));
    const found = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!found) throw new ApiError(404, "USER_NOT_FOUND", "There is no account with that email. Ask them to sign up first, then add them here.");
    const target = await loadPerson(found.id);
    await applyAssignment(target, checkManagerAssignment(actor, branchId, target, role));
    revalidatePath("/manager/branch");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function changePersonRoleAction(userId: string, _state: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requireApiRole(MANAGER_ROLES);
    const branchId = branchIdFrom(form);
    requireBranchAccess(actor, branchId);
    const { role } = z.object({ role: z.enum(ROLES, "Choose staff or driver.") }).parse(Object.fromEntries(form));
    const target = await loadPerson(userId);
    // The rules refuse anything but staff or driver, including a tampered manager or admin.
    await applyAssignment(target, checkManagerAssignment(actor, branchId, target, role));
    revalidatePath("/manager/branch");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function removePersonAction(userId: string, _state: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requireApiRole(MANAGER_ROLES);
    const branchId = branchIdFrom(form);
    requireBranchAccess(actor, branchId);
    const target = await loadPerson(userId);
    await applyAssignment(target, checkManagerRemoval(actor, branchId, target));
    revalidatePath("/manager/branch");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
