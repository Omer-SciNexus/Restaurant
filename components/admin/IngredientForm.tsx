"use client";

import { useActionState } from "react";
import { proposeChangeAction } from "@/lib/actions/nutrition";
import type { ActionState } from "@/lib/actions/helpers";
import { ALLERGENS, ALLERGEN_INFO } from "@/lib/domain";
import type { IngredientValues } from "@/lib/nutrition-review";
import { Button } from "../ui/Button";
import { Field, FormError, inputClass } from "../ui/Form";

const NUMBERS = [
  ["kcal", "Calories (kcal)"],
  ["protein", "Protein (g)"],
  ["carbs", "Carbs (g)"],
  ["fat", "Fat (g)"],
  ["fibre", "Fibre (g)"],
  ["sugar", "Sugar (g)"],
  ["salt", "Salt (g)"],
] as const;

const INITIAL: ActionState = {};

export function IngredientForm({ ingredientId, values }: { ingredientId: string; values: IngredientValues }) {
  const [state, action, pending] = useActionState(proposeChangeAction.bind(null, ingredientId), INITIAL);

  if (state.ok) {
    return (
      <p role="status" className="mt-6 rounded-brand bg-sage p-4 text-sm">
        Sent for approval. A second person now reviews it, and nothing guests see changes until then.
      </p>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-6">
      <fieldset>
        <legend className="font-heading text-xl">Per 100 g</legend>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {NUMBERS.map(([name, label]) => (
            <Field key={name} label={label} name={name} type="number" step="0.01" min="0" required defaultValue={values[name]} error={state.fields?.[name]?.[0]} />
          ))}
        </div>
      </fieldset>

      {(
        [
          ["allergens", "Contains", values.allergens],
          ["mayContain", "May contain", values.mayContain],
        ] as const
      ).map(([name, legend, selected]) => (
        <fieldset key={name}>
          <legend className="font-heading text-xl">{legend}</legend>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ALLERGENS.map((allergen) => (
              <label key={allergen} className="flex min-h-9 items-center gap-2 text-sm">
                <input type="checkbox" name={name} value={allergen} defaultChecked={selected.includes(allergen)} className="h-4 w-4 accent-forest" />
                {ALLERGEN_INFO[allergen].label}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <fieldset>
        <legend className="font-heading text-xl">Diet</legend>
        <div className="mt-3 flex flex-wrap gap-5">
          {(
            [
              ["isVegan", "Vegan", values.isVegan],
              ["isVegetarian", "Vegetarian", values.isVegetarian],
              ["isGlutenFree", "Gluten-free", values.isGlutenFree],
            ] as const
          ).map(([name, label, checked]) => (
            <label key={name} className="flex min-h-9 items-center gap-2 text-sm">
              <input type="checkbox" name={name} defaultChecked={checked} className="h-4 w-4 accent-forest" />
              {label}
            </label>
          ))}
        </div>
        {state.fields?.isVegan?.[0] ?? state.fields?.isGlutenFree?.[0] ? <p className="mt-2 text-sm text-danger">{state.fields?.isVegan?.[0] ?? state.fields?.isGlutenFree?.[0]}</p> : null}
      </fieldset>

      <div>
        <label htmlFor="note" className="mb-1 block text-sm font-medium">
          Note for the reviewer
        </label>
        <textarea id="note" name="note" rows={2} className={inputClass} placeholder="Where these values come from, for example the USDA entry or the supplier's spec sheet" />
      </div>

      <FormError message={state.error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Sending..." : "Send for approval"}
      </Button>
      <p className="text-xs text-stone">To verify the values as they stand, send this form without changing anything.</p>
    </form>
  );
}
