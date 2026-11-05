"use client";

import { useMemo, useState } from "react";
import { saveRecipeAction } from "@/lib/actions/admin-menu";
import { deriveFacts, type IngredientFacts } from "@/lib/diet";
import { roundNutrition, totalNutrition, type Nutrition } from "@/lib/nutrition";
import { Button } from "../ui/Button";
import { Field, inputClass } from "../ui/Form";
import { NutritionLabel, UnverifiedNotice } from "../ui/NutritionLabel";
import { AllergenList, DietTags, allergenNames } from "../ui/Tags";
import { FormResult } from "./FormResult";
import { useAdminForm } from "./useAdminForm";

export type CatalogueIngredient = { id: string; name: string; per100g: Nutrition; facts: IngredientFacts; verified: boolean };
type Line = { ingredientId: string; grams: string };

/** A half-typed weight counts as nothing in the live totals. The server refuses it on save. */
function weight(grams: string): number {
  const value = Number(grams);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * The dish's ingredients in grams. Nutrition and diet tags are worked out here with the same
 * functions the menu uses, so the page shows what guests will see before anything is saved.
 */
export function RecipeEditor({ dishId, catalogue, initial }: { dishId: string; catalogue: CatalogueIngredient[]; initial: { ingredientId: string; grams: number }[] }) {
  const { state, pending, formProps } = useAdminForm(saveRecipeAction.bind(null, dishId));
  const [lines, setLines] = useState<Line[]>(initial.map((line) => ({ ingredientId: line.ingredientId, grams: String(line.grams) })));
  const [adding, setAdding] = useState("");
  const byId = useMemo(() => new Map(catalogue.map((ingredient) => [ingredient.id, ingredient])), [catalogue]);
  const savedKcal = useMemo(() => roundNutrition(totalNutrition(initial.flatMap((line) => (byId.has(line.ingredientId) ? [{ grams: line.grams, per100g: byId.get(line.ingredientId)!.per100g }] : [])))).kcal, [initial, byId]);

  const known = lines.flatMap((line) => {
    const ingredient = byId.get(line.ingredientId);
    return ingredient ? [{ line, ingredient }] : [];
  });
  const nutrition = roundNutrition(totalNutrition(known.map(({ line, ingredient }) => ({ grams: weight(line.grams), per100g: ingredient.per100g }))));
  const facts = deriveFacts(known.map(({ ingredient }) => ingredient.facts));
  const verified = known.length > 0 && known.every(({ ingredient }) => ingredient.verified);
  const unused = catalogue.filter((ingredient) => !lines.some((line) => line.ingredientId === ingredient.id));
  const payload = JSON.stringify(lines.map((line) => ({ ingredientId: line.ingredientId, grams: line.grams.trim() === "" ? null : Number(line.grams) })));

  function setGrams(ingredientId: string, grams: string) {
    setLines((current) => current.map((line) => (line.ingredientId === ingredientId ? { ...line, grams } : line)));
  }

  function add() {
    if (!adding) return;
    setLines((current) => [...current, { ingredientId: adding, grams: "" }]);
    setAdding("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <form {...formProps} className="space-y-4 rounded-brand bg-paper p-5 shadow-soft">
        <input type="hidden" name="lines" value={payload} />
        {known.length === 0 ? <p className="rounded-brand bg-oat-deep p-3 text-sm">No ingredients yet. Add the first one below.</p> : null}
        <ul className="divide-y divide-line">
          {known.map(({ line, ingredient }) => (
            <li key={line.ingredientId} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5" data-testid={`recipe-${ingredient.name}`}>
              <div className="w-full min-w-0 sm:w-auto sm:flex-1">
                <label htmlFor={`grams-${line.ingredientId}`} className="block text-sm font-medium">
                  {ingredient.name}
                </label>
                {ingredient.verified ? null : <span className="text-xs text-stone">Not verified yet</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  id={`grams-${line.ingredientId}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={line.grams}
                  onChange={(event) => setGrams(line.ingredientId, event.target.value)}
                  aria-label={`${ingredient.name}, grams`}
                  className={`${inputClass} w-24`}
                />
                <span aria-hidden="true" className="text-sm text-stone">
                  g
                </span>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => setLines((current) => current.filter((row) => row.ingredientId !== line.ingredientId))} aria-label={`Remove ${ingredient.name}`}>
                Remove
              </Button>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-end gap-2 border-t border-line pt-4">
          <Field label="Add an ingredient" name="add-ingredient" id="add-ingredient">
            <select id="add-ingredient" value={adding} onChange={(event) => setAdding(event.target.value)} className={`${inputClass} max-w-xs`}>
              <option value="">Choose an ingredient</option>
              {unused.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name}
                </option>
              ))}
            </select>
          </Field>
          <Button type="button" variant="secondary" onClick={add} disabled={!adding}>
            Add
          </Button>
        </div>

        <FormResult error={state.error} saved={state.ok ? "Saved. The menu now uses this recipe." : false} pending={pending} />
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save recipe"}
        </Button>
        <p className="text-xs text-stone">Saving goes live on the menu straight away. To change an ingredient&apos;s own nutrition or allergens, use Ingredients, which needs a second person&apos;s approval.</p>
      </form>

      <div className="space-y-4" aria-live="polite" data-testid="recipe-result">
        <h3 className="font-heading text-xl">What guests will see</h3>
        <p className="text-sm text-stone">
          {nutrition.kcal === savedKcal ? "Same calories as the saved recipe." : `Saved recipe: ${savedKcal} kcal. This version: ${nutrition.kcal} kcal.`} Options a guest picks add to these figures.
        </p>
        <NutritionLabel nutrition={nutrition} />
        <section aria-label="Diet tags">
          <h4 className="font-body text-sm font-semibold">Diet tags, worked out from the ingredients</h4>
          <div className="mt-2">{facts.diets.length > 0 ? <DietTags diets={facts.diets} /> : <p className="text-sm text-stone">None. This recipe makes no diet claim.</p>}</div>
        </section>
        <section aria-label="Allergens">
          <h4 className="font-body text-sm font-semibold">Allergens</h4>
          <div className="mt-2">{facts.allergens.length > 0 ? <AllergenList allergens={facts.allergens} /> : <p className="text-sm text-stone">None of the nine major allergens in the recipe.</p>}</div>
          {facts.mayContain.length > 0 ? <p className="mt-2 text-sm">May contain: {allergenNames(facts.mayContain)}.</p> : null}
        </section>
        {verified ? null : <UnverifiedNotice />}
      </div>
    </div>
  );
}
