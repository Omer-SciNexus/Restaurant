"use server";

import { revalidatePath } from "next/cache";
import { ADMIN_ROLES } from "../access";
import { settingsSchema } from "../admin/settings";
import { requireApiRole } from "../auth";
import { prisma } from "../db";
import { actionError, type ActionState } from "./helpers";

export async function updateSettingsAction(_state: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireApiRole(ADMIN_ROLES);
    const data = settingsSchema.parse(Object.fromEntries(form));
    await prisma.settings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
    revalidatePath("/admin/settings");
    revalidatePath("/checkout");
    revalidatePath("/faq");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
