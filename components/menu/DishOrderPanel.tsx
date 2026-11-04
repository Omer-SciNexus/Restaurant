"use client";

import Link from "next/link";
import { useState } from "react";
import { addToCart } from "@/lib/cart";
import type { DietProfile } from "@/lib/diet";
import { formatMoney } from "@/lib/domain";
import type { DishDetail } from "@/lib/menu";
import { Button } from "../ui/Button";
import { DishFactsPanel } from "./DishFactsPanel";
import { useDishSelection } from "./useDishSelection";

export function DishOrderPanel({ dish, branchSelected, profile }: { dish: DishDetail; branchSelected: boolean; profile: DietProfile | null }) {
  const selection = useDishSelection(dish);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const canAdd = branchSelected && dish.isServing && !dish.soldOut && selection.missing.length === 0;

  function add() {
    addToCart(
      {
        menuItemId: dish.id,
        slug: dish.slug,
        name: dish.name,
        imageUrl: dish.imageUrl,
        optionIds: [...selection.selected],
        optionSummary: selection.chosen.map(({ option }) => option.name),
        unitPriceCents: selection.priceCents,
      },
      quantity,
    );
    setAdded(true);
    setQuantity(1);
    selection.reset();
  }

  return (
    <div className="mt-6 space-y-6">
      {dish.groups.map((group) => (
        <fieldset key={group.id}>
          <legend className="font-medium">{group.name}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {group.options.map((option) => {
              const active = selection.selected.has(option.id);
              return (
                <label key={option.id} className={`cursor-pointer rounded-full border px-4 py-2 text-sm has-focus-visible:outline-3 has-focus-visible:outline-forest ${active ? "border-forest bg-forest text-white" : "border-stone/40 hover:bg-sage/60"}`}>
                  <input type="checkbox" className="sr-only" checked={active} onChange={() => selection.toggle(group.id, option.id)} />
                  {option.name} {option.extraPriceCents > 0 ? `+${formatMoney(option.extraPriceCents)}` : ""}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="rounded-brand bg-paper p-4 shadow-soft">
        {dish.soldOut ? (
          <p className="font-medium">Sold out at this branch today.</p>
        ) : !branchSelected ? (
          <p className="text-sm">
            <Link href="/branches" className="font-medium text-forest underline">
              Choose a branch
            </Link>{" "}
            to order this dish.
          </p>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-brand border border-stone/40">
              <button type="button" aria-label="One fewer" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="h-11 w-11 text-lg">
                −
              </button>
              <span aria-live="polite" className="w-6 text-center font-medium">
                {quantity}
              </span>
              <button type="button" aria-label="One more" onClick={() => setQuantity((q) => Math.min(50, q + 1))} className="h-11 w-11 text-lg">
                +
              </button>
            </div>
            <Button type="button" onClick={add} disabled={!canAdd} className="flex-1">
              Add to cart · {formatMoney(selection.priceCents * quantity)}
            </Button>
          </div>
        )}
        {added ? (
          <p role="status" className="mt-3 text-sm">
            Added.{" "}
            <Link href="/cart" className="font-medium text-forest underline">
              View cart
            </Link>{" "}
            or{" "}
            <Link href="/menu" className="font-medium text-forest underline">
              keep browsing
            </Link>
            .
          </p>
        ) : null}
      </div>

      <DishFactsPanel facts={selection.facts} nutrition={selection.nutrition} verified={selection.verified} profile={profile} />
    </div>
  );
}
