import { describe, expect, it } from "vitest";
import { PricingError, priceLine, priceOrder, type FeeRules, type PricedItem } from "@/lib/pricing";

const bowl: PricedItem = {
  id: "bowl",
  name: "Build your own bowl",
  priceCents: 1000,
  isAvailable: true,
  groups: [
    { id: "base", name: "Base", min: 1, max: 1, options: [{ id: "quinoa", name: "Quinoa", extraPriceCents: 0 }, { id: "rice", name: "Brown rice", extraPriceCents: 0 }] },
    { id: "protein", name: "Protein", min: 1, max: 1, options: [{ id: "salmon", name: "Miso salmon", extraPriceCents: 350 }, { id: "tofu", name: "Baked tofu", extraPriceCents: 150 }] },
    { id: "toppings", name: "Toppings", min: 0, max: 2, options: [{ id: "avocado", name: "Avocado", extraPriceCents: 150 }, { id: "corn", name: "Corn", extraPriceCents: 50 }, { id: "seeds", name: "Seeds", extraPriceCents: 50 }] },
  ],
};

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    if (error instanceof PricingError) return error.code;
    throw error;
  }
  return "no error";
};

describe("priceLine", () => {
  it("adds option extras to the branch price", () => {
    const line = priceLine(bowl, ["quinoa", "salmon", "avocado"]);
    expect(line.unitPriceCents).toBe(1000 + 350 + 150);
    expect(line.selected.map((o) => o.name)).toEqual(["Quinoa", "Miso salmon", "Avocado"]);
  });

  it("enforces required groups and maximums", () => {
    expect(code(() => priceLine(bowl, ["salmon"]))).toBe("OPTION_TOO_FEW");
    expect(code(() => priceLine(bowl, ["quinoa", "rice", "salmon"]))).toBe("OPTION_TOO_MANY");
    expect(code(() => priceLine(bowl, ["quinoa", "salmon", "avocado", "corn", "seeds"]))).toBe("OPTION_TOO_MANY");
  });

  it("rejects options from elsewhere and tampered duplicates", () => {
    expect(code(() => priceLine(bowl, ["quinoa", "salmon", "free-lobster"]))).toBe("OPTION_INVALID");
    expect(code(() => priceLine(bowl, ["quinoa", "salmon", "corn", "corn"]))).toBe("OPTION_INVALID");
  });

  it("refuses a sold-out dish", () => {
    expect(code(() => priceLine({ ...bowl, isAvailable: false }, ["quinoa", "salmon"]))).toBe("ITEM_UNAVAILABLE");
  });
});

describe("priceOrder", () => {
  const rules: FeeRules = { deliveryFeeCents: 399, minOrderCents: 1500, taxRateBps: 825, freeDeliveryAboveCents: 5000 };
  const lines = [
    { unitPriceCents: 1500, quantity: 2 },
    { unitPriceCents: 650, quantity: 1 },
  ];

  it("calculates a pickup total with no delivery fee", () => {
    // 3650 subtotal, tax 3650 * 8.25% = 301.125 -> 301
    expect(priceOrder(lines, "PICKUP", rules)).toEqual({ subtotalCents: 3650, deliveryFeeCents: 0, taxCents: 301, totalCents: 3951 });
  });

  it("adds the delivery fee for delivery", () => {
    expect(priceOrder(lines, "DELIVERY", rules).totalCents).toBe(3650 + 399 + 301);
  });

  it("waives the fee at or above the free delivery threshold", () => {
    expect(priceOrder([{ unitPriceCents: 5000, quantity: 1 }], "DELIVERY", rules).deliveryFeeCents).toBe(0);
    expect(priceOrder([{ unitPriceCents: 4999, quantity: 1 }], "DELIVERY", rules).deliveryFeeCents).toBe(399);
  });

  it("applies the minimum to delivery only", () => {
    const small = [{ unitPriceCents: 1000, quantity: 1 }];
    expect(code(() => priceOrder(small, "DELIVERY", rules))).toBe("BELOW_MINIMUM");
    expect(priceOrder(small, "PICKUP", rules).subtotalCents).toBe(1000);
  });

  it("refuses an empty cart and impossible quantities", () => {
    expect(code(() => priceOrder([], "PICKUP", rules))).toBe("EMPTY_CART");
    for (const quantity of [0, -1, 1.5, 51]) {
      expect(code(() => priceOrder([{ unitPriceCents: 100, quantity }], "PICKUP", rules))).toBe("BAD_QUANTITY");
    }
  });
});
