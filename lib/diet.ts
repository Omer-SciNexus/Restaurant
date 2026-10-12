// Diet tags and allergens are worked out from ingredients, so a dish can never be
// labelled vegan while containing an animal product. When in doubt, no claim is made.

import { type Allergen, type Diet } from "./domain";

export type IngredientFacts = {
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
  allergens: readonly Allergen[];
  mayContain: readonly Allergen[];
};

export type DishFacts = {
  diets: Diet[];
  allergens: Allergen[];
  mayContain: Allergen[];
};

const ANIMAL_ALLERGENS: readonly Allergen[] = ["MILK", "EGGS", "FISH", "SHELLFISH"];
const MEAT_ALLERGENS: readonly Allergen[] = ["FISH", "SHELLFISH"];
const NUTS: readonly Allergen[] = ["TREE_NUTS", "PEANUTS"];

export function deriveFacts(ingredients: readonly IngredientFacts[]): DishFacts {
  const allergens = new Set<Allergen>();
  const mayContain = new Set<Allergen>();
  for (const ingredient of ingredients) {
    ingredient.allergens.forEach((a) => allergens.add(a));
    ingredient.mayContain.forEach((a) => mayContain.add(a));
  }
  // "Contains" outranks "may contain", so each allergen is listed once.
  allergens.forEach((a) => mayContain.delete(a));

  const hasAny = (set: Set<Allergen>, list: readonly Allergen[]) => list.some((a) => set.has(a));
  const diets: Diet[] = [];
  // A dish with no ingredient data gets no claims at all.
  if (ingredients.length > 0) {
    if (ingredients.every((i) => i.isVegan) && !hasAny(allergens, ANIMAL_ALLERGENS)) diets.push("VEGAN");
    if (ingredients.every((i) => i.isVegetarian) && !hasAny(allergens, MEAT_ALLERGENS)) diets.push("VEGETARIAN");
    if (ingredients.every((i) => i.isGlutenFree) && !allergens.has("WHEAT") && !mayContain.has("WHEAT")) {
      diets.push("GLUTEN_FREE");
    }
    if (!allergens.has("MILK") && !mayContain.has("MILK")) diets.push("DAIRY_FREE");
    if (!hasAny(allergens, NUTS) && !hasAny(mayContain, NUTS)) diets.push("NUT_FREE");
  }

  return { diets, allergens: [...allergens], mayContain: [...mayContain] };
}

export type DietProfile = {
  diets: readonly Diet[];
  allergies: readonly Allergen[];
};

export type ProfileConflicts = {
  /** Allergens the guest avoids that are in the dish. */
  contains: Allergen[];
  /** Allergens the guest avoids that the dish may contain through cross-contact. */
  mayContain: Allergen[];
  /** Diets the guest follows that the dish does not meet. */
  unmetDiets: Diet[];
};

export function checkProfile(facts: DishFacts, profile: DietProfile): ProfileConflicts {
  return {
    contains: profile.allergies.filter((a) => facts.allergens.includes(a)),
    mayContain: profile.allergies.filter((a) => facts.mayContain.includes(a)),
    unmetDiets: profile.diets.filter((d) => !facts.diets.includes(d)),
  };
}

export function hasConflict(conflicts: ProfileConflicts): boolean {
  return conflicts.contains.length + conflicts.mayContain.length + conflicts.unmetDiets.length > 0;
}
