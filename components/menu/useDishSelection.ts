"use client";

import { useMemo, useState } from "react";
import { deriveFacts } from "@/lib/diet";
import type { DishDetail } from "@/lib/menu";
import { roundNutrition, totalNutrition } from "@/lib/nutrition";

/**
 * Live price, nutrition and allergens for a selection. Uses the same calculation functions
 * as the server, so what the guest sees here matches what the order will record.
 */
export function useDishSelection(dish: DishDetail) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(groupId: string, optionId: string) {
    const group = dish.groups.find((g) => g.id === groupId);
    if (!group) return;
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(optionId)) {
        next.delete(optionId);
        return next;
      }
      const inGroup = group.options.filter((option) => next.has(option.id));
      // A single-choice group swaps; a full multi-choice group ignores the extra tap.
      if (group.max === 1) inGroup.forEach((option) => next.delete(option.id));
      else if (inGroup.length >= group.max) return previous;
      next.add(optionId);
      return next;
    });
  }

  const summary = useMemo(() => {
    const chosen = dish.groups.flatMap((group) => group.options.filter((option) => selected.has(option.id)).map((option) => ({ group, option })));
    const nutrition = roundNutrition(totalNutrition([...dish.baseLines, ...chosen.map(({ option }) => ({ grams: option.grams, per100g: option.per100g }))]));
    const facts = deriveFacts([...dish.baseFacts, ...chosen.map(({ option }) => option.facts)]);
    const priceCents = dish.priceCents + chosen.reduce((sum, { option }) => sum + option.extraPriceCents, 0);
    const verified = dish.baseFacts.length + chosen.length > 0 && (dish.baseFacts.length === 0 || dish.verified) && chosen.every(({ option }) => option.verified);
    const missing = dish.groups.filter((group) => group.options.filter((option) => selected.has(option.id)).length < group.min);
    return { chosen, nutrition, facts, priceCents, verified, missing };
  }, [dish, selected]);

  return { selected, toggle, reset: () => setSelected(new Set()), ...summary };
}
