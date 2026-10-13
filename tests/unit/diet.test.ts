import { describe, expect, it } from "vitest";
import { checkProfile, deriveFacts, hasConflict, type IngredientFacts } from "@/lib/diet";

const plant = (overrides: Partial<IngredientFacts> = {}): IngredientFacts => ({
  isVegan: true,
  isVegetarian: true,
  isGlutenFree: true,
  allergens: [],
  mayContain: [],
  ...overrides,
});

const feta = plant({ isVegan: false, allergens: ["MILK"] });
const salmon = plant({ isVegan: false, isVegetarian: false, allergens: ["FISH"] });
const chicken = plant({ isVegan: false, isVegetarian: false });
const sourdough = plant({ isGlutenFree: false, allergens: ["WHEAT"] });
const almonds = plant({ allergens: ["TREE_NUTS"] });

describe("deriveFacts", () => {
  it("tags an all-plant dish with every diet", () => {
    expect(deriveFacts([plant(), plant()]).diets).toEqual(["VEGAN", "VEGETARIAN", "GLUTEN_FREE", "DAIRY_FREE", "NUT_FREE"]);
  });

  it("one animal product removes vegan", () => {
    const { diets } = deriveFacts([plant(), feta]);
    expect(diets).not.toContain("VEGAN");
    expect(diets).toContain("VEGETARIAN");
    expect(diets).not.toContain("DAIRY_FREE");
  });

  it("meat removes vegan and vegetarian", () => {
    const { diets } = deriveFacts([plant(), chicken]);
    expect(diets).not.toContain("VEGAN");
    expect(diets).not.toContain("VEGETARIAN");
  });

  it("never trusts a vegan flag that contradicts the allergens", () => {
    const mislabelled = plant({ allergens: ["MILK"] });
    expect(deriveFacts([mislabelled]).diets).not.toContain("VEGAN");
    const mislabelledFish = plant({ allergens: ["FISH"] });
    expect(deriveFacts([mislabelledFish]).diets).not.toContain("VEGETARIAN");
  });

  it("wheat removes gluten-free even if the flag says otherwise", () => {
    expect(deriveFacts([plant({ allergens: ["WHEAT"] })]).diets).not.toContain("GLUTEN_FREE");
    expect(deriveFacts([sourdough]).diets).not.toContain("GLUTEN_FREE");
  });

  it("a may-contain removes the matching free-from claim", () => {
    const { diets } = deriveFacts([plant({ mayContain: ["TREE_NUTS", "WHEAT", "MILK"] })]);
    expect(diets).not.toContain("NUT_FREE");
    expect(diets).not.toContain("GLUTEN_FREE");
    expect(diets).not.toContain("DAIRY_FREE");
    expect(diets).toContain("VEGAN");
  });

  it("collects allergens once, and contains outranks may contain", () => {
    const facts = deriveFacts([salmon, almonds, plant({ mayContain: ["FISH", "SESAME"] })]);
    expect(facts.allergens.sort()).toEqual(["FISH", "TREE_NUTS"]);
    expect(facts.mayContain).toEqual(["SESAME"]);
  });

  it("makes no claims when there is no ingredient data", () => {
    expect(deriveFacts([]).diets).toEqual([]);
  });
});

describe("checkProfile", () => {
  const facts = deriveFacts([salmon, plant({ mayContain: ["SESAME"] })]);

  it("flags an allergen in the dish and a cross-contact risk separately", () => {
    const conflicts = checkProfile(facts, { diets: [], allergies: ["FISH", "SESAME", "EGGS"] });
    expect(conflicts.contains).toEqual(["FISH"]);
    expect(conflicts.mayContain).toEqual(["SESAME"]);
    expect(hasConflict(conflicts)).toBe(true);
  });

  it("flags a diet the dish does not meet", () => {
    expect(checkProfile(facts, { diets: ["VEGAN"], allergies: [] }).unmetDiets).toEqual(["VEGAN"]);
  });

  it("passes a dish that fits", () => {
    expect(hasConflict(checkProfile(deriveFacts([plant()]), { diets: ["VEGAN"], allergies: ["FISH"] }))).toBe(false);
  });
});
