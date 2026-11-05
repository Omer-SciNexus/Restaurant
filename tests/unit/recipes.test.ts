import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DISHES } from "@/prisma/seed-data/menu";
import { RECIPES } from "@/prisma/seed-data/recipes";
import {
  chaptersFromSteps,
  clampServings,
  filterHref,
  filterRecipes,
  formatGrams,
  formatIngredient,
  formatOunces,
  formatQuantity,
  formatTimer,
  gramsToOunces,
  newTimer,
  NO_FILTERS,
  parseDisplayText,
  pauseTimer,
  recipeCategory,
  resetTimer,
  scaleFactor,
  startTimer,
  tickTimer,
  type RecipeSummary,
} from "@/lib/recipe-rules";
import { parseRecipeFilters, recipeFormSchema } from "@/lib/validation/recipes";

const quinoa = { displayText: "1 2/3 cups cooked quinoa", grams: 300 };

describe("servings", () => {
  it("keeps the scaler between 1 and 6 people", () => {
    expect(clampServings(0)).toBe(1);
    expect(clampServings(4)).toBe(4);
    expect(clampServings(99)).toBe(6);
    expect(clampServings(Number.NaN)).toBe(1);
  });

  it("works out the factor from what the recipe serves", () => {
    expect(scaleFactor(2, 4)).toBe(2);
    expect(scaleFactor(2, 1)).toBe(0.5);
    expect(scaleFactor(4, 6)).toBe(1.5);
    expect(() => scaleFactor(0, 2)).toThrow(RangeError);
  });
});

describe("parseDisplayText", () => {
  it("reads whole numbers, fractions and mixed numbers", () => {
    expect(parseDisplayText("2 eggs").quantity).toBe(2);
    expect(parseDisplayText("1/2 lime, in wedges").quantity).toBe(0.5);
    expect(parseDisplayText("1 1/2 tbsp honey").quantity).toBe(1.5);
    expect(parseDisplayText("0.5 cup rice").quantity).toBe(0.5);
  });

  it("separates the unit from the rest of the text", () => {
    const parsed = parseDisplayText("1 2/3 cups cooked quinoa");
    expect(parsed.unit?.many).toBe("cups");
    expect(parsed.rest).toBe("cooked quinoa");
    expect(parseDisplayText("1 handful of rocket").rest).toBe("rocket");
  });

  it("leaves text with no amount alone", () => {
    expect(parseDisplayText("Salt, to taste")).toEqual({ quantity: null, unit: null, rest: "Salt, to taste" });
  });
});

describe("formatQuantity", () => {
  it("snaps to fractions on a measuring cup", () => {
    expect(formatQuantity(1)).toBe("1");
    expect(formatQuantity(1.5)).toBe("1 1/2");
    expect(formatQuantity(5 / 3)).toBe("1 2/3");
    expect(formatQuantity(0.34)).toBe("1/3");
    expect(formatQuantity(2.99)).toBe("3");
  });

  it("never rounds a real amount down to nothing", () => {
    expect(formatQuantity(0.01)).toBe("1/8");
    expect(formatQuantity(0)).toBe("0");
  });
});

