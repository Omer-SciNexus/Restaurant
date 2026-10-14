import { describe, expect, it } from "vitest";
import { addNutrition, roundNutrition, scaleNutrition, totalNutrition, ZERO_NUTRITION, type Nutrition } from "@/lib/nutrition";

const quinoa: Nutrition = { kcal: 120, protein: 4.4, carbs: 21.3, fat: 1.9, fibre: 2.8, sugar: 0.9, salt: 0.02 };
const oil: Nutrition = { kcal: 884, protein: 0, carbs: 0, fat: 100, fibre: 0, sugar: 0, salt: 0 };

describe("totalNutrition", () => {
  it("matches a hand calculation: 150 g quinoa + 10 g olive oil", () => {
    const total = totalNutrition([
      { grams: 150, per100g: quinoa },
      { grams: 10, per100g: oil },
    ]);
    // kcal: 120 * 1.5 + 884 * 0.1 = 180 + 88.4 = 268.4
    expect(total.kcal).toBeCloseTo(268.4, 6);
    // fat: 1.9 * 1.5 + 100 * 0.1 = 2.85 + 10 = 12.85
    expect(total.fat).toBeCloseTo(12.85, 6);
    expect(total.protein).toBeCloseTo(6.6, 6);
  });

  it("returns zeros for no ingredients", () => {
    expect(totalNutrition([])).toEqual(ZERO_NUTRITION);
  });

  it("rejects a negative or missing weight instead of hiding bad data", () => {
    expect(() => totalNutrition([{ grams: -5, per100g: oil }])).toThrow(RangeError);
    expect(() => totalNutrition([{ grams: Number.NaN, per100g: oil }])).toThrow(RangeError);
  });
});

describe("helpers", () => {
  it("adds and scales", () => {
    expect(addNutrition(quinoa, quinoa).kcal).toBe(240);
    expect(scaleNutrition(quinoa, 0.5).kcal).toBe(60);
  });

  it("rounds only for display", () => {
    const rounded = roundNutrition({ kcal: 268.4, protein: 6.64, carbs: 31.95, fat: 12.85, fibre: 4.2, sugar: 1.35, salt: 0.034 });
    expect(rounded).toEqual({ kcal: 268, protein: 6.6, carbs: 32, fat: 12.9, fibre: 4.2, sugar: 1.4, salt: 0.03 });
  });
});
