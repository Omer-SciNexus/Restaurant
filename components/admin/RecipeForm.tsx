"use client";

import { useActionState, useState } from "react";
import { saveRecipeAction } from "@/lib/actions/recipes";
import type { ActionState } from "@/lib/actions/helpers";
import { DIFFICULTIES, DIFFICULTY_LABEL, MAX_SERVINGS, MIN_SERVINGS, type Difficulty } from "@/lib/recipe-rules";
import { Button } from "../ui/Button";
import { Field, FormError, inputClass } from "../ui/Form";

export type RecipeFormValues = {
  slug: string;
  title: string;
  description: string;
  prepMin: number;
  cookMin: number;
  difficulty: Difficulty;
  servings: number;
  status: "DRAFT" | "PUBLISHED";
  menuItemId: string | null;
  thumbnailUrl: string | null;
  transcript: string | null;
  ingredients: { ingredientId: string; grams: number; displayText: string }[];
  steps: { text: string; imageUrl: string | null; videoStartSec: number | null; timerSec: number | null }[];
};

type Choice = { id: string; name: string };

const EMPTY: RecipeFormValues = {
  slug: "",
  title: "",
  description: "",
  prepMin: 10,
  cookMin: 20,
  difficulty: "EASY",
  servings: 2,
  status: "DRAFT",
  menuItemId: null,
  thumbnailUrl: null,
  transcript: null,
  ingredients: [{ ingredientId: "", grams: 100, displayText: "" }],
  steps: [{ text: "", imageUrl: null, videoStartSec: null, timerSec: null }],
};

const INITIAL: ActionState = {};
const smallInput = "min-h-10 w-full rounded-brand border border-stone/50 bg-paper px-3 py-1.5 text-sm";

/** Row keys start from the row's position, so the server and browser render the same field ids. */
const withKeys = <T,>(rows: readonly T[], first = 0) => rows.map((row, index) => ({ ...row, key: first + index }));
const nextKey = (rows: readonly { key: number }[]) => Math.max(-1, ...rows.map((row) => row.key)) + 1;

function FieldErrors({ messages }: { messages?: string[] }) {
  return messages?.[0] ? <p className="mt-2 text-sm text-danger">{messages[0]}</p> : null;
}

