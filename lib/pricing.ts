// Server-side price, fee and total calculation. The browser never decides the price:
// every order total is recalculated here from database values before charging.

import type { OrderType } from "./domain";

export const MAX_QUANTITY_PER_LINE = 50;

export type PricingErrorCode =
  | "EMPTY_CART"
  | "BAD_QUANTITY"
  | "ITEM_UNAVAILABLE"
  | "OPTION_INVALID"
  | "OPTION_TOO_FEW"
  | "OPTION_TOO_MANY"
  | "BELOW_MINIMUM";

export class PricingError extends Error {
  constructor(
    readonly code: PricingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PricingError";
  }
}

export type PricedOption = { id: string; name: string; extraPriceCents: number };

export type PricedGroup = {
  id: string;
  name: string;
  min: number;
  max: number;
  options: readonly PricedOption[];
};

export type PricedItem = {
  id: string;
  name: string;
  /** Branch price: the override if there is one, otherwise the shared base price. */
  priceCents: number;
  isAvailable: boolean;
  groups: readonly PricedGroup[];
};

export type LinePrice = {
  unitPriceCents: number;
  selected: { groupId: string; groupName: string; optionId: string; name: string; extraPriceCents: number }[];
};

/** Validates a selection against its option groups and returns the unit price. */
export function priceLine(item: PricedItem, optionIds: readonly string[]): LinePrice {
  if (!item.isAvailable) throw new PricingError("ITEM_UNAVAILABLE", `${item.name} is not available right now.`);
  if (new Set(optionIds).size !== optionIds.length) {
    throw new PricingError("OPTION_INVALID", `An option for ${item.name} was picked twice.`);
  }

  const remaining = new Set(optionIds);
  const selected: LinePrice["selected"] = [];
  for (const group of item.groups) {
    const picked = group.options.filter((option) => remaining.has(option.id));
    if (picked.length < group.min) {
      throw new PricingError("OPTION_TOO_FEW", `Choose at least ${group.min} from ${group.name}.`);
    }
    if (picked.length > group.max) {
      throw new PricingError("OPTION_TOO_MANY", `Choose at most ${group.max} from ${group.name}.`);
    }
    for (const option of picked) {
      remaining.delete(option.id);
      selected.push({
        groupId: group.id,
        groupName: group.name,
        optionId: option.id,
        name: option.name,
        extraPriceCents: option.extraPriceCents,
      });
    }
  }
  if (remaining.size > 0) throw new PricingError("OPTION_INVALID", `An option does not belong to ${item.name}.`);

  const extras = selected.reduce((sum, option) => sum + option.extraPriceCents, 0);
  return { unitPriceCents: item.priceCents + extras, selected };
}

export type FeeRules = {
  deliveryFeeCents: number;
  minOrderCents: number;
  taxRateBps: number;
  freeDeliveryAboveCents: number | null;
};

export type OrderTotals = {
  subtotalCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  totalCents: number;
};

/** Totals for priced lines. Tax applies to food only; the rule per state is confirmed with the accountant. */
export function priceOrder(
  lines: readonly { unitPriceCents: number; quantity: number }[],
  type: OrderType,
  rules: FeeRules,
): OrderTotals {
  if (lines.length === 0) throw new PricingError("EMPTY_CART", "Your cart is empty.");
  let subtotalCents = 0;
  for (const { unitPriceCents, quantity } of lines) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_LINE) {
      throw new PricingError("BAD_QUANTITY", `Quantity must be between 1 and ${MAX_QUANTITY_PER_LINE}.`);
    }
    subtotalCents += unitPriceCents * quantity;
  }

  let deliveryFeeCents = 0;
  if (type === "DELIVERY") {
    if (subtotalCents < rules.minOrderCents) {
      throw new PricingError("BELOW_MINIMUM", "This order is below the delivery minimum for this branch.");
    }
    const free = rules.freeDeliveryAboveCents !== null && subtotalCents >= rules.freeDeliveryAboveCents;
    deliveryFeeCents = free ? 0 : rules.deliveryFeeCents;
  }

  const taxCents = Math.round((subtotalCents * rules.taxRateBps) / 10_000);
  return { subtotalCents, deliveryFeeCents, taxCents, totalCents: subtotalCents + deliveryFeeCents + taxCents };
}
