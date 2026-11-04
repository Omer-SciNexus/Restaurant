"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addToCart } from "@/lib/cart";
import type { DietProfile } from "@/lib/diet";
import { formatMoney } from "@/lib/domain";
import type { DishDetail } from "@/lib/menu";
import { DishFactsPanel } from "../menu/DishFactsPanel";
import { useDishSelection } from "../menu/useDishSelection";
import { Button } from "../ui/Button";

export function BowlBuilder({ dish, branchSelected, profile }: { dish: DishDetail; branchSelected: boolean; profile: DietProfile | null }) {
  const router = useRouter();
  const selection = useDishSelection(dish);
  const [step, setStep] = useState(0);
  const group = dish.groups[step];
  if (!group) return null;

  const pickedInGroup = group.options.filter((option) => selection.selected.has(option.id)).length;
  const isLast = step === dish.groups.length - 1;
  const canContinue = pickedInGroup >= group.min;
  const canAdd = branchSelected && !dish.soldOut && selection.missing.length === 0;

  function add() {
    addToCart({
      menuItemId: dish.id,
      slug: dish.slug,
      name: dish.name,
      imageUrl: dish.imageUrl,
      optionIds: [...selection.selected],
      optionSummary: selection.chosen.map(({ option }) => option.name),
      unitPriceCents: selection.priceCents,
    });
    router.push("/cart");
  }

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div>
        <ol className="flex gap-2" aria-label="Steps">
          {dish.groups.map((g, index) => (
            <li key={g.id} className="flex-1">
              <button
                type="button"
                onClick={() => setStep(index)}
                aria-current={index === step ? "step" : undefined}
                className={`w-full border-t-4 pt-2 text-left text-sm ${index === step ? "border-forest font-semibold" : index < step ? "border-forest/50" : "border-line text-stone"}`}
              >
                <span className="sr-only">Step {index + 1}: </span>
                {g.name}
              </button>
            </li>
          ))}
        </ol>

        <fieldset className="mt-6">
          <legend className="font-heading text-2xl">
            {group.max === 1 ? `Choose your ${group.name.toLowerCase()}` : `Add ${group.name.toLowerCase()}`}
            {group.max > 1 ? (
              <span className="ml-2 font-body text-sm text-stone">
                {pickedInGroup} of up to {group.max}
              </span>
            ) : null}
          </legend>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {group.options.map((option) => {
              const active = selection.selected.has(option.id);
              const full = !active && group.max > 1 && pickedInGroup >= group.max;
              return (
                <label
                  key={option.id}
                  className={`relative block cursor-pointer overflow-hidden rounded-brand border-2 bg-paper transition-colors has-focus-visible:outline-3 has-focus-visible:outline-forest ${active ? "border-forest" : "border-transparent hover:border-sage"} ${full ? "opacity-50" : ""}`}
                >
                  <input
                    type={group.max === 1 ? "radio" : "checkbox"}
                    name={group.id}
                    className="sr-only"
                    checked={active}
                    disabled={full}
                    onChange={() => selection.toggle(group.id, option.id)}
                  />
                  <span className="relative block aspect-square bg-oat-deep">
                    {option.imageUrl ? <Image src={option.imageUrl} alt="" fill sizes="(min-width: 1280px) 200px, (min-width: 640px) 30vw, 50vw" className="object-cover" /> : null}
                    {active ? (
                      <span aria-hidden="true" className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-forest text-sm text-white">
                        ✓
                      </span>
                    ) : null}
                  </span>
                  <span className="block p-3 text-sm">
                    <span className="block font-medium">{option.name}</span>
                    <span className="text-stone">
                      {option.extraPriceCents > 0 ? `+${formatMoney(option.extraPriceCents)}` : "Included"} · {Math.round((option.per100g.kcal * option.grams) / 100)} kcal
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-6 flex justify-between gap-3">
          <Button type="button" variant="secondary" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
            Back
          </Button>
          {isLast ? null : (
            <Button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
              Next: {dish.groups[step + 1]?.name}
            </Button>
          )}
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="space-y-4 rounded-brand bg-paper p-5 shadow-soft">
          <h2 className="text-2xl">Your bowl</h2>
          {selection.chosen.length === 0 ? (
            <p className="text-sm text-stone">Nothing yet. Start with a base.</p>
          ) : (
            <ul className="text-sm" data-testid="bowl-summary">
              {selection.chosen.map(({ group: g, option }) => (
                <li key={option.id} className="flex justify-between gap-3 border-b border-line py-1.5 last:border-0">
                  <span>{option.name}</span>
                  <span className="text-stone">{g.name}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="flex items-baseline justify-between">
            <span className="text-sm">Price</span>
            <span className="font-heading text-2xl" data-testid="bowl-price">
              {formatMoney(selection.priceCents)}
            </span>
          </p>
          {branchSelected ? (
            <Button type="button" onClick={add} disabled={!canAdd} size="lg" className="w-full">
              {selection.missing.length > 0 ? `Choose ${selection.missing.map((g) => g.name.toLowerCase()).join(", ")}` : "Add to cart"}
            </Button>
          ) : (
            <p className="text-sm">
              <Link href="/branches" className="font-medium text-forest underline">
                Choose a branch
              </Link>{" "}
              to order your bowl.
            </p>
          )}
          {/* No facts until something is chosen: an empty bowl must not read as "no allergens". */}
          {selection.chosen.length > 0 ? <DishFactsPanel facts={selection.facts} nutrition={selection.nutrition} verified={selection.verified} profile={profile} /> : null}
        </div>
      </aside>
    </div>
  );
}