describe("formatIngredient in US units", () => {
  it("shows the original text at the recipe's own size", () => {
    expect(formatIngredient(quinoa, 1, "us")).toBe("1 2/3 cups cooked quinoa");
  });

  it("scales up and down, with the unit in the right form", () => {
    expect(formatIngredient(quinoa, 2, "us")).toBe("3 1/3 cups cooked quinoa");
    expect(formatIngredient(quinoa, 0.5, "us")).toBe("3/4 cup cooked quinoa");
    expect(formatIngredient({ displayText: "1 cup rice", grams: 195 }, 3, "us")).toBe("3 cups rice");
    expect(formatIngredient({ displayText: "2 tbsp pumpkin seeds", grams: 20 }, 0.5, "us")).toBe("1 tbsp pumpkin seeds");
  });

  it("makes counted things plural or singular", () => {
    expect(formatIngredient({ displayText: "2 eggs", grams: 110 }, 0.5, "us")).toBe("1 egg");
    expect(formatIngredient({ displayText: "1 lemon, juiced", grams: 60 }, 3, "us")).toBe("3 lemons, juiced");
    expect(formatIngredient({ displayText: "2 radishes, thinly sliced", grams: 30 }, 0.5, "us")).toBe("1 radish, thinly sliced");
    expect(formatIngredient({ displayText: "1 medium sweet potato, cubed", grams: 180 }, 1.5, "us")).toBe("1 1/2 medium sweet potatoes, cubed");
  });

  it("does not touch the words after the comma", () => {
    expect(formatIngredient({ displayText: "1 avocado, not a lemon", grams: 100 }, 2, "us")).toBe("2 avocados, not a lemon");
  });

  it("converts weights and lines with no measure to ounces", () => {
    expect(formatIngredient({ displayText: "100 g rice", grams: 100 }, 1, "us")).toBe("3 1/2 oz rice");
    expect(formatIngredient({ displayText: "Mixed greens", grams: 56.7 }, 1, "us")).toBe("2 oz Mixed greens");
    expect(formatIngredient({ displayText: "Salt, to taste", grams: 0 }, 1, "us")).toBe("Salt, to taste");
  });
});

describe("formatIngredient in metric", () => {
  it("uses the weighed grams, scaled", () => {
    expect(formatIngredient(quinoa, 1, "metric")).toBe("300 g cooked quinoa");
    expect(formatIngredient(quinoa, 2, "metric")).toBe("600 g cooked quinoa");
    expect(formatIngredient(quinoa, 0.5, "metric")).toBe("150 g cooked quinoa");
  });

  it("drops the US measure and uses the singular noun", () => {
    expect(formatIngredient({ displayText: "2 tbsp pumpkin seeds", grams: 20 }, 1, "metric")).toBe("20 g pumpkin seeds");
    expect(formatIngredient({ displayText: "2 lemons, juiced", grams: 120 }, 1, "metric")).toBe("120 g lemon, juiced");
  });

  it("keeps a line with no weight as written", () => {
    expect(formatIngredient({ displayText: "Salt, to taste", grams: 0 }, 2, "metric")).toBe("Salt, to taste");
  });
});

describe("unit conversion", () => {
  it("converts grams to ounces", () => {
    expect(gramsToOunces(28.3495)).toBeCloseTo(1, 6);
    expect(gramsToOunces(453.592)).toBeCloseTo(16, 2);
  });

  it("reads like a kitchen scale", () => {
    expect(formatGrams(8)).toBe("8 g");
    expect(formatGrams(0.2)).toBe("1 g");
    expect(formatGrams(63)).toBe("63 g");
    expect(formatGrams(452)).toBe("450 g");
    expect(formatGrams(1250)).toBe("1.25 kg");
    expect(formatOunces(56.7)).toBe("2 oz");
    expect(formatOunces(680)).toBe("1 1/2 lb");
  });
});

describe("recipeCategory", () => {
  it("maps menu sections to the plan's five groups", () => {
    expect(recipeCategory("salads")).toBe("bowls-salads");
    expect(recipeCategory("breakfast")).toBe("breakfast");
    expect(recipeCategory("pasta")).toBe("natural-classics");
    expect(recipeCategory("mexican")).toBe("natural-classics");
    expect(recipeCategory("drinks")).toBe("drinks");
    expect(recipeCategory("sweets")).toBe("treats");
    expect(recipeCategory(null)).toBeNull();
  });
});

