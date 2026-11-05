"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ADMIN_ROLES } from "../access";
import { applyAssignment, loadPerson } from "../admin/people";
import { checkAdminAssignment, ROLES } from "../admin/roles";
import { requireApiRole } from "../auth";
import { actionError, type ActionState } from "./helpers";

const assignmentSchema = z.object({
  role: z.enum(ROLES, "Choose a role."),
  branchId: z
    .string()
    .optional()
    .transform((value) => value || null),
});

export async function assignRoleAction(userId: string, _state: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requireApiRole(ADMIN_ROLES);
    const { role, branchId } = assignmentSchema.parse(Object.fromEntries(form));
    const target = await loadPerson(userId);
    await applyAssignment(target, checkAdminAssignment(actor, target, role, branchId));
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
