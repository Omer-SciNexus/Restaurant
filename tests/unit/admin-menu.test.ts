import { describe, expect, it } from "vitest";
import {
  activationProblem,
  categorySchema,
  deleteProblem,
  dishSchema,
  isPhotoPath,
  optionGroupProblem,
  optionSchema,
  recipeSchema,
  seasonalDates,
  slugify,
  uniqueSlug,
} from "@/lib/admin/menu";

describe("slugify", () => {
  it("makes a clean address from a name", () => {
    expect(slugify("Harvest Quinoa Bowl")).toBe("harvest-quinoa-bowl");
    expect(slugify("  Açaí & Berry Bowl! ")).toBe("acai-and-berry-bowl");
    expect(slugify("Wild Mushroom and Rocket")).toBe("wild-mushroom-and-rocket");
  });

  it("always returns something", () => {
    expect(slugify("!!!")).toBe("item");
  });

  it("stays short, with no trailing dash", () => {
    const slug = slugify(`${"a".repeat(59)} b c`);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("uniqueSlug", () => {
  it("adds a number only when the name is taken", () => {
    expect(uniqueSlug("Green Juice", new Set())).toBe("green-juice");
    expect(uniqueSlug("Green Juice", new Set(["green-juice"]))).toBe("green-juice-2");
    expect(uniqueSlug("Green Juice", new Set(["green-juice", "green-juice-2"]))).toBe("green-juice-3");
  });
});

describe("isPhotoPath", () => {
  it("accepts paths under /images", () => {
    expect(isPhotoPath("/images/dishes/green-juice.png")).toBe(true);
    expect(isPhotoPath("/images/farms/farm-orchard.jpg")).toBe(true);
  });

  it.each(["", "green-juice.png", "/public/x.png", "https://example.com/a.png", "/images/../secret.png", "//images/a.png", "/images/a.exe", "javascript:alert(1)"])("refuses %j", (path) => {
    expect(isPhotoPath(path)).toBe(false);
  });
});

describe("categorySchema", () => {
  it("accepts a window, or none", () => {
    expect(categorySchema.parse({ name: "Breakfast", sortOrder: "3", servedFrom: "07:00", servedUntil: "11:00" })).toMatchObject({ sortOrder: 3, servedFrom: "07:00" });
    expect(categorySchema.parse({ name: "Salads", sortOrder: "1", servedFrom: "", servedUntil: "" })).toMatchObject({ servedFrom: null, servedUntil: null });
  });

  it("refuses a bad window", () => {
    expect(categorySchema.safeParse({ name: "Breakfast", sortOrder: "3", servedFrom: "11:00", servedUntil: "07:00" }).success).toBe(false);
    expect(categorySchema.safeParse({ name: "Breakfast", sortOrder: "3", servedFrom: "07:00", servedUntil: "" }).success).toBe(false);
  });
});

describe("seasonalDates", () => {
  it("clears the dates when a dish is not seasonal", () => {
    expect(seasonalDates(false, "2026-01-01", "2026-02-01")).toEqual({ availableFrom: null, availableTo: null });
  });

  it("runs from the start of the first day to the end of the last", () => {
    const result = seasonalDates(true, "2026-09-01", "2027-03-31");
    expect(result).toEqual({ availableFrom: new Date("2026-09-01T00:00:00.000Z"), availableTo: new Date("2027-03-31T23:59:59.999Z") });
  });

  it("allows a single-day season", () => {
    expect(seasonalDates(true, "2026-09-01", "2026-09-01")).not.toHaveProperty("error");
  });

  it("refuses missing, impossible and backwards dates", () => {
    expect(seasonalDates(true, "", "2026-09-01")).toHaveProperty("error");
    expect(seasonalDates(true, "2026-02-30", "2026-03-01")).toHaveProperty("error");
    expect(seasonalDates(true, "2026-10-01", "2026-09-01")).toHaveProperty("error");
  });
});

describe("dishSchema", () => {
  const valid = {
    name: "Winter Soup",
    description: "A warming soup of roasted vegetables.",
    categoryId: "cat",
    basePriceCents: "9.50",
    imageUrl: "/images/dishes/winter-soup.png",
  };

  it("turns the price into cents on the server", () => {
    expect(dishSchema.parse(valid).basePriceCents).toBe(950);
  });

  it("has no way to set a slug", () => {
    expect(dishSchema.parse({ ...valid, slug: "new-address" })).not.toHaveProperty("slug");
  });

  it("refuses a free dish, a bad photo and half a season", () => {
    expect(dishSchema.safeParse({ ...valid, basePriceCents: "0" }).success).toBe(false);
    expect(dishSchema.safeParse({ ...valid, basePriceCents: "9.999" }).success).toBe(false);
    expect(dishSchema.safeParse({ ...valid, imageUrl: "https://example.com/a.png" }).success).toBe(false);
    expect(dishSchema.safeParse({ ...valid, isSeasonal: "on", availableFrom: "2026-09-01" }).success).toBe(false);
  });
});

describe("recipeSchema", () => {
  it("accepts weighed ingredients", () => {
    expect(recipeSchema.safeParse([{ ingredientId: "a", grams: 120 }, { ingredientId: "b", grams: 0.5 }]).success).toBe(true);
  });

  it("refuses a missing or impossible weight, and duplicates", () => {
    expect(recipeSchema.safeParse([{ ingredientId: "a", grams: null }]).success).toBe(false);
    expect(recipeSchema.safeParse([{ ingredientId: "a", grams: 0 }]).success).toBe(false);
    expect(recipeSchema.safeParse([{ ingredientId: "a", grams: -5 }]).success).toBe(false);
    expect(recipeSchema.safeParse([{ ingredientId: "a", grams: 50000 }]).success).toBe(false);
    expect(recipeSchema.safeParse([{ ingredientId: "a", grams: 10 }, { ingredientId: "a", grams: 20 }]).success).toBe(false);
  });
});

describe("activationProblem", () => {
  it("keeps a dish with no ingredients off the menu, except the bowl builder", () => {
    expect(activationProblem({ isBuilder: false, ingredientCount: 0 })).not.toBeNull();
    expect(activationProblem({ isBuilder: false, ingredientCount: 1 })).toBeNull();
    expect(activationProblem({ isBuilder: true, ingredientCount: 0 })).toBeNull();
  });
});

describe("deleteProblem", () => {
  it("refuses a dish with orders and offers hiding instead", () => {
    expect(deleteProblem({ isBuilder: false, orderCount: 1, recipeCount: 0 })).toContain("Hide it instead");
  });

  it("refuses the builder and a dish a recipe uses", () => {
    expect(deleteProblem({ isBuilder: true, orderCount: 0, recipeCount: 0 })).not.toBeNull();
    expect(deleteProblem({ isBuilder: false, orderCount: 0, recipeCount: 1 })).not.toBeNull();
  });

  it("allows a dish nothing depends on", () => {
    expect(deleteProblem({ isBuilder: false, orderCount: 0, recipeCount: 0 })).toBeNull();
  });
});

describe("optionGroupProblem", () => {
  it("refuses a minimum above the maximum", () => {
    expect(optionGroupProblem({ min: 2, max: 1, activeOptions: 5 })).toContain("minimum");
  });

  it("refuses a group that could never be filled, which would make the dish unorderable", () => {
    expect(optionGroupProblem({ min: 1, max: 1, activeOptions: 0 })).toContain("Add the options first");
    expect(optionGroupProblem({ min: 3, max: 4, activeOptions: 2 })).not.toBeNull();
  });

  it("accepts a group that can be filled", () => {
    expect(optionGroupProblem({ min: 0, max: 1, activeOptions: 0 })).toBeNull();
    expect(optionGroupProblem({ min: 1, max: 1, activeOptions: 1 })).toBeNull();
  });
});

describe("optionSchema", () => {
  it("treats an empty extra price as free, in cents", () => {
    expect(optionSchema.parse({ name: "Miso salmon", ingredientId: "a", grams: "100", extraPriceCents: "" }).extraPriceCents).toBe(0);
    expect(optionSchema.parse({ name: "Miso salmon", ingredientId: "a", grams: "100", extraPriceCents: "4.50" }).extraPriceCents).toBe(450);
  });

  it("refuses a negative price or no weight", () => {
    expect(optionSchema.safeParse({ name: "Miso salmon", ingredientId: "a", grams: "100", extraPriceCents: "-1" }).success).toBe(false);
    expect(optionSchema.safeParse({ name: "Miso salmon", ingredientId: "a", grams: "0", extraPriceCents: "1" }).success).toBe(false);
  });
});
