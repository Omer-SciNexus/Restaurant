import { describe, expect, it } from "vitest";
import { diffValues, ingredientValuesSchema, sameValues, type IngredientValues } from "@/lib/nutrition-review";

const base: IngredientValues = {
  kcal: 120,
  protein: 4,
  carbs: 21,
  fat: 2,
  fibre: 3,
  sugar: 1,
  salt: 0.02,
  allergens: [],
  mayContain: [],
  isVegan: true,
  isVegetarian: true,
  isGlutenFree: true,
};

describe("ingredientValuesSchema", () => {
  it("accepts sound values and coerces numbers typed into a form", () => {
    expect(ingredientValuesSchema.parse({ ...base, kcal: "120" }).kcal).toBe(120);
  });

  it("refuses negative values", () => {
    expect(ingredientValuesSchema.safeParse({ ...base, fat: -1 }).success).toBe(false);
  });

  it("refuses a vegan ingredient that is not vegetarian", () => {
    expect(ingredientValuesSchema.safeParse({ ...base, isVegetarian: false }).success).toBe(false);
  });

  it("refuses a vegan ingredient containing an animal allergen", () => {
    expect(ingredientValuesSchema.safeParse({ ...base, allergens: ["MILK"] }).success).toBe(false);
    expect(ingredientValuesSchema.safeParse({ ...base, isVegan: false, allergens: ["MILK"] }).success).toBe(true);
  });

  it("refuses a gluten-free ingredient containing wheat", () => {
    expect(ingredientValuesSchema.safeParse({ ...base, allergens: ["WHEAT"] }).success).toBe(false);
  });

  it("refuses macros that add up to more than the ingredient weighs", () => {
    expect(ingredientValuesSchema.safeParse({ ...base, protein: 60, carbs: 60 }).success).toBe(false);
  });

  it("allows a pure fat at exactly 100 g per 100 g", () => {
    expect(ingredientValuesSchema.safeParse({ ...base, protein: 0, carbs: 0, fat: 100, salt: 0 }).success).toBe(true);
  });
});

describe("sameValues", () => {
  it("ignores allergen order", () => {
    const a = { ...base, isVegan: false, allergens: ["MILK", "SOY"] as IngredientValues["allergens"] };
    const b = { ...base, isVegan: false, allergens: ["SOY", "MILK"] as IngredientValues["allergens"] };
    expect(sameValues(a, b)).toBe(true);
  });

  it("notices a changed value", () => {
    expect(sameValues(base, { ...base, salt: 0.03 })).toBe(false);
  });
});

describe("diffValues", () => {
  it("is empty when only verifying existing values", () => {
    expect(diffValues(base, { ...base })).toEqual([]);
  });

  it("lists just what changed, so a reviewer cannot miss an added allergen", () => {
    const diffs = diffValues(base, { ...base, kcal: 130, isVegan: false, allergens: ["MILK"] });
    expect(diffs).toEqual([
      { field: "kcal", before: "120 kcal", after: "130 kcal" },
      { field: "Allergens", before: "None", after: "Milk" },
      { field: "Vegan", before: "Yes", after: "No" },
    ]);
  });
});
