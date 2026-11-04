// What a nutrition or allergen change contains, and how to show it to the reviewer.

import { z } from "zod";
import { ALLERGENS, ALLERGEN_INFO, type Allergen } from "./domain";
import { NUTRIENT_KEYS } from "./nutrition";

const amount = z.coerce.number().min(0).max(1000);

export const ingredientValuesSchema = z
  .object({
    kcal: amount,
    protein: amount,
    carbs: amount,
    fat: amount,
    fibre: amount,
    sugar: amount,
    salt: amount,
    allergens: z.array(z.enum(ALLERGENS)),
    mayContain: z.array(z.enum(ALLERGENS)),
    isVegan: z.boolean(),
    isVegetarian: z.boolean(),
    isGlutenFree: z.boolean(),
  })
  // These contradictions would otherwise only surface as a wrong tag on a dish.
  .refine((v) => !v.isVegan || v.isVegetarian, { message: "A vegan ingredient must also be vegetarian.", path: ["isVegan"] })
  .refine((v) => !v.isVegan || !v.allergens.some((a) => a === "MILK" || a === "EGGS" || a === "FISH" || a === "SHELLFISH"), {
    message: "A vegan ingredient cannot contain milk, eggs, fish or shellfish.",
    path: ["isVegan"],
  })
  .refine((v) => !v.isGlutenFree || !v.allergens.includes("WHEAT"), { message: "A gluten-free ingredient cannot contain wheat.", path: ["isGlutenFree"] })
  .refine((v) => v.protein + v.carbs + v.fat + v.salt <= 100.5, { message: "Protein, carbs, fat and salt cannot add up to more than 100 g per 100 g.", path: ["protein"] });

export type IngredientValues = z.infer<typeof ingredientValuesSchema>;

export function pickValues(row: IngredientValues): IngredientValues {
  return {
    kcal: row.kcal,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    fibre: row.fibre,
    sugar: row.sugar,
    salt: row.salt,
    allergens: [...row.allergens],
    mayContain: [...row.mayContain],
    isVegan: row.isVegan,
    isVegetarian: row.isVegetarian,
    isGlutenFree: row.isGlutenFree,
  };
}

const sorted = (list: readonly Allergen[]) => [...list].sort();

export function sameValues(a: IngredientValues, b: IngredientValues): boolean {
  return (
    NUTRIENT_KEYS.every((key) => a[key] === b[key]) &&
    sorted(a.allergens).join() === sorted(b.allergens).join() &&
    sorted(a.mayContain).join() === sorted(b.mayContain).join() &&
    a.isVegan === b.isVegan &&
    a.isVegetarian === b.isVegetarian &&
    a.isGlutenFree === b.isGlutenFree
  );
}

export type ValueDiff = { field: string; before: string; after: string };

const allergenText = (list: readonly Allergen[]) => (list.length ? list.map((a) => ALLERGEN_INFO[a].label).join(", ") : "None");
const yesNo = (value: boolean) => (value ? "Yes" : "No");

/** The lines a reviewer checks: only what actually changed. */
export function diffValues(before: IngredientValues, after: IngredientValues): ValueDiff[] {
  const diffs: ValueDiff[] = [];
  const unit = (key: string) => (key === "kcal" ? " kcal" : " g");
  for (const key of NUTRIENT_KEYS) {
    if (before[key] !== after[key]) diffs.push({ field: key, before: `${before[key]}${unit(key)}`, after: `${after[key]}${unit(key)}` });
  }
  if (sorted(before.allergens).join() !== sorted(after.allergens).join()) {
    diffs.push({ field: "Allergens", before: allergenText(before.allergens), after: allergenText(after.allergens) });
  }
  if (sorted(before.mayContain).join() !== sorted(after.mayContain).join()) {
    diffs.push({ field: "May contain", before: allergenText(before.mayContain), after: allergenText(after.mayContain) });
  }
  if (before.isVegan !== after.isVegan) diffs.push({ field: "Vegan", before: yesNo(before.isVegan), after: yesNo(after.isVegan) });
  if (before.isVegetarian !== after.isVegetarian) diffs.push({ field: "Vegetarian", before: yesNo(before.isVegetarian), after: yesNo(after.isVegetarian) });
  if (before.isGlutenFree !== after.isGlutenFree) diffs.push({ field: "Gluten-free", before: yesNo(before.isGlutenFree), after: yesNo(after.isGlutenFree) });
  return diffs;
}