describe("library filters", () => {
  const recipe = (overrides: Partial<RecipeSummary>): RecipeSummary => ({
    id: "r",
    slug: "r",
    title: "Recipe",
    description: "",
    prepMin: 5,
    cookMin: 5,
    totalMin: 10,
    difficulty: "EASY",
    servings: 2,
    thumbnailUrl: null,
    hasVideo: false,
    category: "breakfast",
    ingredientNames: [],
    facts: { diets: [], allergens: [], mayContain: [] },
    nutrition: { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, sugar: 0, salt: 0 },
    verified: false,
    ...overrides,
  });
  const quick = recipe({ slug: "quick", totalMin: 10, facts: { diets: ["VEGAN"], allergens: [], mayContain: [] }, ingredientNames: ["Oat milk"] });
  const long = recipe({ slug: "long", totalMin: 50, difficulty: "MEDIUM", category: "treats", title: "Slow Stew" });

  it("filters by each kind of filter, and all of them together", () => {
    const slugs = (filters: Partial<typeof NO_FILTERS>) => filterRecipes([quick, long], { ...NO_FILTERS, ...filters }).map((r) => r.slug);
    expect(slugs({})).toEqual(["quick", "long"]);
    expect(slugs({ diets: ["VEGAN"] })).toEqual(["quick"]);
    expect(slugs({ time: 15 })).toEqual(["quick"]);
    expect(slugs({ difficulty: "MEDIUM" })).toEqual(["long"]);
    expect(slugs({ category: "treats" })).toEqual(["long"]);
    expect(slugs({ query: "slow stew" })).toEqual(["long"]);
    expect(slugs({ query: "oat" })).toEqual(["quick"]);
    expect(slugs({ time: 15, category: "treats" })).toEqual([]);
  });

  it("reads filters from a URL and ignores anything it does not know", () => {
    expect(parseRecipeFilters({ diet: ["vegan", "nonsense"], time: "30", difficulty: "easy", category: "drinks", q: " oats " })).toEqual({
      diets: ["VEGAN"],
      time: 30,
      difficulty: "EASY",
      category: "drinks",
      query: "oats",
    });
    expect(parseRecipeFilters({ diet: "vegan" }).diets).toEqual(["VEGAN"]);
    expect(parseRecipeFilters({ time: "7", difficulty: "impossible", category: "x" })).toEqual(NO_FILTERS);
  });

  it("writes filters back as a link", () => {
    expect(filterHref("/cook", NO_FILTERS)).toBe("/cook");
    expect(filterHref("/cook", { ...NO_FILTERS, diets: ["GLUTEN_FREE"], time: 15, query: "oat milk" })).toBe("/cook?diet=gluten-free&time=15&q=oat+milk");
  });
});

describe("chaptersFromSteps", () => {
  const steps = [
    { stepNo: 1, text: "Boil the water. Then wait.", videoStartSec: 0 },
    { stepNo: 2, text: "No chapter here.", videoStartSec: null },
    { stepNo: 3, text: "Serve.", videoStartSec: 90 },
  ];

  it("makes a chapter for each timed step, ending where the next starts", () => {
    expect(chaptersFromSteps(steps, 200)).toEqual([
      { startTime: 0, endTime: 90, value: "Step 1: Boil the water." },
      { startTime: 90, endTime: 200, value: "Step 3: Serve." },
    ]);
  });

  it("leaves the last chapter open without a duration, and is empty with no start times", () => {
    expect(chaptersFromSteps(steps).at(-1)).toEqual({ startTime: 90, value: "Step 3: Serve." });
    expect(chaptersFromSteps([{ stepNo: 1, text: "Mix.", videoStartSec: null }])).toEqual([]);
  });
});

describe("step timers", () => {
  it("counts down from a fixed end time, even if ticks are late", () => {
    const running = startTimer(newTimer(60), 1_000);
    expect(running.status).toBe("running");
    expect(tickTimer(running, 11_000).remainingSec).toBe(50);
    // A throttled background tab wakes up 45 seconds late and is still right.
    expect(tickTimer(running, 46_000).remainingSec).toBe(15);
  });

  it("finishes at zero", () => {
    const done = tickTimer(startTimer(newTimer(10), 0), 10_000);
    expect(done).toMatchObject({ status: "done", remainingSec: 0, endsAt: null });
  });

  it("pauses, resumes where it left off, and resets", () => {
    const paused = pauseTimer(startTimer(newTimer(60), 0), 20_000);
    expect(paused).toMatchObject({ status: "paused", remainingSec: 40, endsAt: null });
    expect(tickTimer(paused, 90_000).remainingSec).toBe(40);
    const resumed = startTimer(paused, 90_000);
    expect(tickTimer(resumed, 100_000).remainingSec).toBe(30);
    expect(resetTimer(resumed)).toEqual(newTimer(60));
  });

  it("restarts from the full time once finished", () => {
    const done = tickTimer(startTimer(newTimer(10), 0), 20_000);
    expect(startTimer(done, 50_000)).toMatchObject({ status: "running", remainingSec: 10 });
  });

  it("formats minutes and hours", () => {
    expect(formatTimer(65)).toBe("1:05");
    expect(formatTimer(3600)).toBe("1:00:00");
    expect(formatTimer(0)).toBe("0:00");
  });
});

