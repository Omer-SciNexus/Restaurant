// Dish, bowl and recipe totals, always calculated from per-100 g ingredient data.

export const NUTRIENT_KEYS = ["kcal", "protein", "carbs", "fat", "fibre", "sugar", "salt"] as const;
export type NutrientKey = (typeof NUTRIENT_KEYS)[number];
export type Nutrition = Record<NutrientKey, number>;

export type NutritionLine = {
  grams: number;
  per100g: Nutrition;
};

export const ZERO_NUTRITION: Nutrition = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, sugar: 0, salt: 0 };

/** Sums ingredient lines. Values stay unrounded so totals never drift; round only to display. */
export function totalNutrition(lines: readonly NutritionLine[]): Nutrition {
  const total = { ...ZERO_NUTRITION };
  for (const { grams, per100g } of lines) {
    if (!(grams >= 0)) throw new RangeError(`Invalid ingredient weight: ${grams}`);
    for (const key of NUTRIENT_KEYS) total[key] += (per100g[key] * grams) / 100;
  }
  return total;
}

export function addNutrition(a: Nutrition, b: Nutrition): Nutrition {
  const sum = { ...a };
  for (const key of NUTRIENT_KEYS) sum[key] += b[key];
  return sum;
}

export function scaleNutrition(n: Nutrition, factor: number): Nutrition {
  const scaled = { ...n };
  for (const key of NUTRIENT_KEYS) scaled[key] *= factor;
  return scaled;
}

/** Display rounding: whole kcal, one decimal for grams, two for salt. */
export function roundNutrition(n: Nutrition): Nutrition {
  const oneDecimal = (value: number) => Math.round(value * 10) / 10;
  return {
    kcal: Math.round(n.kcal),
    protein: oneDecimal(n.protein),
    carbs: oneDecimal(n.carbs),
    fat: oneDecimal(n.fat),
    fibre: oneDecimal(n.fibre),
    sugar: oneDecimal(n.sugar),
    salt: Math.round(n.salt * 100) / 100,
  };
}