export function RecipeForm({ recipeId, values, ingredients, dishes }: { recipeId: string | null; values?: RecipeFormValues; ingredients: readonly Choice[]; dishes: readonly Choice[] }) {
  const start = values ?? EMPTY;
  const [state, action, pending] = useActionState(saveRecipeAction.bind(null, recipeId), INITIAL);
  const [ingredientRows, setIngredientRows] = useState(() => withKeys(start.ingredients));
  const [stepRows, setStepRows] = useState(() => withKeys(start.steps));

  const moveStep = (index: number, by: number) => {
    setStepRows((rows) => {
      const next = [...rows];
      const [row] = next.splice(index, 1);
      if (row) next.splice(index + by, 0, row);
      return next;
    });
  };

  return (
    <form action={action} className="mt-6 space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" name="title" required defaultValue={start.title} error={state.fields?.title?.[0]} />
        <Field label="Web address" name="slug" required defaultValue={start.slug} hint="Lowercase with hyphens. The recipe lives at /cook/this-address." error={state.fields?.slug?.[0]} />
        <div className="sm:col-span-2">
          <label htmlFor="description" className="mb-1 block text-sm font-medium">
            Description
          </label>
          <textarea id="description" name="description" rows={3} required defaultValue={start.description} className={inputClass} />
          <FieldErrors messages={state.fields?.description} />
        </div>
        <Field label="Prep time (minutes)" name="prepMin" type="number" min={0} required defaultValue={start.prepMin} error={state.fields?.prepMin?.[0]} />
        <Field label="Cook time (minutes)" name="cookMin" type="number" min={0} required defaultValue={start.cookMin} error={state.fields?.cookMin?.[0]} />
        <Field label="Serves" name="servings" type="number" min={MIN_SERVINGS} max={MAX_SERVINGS} required defaultValue={start.servings} hint="Ingredient amounts are for this many people." error={state.fields?.servings?.[0]} />
        <div>
          <label htmlFor="difficulty" className="mb-1 block text-sm font-medium">
            Difficulty
          </label>
          <select id="difficulty" name="difficulty" defaultValue={start.difficulty} className={inputClass}>
            {DIFFICULTIES.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {DIFFICULTY_LABEL[difficulty]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="menuItemId" className="mb-1 block text-sm font-medium">
            Dish on the menu
          </label>
          <select id="menuItemId" name="menuItemId" defaultValue={start.menuItemId ?? ""} className={inputClass}>
            <option value="">None</option>
            {dishes.map((dish) => (
              <option key={dish.id} value={dish.id}>
                {dish.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-stone">Sets the library category and the &quot;Too busy? Order it&quot; button.</p>
        </div>
        <Field label="Photo" name="thumbnailUrl" defaultValue={start.thumbnailUrl ?? ""} placeholder="/images/dishes/harvest-quinoa-bowl.png" error={state.fields?.thumbnailUrl?.[0]} />
        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-medium">
            Status
          </label>
          <select id="status" name="status" defaultValue={start.status} className={inputClass}>
            <option value="DRAFT">Draft, admins only</option>
            <option value="PUBLISHED">Published, shown to everyone</option>
          </select>
        </div>
      </div>

      <fieldset>
        <legend className="font-heading text-2xl">Ingredients</legend>
        <p className="mt-1 text-sm text-stone">
          Amounts for the whole recipe. Nutrition and allergens are calculated from the ingredient table, so they can only change through the approval queue. A new ingredient is added there first.
        </p>
        <FieldErrors messages={state.fields?.ingredients} />
        <ul className="mt-3 space-y-3">
          {ingredientRows.map((row, index) => (
            <li key={row.key} className="grid gap-2 rounded-brand bg-paper p-3 shadow-soft sm:grid-cols-[minmax(0,2fr)_6rem_minmax(0,3fr)_auto] sm:items-end" data-testid="recipe-ingredient-row">
              <div>
                <label htmlFor={`ingredient-${row.key}`} className="mb-1 block text-xs font-medium">
                  Ingredient {index + 1}
                </label>
                <select id={`ingredient-${row.key}`} name="ingredientId" defaultValue={row.ingredientId} required className={smallInput}>
                  <option value="">Choose</option>
                  {ingredients.map((ingredient) => (
                    <option key={ingredient.id} value={ingredient.id}>
                      {ingredient.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`grams-${row.key}`} className="mb-1 block text-xs font-medium">
                  Grams
                </label>
                <input id={`grams-${row.key}`} name="grams" type="number" step="0.1" min="0.1" required defaultValue={row.grams} className={smallInput} />
              </div>
              <div>
                <label htmlFor={`display-${row.key}`} className="mb-1 block text-xs font-medium">
                  Shown as
                </label>
                <input id={`display-${row.key}`} name="displayText" required maxLength={200} defaultValue={row.displayText} placeholder="1 cup cooked quinoa" className={smallInput} />
              </div>
              <Button type="button" variant="ghost" size="sm" disabled={ingredientRows.length === 1} onClick={() => setIngredientRows((rows) => rows.filter((other) => other.key !== row.key))} aria-label={`Remove ingredient ${index + 1}`}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => setIngredientRows((rows) => [...rows, ...withKeys([{ ingredientId: "", grams: 100, displayText: "" }], nextKey(rows))])}>
          Add an ingredient
        </Button>
      </fieldset>

      <fieldset>
        <legend className="font-heading text-2xl">Steps</legend>
        <p className="mt-1 text-sm text-stone">Each step with a start time becomes a video chapter. Leave the timer empty when the step does not need one. Avoid amounts in the text, because steps do not scale with servings.</p>
        <FieldErrors messages={state.fields?.steps} />
        <ol className="mt-3 space-y-3">
          {stepRows.map((row, index) => (
            <li key={row.key} className="space-y-2 rounded-brand bg-paper p-3 shadow-soft" data-testid="recipe-step-row">
              <label htmlFor={`step-${row.key}`} className="block text-sm font-medium">
                Step {index + 1}
              </label>
              <textarea id={`step-${row.key}`} name="stepText" rows={2} required defaultValue={row.text} className={inputClass} />
              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <label htmlFor={`start-${row.key}`} className="mb-1 block text-xs font-medium">
                    Chapter start (seconds)
                  </label>
                  <input id={`start-${row.key}`} name="stepVideoStart" type="number" min="0" step="1" defaultValue={row.videoStartSec ?? ""} className={smallInput} />
                </div>
                <div>
                  <label htmlFor={`timer-${row.key}`} className="mb-1 block text-xs font-medium">
                    Timer (seconds)
                  </label>
                  <input id={`timer-${row.key}`} name="stepTimer" type="number" min="1" step="1" defaultValue={row.timerSec ?? ""} className={smallInput} />
                </div>
                <div>
                  <label htmlFor={`image-${row.key}`} className="mb-1 block text-xs font-medium">
                    Photo
                  </label>
                  <input id={`image-${row.key}`} name="stepImage" defaultValue={row.imageUrl ?? ""} placeholder="/images/..." className={smallInput} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" size="sm" disabled={index === 0} onClick={() => moveStep(index, -1)} aria-label={`Move step ${index + 1} up`}>
                  Move up
                </Button>
                <Button type="button" variant="ghost" size="sm" disabled={index === stepRows.length - 1} onClick={() => moveStep(index, 1)} aria-label={`Move step ${index + 1} down`}>
                  Move down
                </Button>
                <Button type="button" variant="ghost" size="sm" disabled={stepRows.length === 1} onClick={() => setStepRows((rows) => rows.filter((other) => other.key !== row.key))} aria-label={`Remove step ${index + 1}`}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ol>
        <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => setStepRows((rows) => [...rows, ...withKeys([{ text: "", imageUrl: null, videoStartSec: null, timerSec: null }], nextKey(rows))])}>
          Add a step
        </Button>
      </fieldset>

      <div>
        <label htmlFor="transcript" className="mb-1 block text-sm font-medium">
          Video transcript
        </label>
        <textarea id="transcript" name="transcript" rows={4} defaultValue={start.transcript ?? ""} className={inputClass} />
      </div>

      <FormError message={state.error} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : recipeId ? "Save recipe" : "Create recipe"}
        </Button>
        <p role="status" className="text-sm text-stone">
          {state.ok && !pending ? "Saved." : ""}
        </p>
      </div>
    </form>
  );
}