describe("the admin form schema", () => {
  const valid = {
    slug: "a-recipe",
    title: "A recipe",
    description: "A description that is long enough.",
    prepMin: "5",
    cookMin: "10",
    difficulty: "EASY",
    servings: "2",
    status: "DRAFT",
    menuItemId: "",
    thumbnailUrl: "/images/dishes/kombucha.png",
    transcript: "",
    ingredients: [{ ingredientId: "i1", grams: "100", displayText: "1 cup rice" }],
    steps: [{ text: "Cook it.", imageUrl: "", videoStartSec: "", timerSec: "60" }],
  };

  it("accepts a valid recipe and treats blanks as empty", () => {
    const parsed = recipeFormSchema.parse(valid);
    expect(parsed.menuItemId).toBeNull();
    expect(parsed.steps[0]).toEqual({ text: "Cook it.", imageUrl: null, videoStartSec: null, timerSec: 60 });
  });

  it("refuses the same ingredient twice, servings over 6, and a path outside /images", () => {
    expect(recipeFormSchema.safeParse({ ...valid, ingredients: [valid.ingredients[0], valid.ingredients[0]] }).success).toBe(false);
    expect(recipeFormSchema.safeParse({ ...valid, servings: "7" }).success).toBe(false);
    expect(recipeFormSchema.safeParse({ ...valid, thumbnailUrl: "https://example.com/x.png" }).success).toBe(false);
    expect(recipeFormSchema.safeParse({ ...valid, thumbnailUrl: "/images/../secret.png" }).success).toBe(false);
  });

  it("refuses chapter times that go backwards", () => {
    const step = (videoStartSec: string) => ({ text: "A step.", imageUrl: "", videoStartSec, timerSec: "" });
    expect(recipeFormSchema.safeParse({ ...valid, steps: [step("10"), step("5")] }).success).toBe(false);
    expect(recipeFormSchema.safeParse({ ...valid, steps: [step("5"), step(""), step("10")] }).success).toBe(true);
  });
});

describe("the seeded recipes", () => {
  it("follow the plan's split of 12", () => {
    expect(RECIPES).toHaveLength(12);
    const groups = RECIPES.map((recipe) => recipeCategory(DISHES.find((dish) => dish.slug === recipe.dish)?.category));
    const count = (category: string) => groups.filter((group) => group === category).length;
    expect([count("bowls-salads"), count("breakfast"), count("natural-classics"), count("drinks"), count("treats")]).toEqual([4, 2, 2, 2, 2]);
  });

  it("use exactly the ingredient keys of their dish, and a photo that exists", () => {
    for (const recipe of RECIPES) {
      const dish = DISHES.find((entry) => entry.slug === recipe.dish);
      expect(dish, recipe.slug).toBeDefined();
      expect(Object.keys(recipe.ingredients).sort(), recipe.slug).toEqual(dish!.ingredients.map(([key]) => key).sort());
      expect(existsSync(`public/images/dishes/${dish!.slug}.png`), recipe.slug).toBe(true);
    }
  });

  it("start every ingredient with an amount the scaler can read", () => {
    for (const recipe of RECIPES) {
      for (const text of Object.values(recipe.ingredients)) {
        expect(parseDisplayText(text).quantity, `${recipe.slug}: ${text}`).not.toBeNull();
      }
    }
  });
});
