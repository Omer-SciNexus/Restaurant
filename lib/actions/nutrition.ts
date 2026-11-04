"use server";

import { revalidatePath } from "next/cache";
import { ADMIN_ROLES } from "../access";
import { requireApiRole } from "../auth";
import { ALLERGENS, type Allergen } from "../domain";
import { approveNutritionChange, proposeNutritionChange, rejectNutritionChange } from "../nutrition-changes";
import { NUTRIENT_KEYS } from "../nutrition";
import { actionError, type ActionState } from "./helpers";

function valuesFromForm(form: FormData) {
  const values: Record<string, unknown> = {};
  for (const key of NUTRIENT_KEYS) values[key] = form.get(key);
  const list = (name: string) => form.getAll(name).filter((v): v is Allergen => ALLERGENS.includes(v as Allergen));
  values.allergens = list("allergens");
  values.mayContain = list("mayContain");
  values.isVegan = form.get("isVegan") === "on";
  values.isVegetarian = form.get("isVegetarian") === "on";
  values.isGlutenFree = form.get("isGlutenFree") === "on";
  return values;
}

export async function proposeChangeAction(ingredientId: string, _state: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await requireApiRole(ADMIN_ROLES);
    await proposeNutritionChange(ingredientId, valuesFromForm(form), user, String(form.get("note") ?? ""));
    revalidatePath("/admin/approvals");
    revalidatePath(`/admin/ingredients/${ingredientId}`);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function reviewChangeAction(changeId: string, decision: "approve" | "reject"): Promise<ActionState> {
  try {
    const user = await requireApiRole(ADMIN_ROLES);
    if (decision === "approve") await approveNutritionChange(changeId, user);
    else await rejectNutritionChange(changeId, user);
    revalidatePath("/admin/approvals");
    revalidatePath("/admin/ingredients");
    revalidatePath("/menu");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
