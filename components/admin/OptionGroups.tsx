"use client";

import { useState, useTransition } from "react";
import {
  createOptionAction,
  createOptionGroupAction,
  deleteOptionAction,
  deleteOptionGroupAction,
  setOptionActiveAction,
  updateOptionAction,
  updateOptionGroupAction,
} from "@/lib/actions/admin-menu";
import { centsToDollars } from "@/lib/admin/money";
import { formatMoney } from "@/lib/domain";
import { Button } from "../ui/Button";
import { Field, inputClass } from "../ui/Form";
import { FormResult } from "./FormResult";
import { useAdminForm } from "./useAdminForm";

export type OptionRow = { id: string; name: string; extraPriceCents: number; ingredientId: string; ingredientName: string; grams: number; isActive: boolean; kcal: number };
export type GroupRow = { id: string; name: string; min: number; max: number; options: OptionRow[] };
type IngredientChoice = { id: string; name: string };

function GroupFields({ prefix, group, fields }: { prefix: string; group?: GroupRow; fields?: Record<string, string[] | undefined> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_6rem_6rem]">
      <Field id={`${prefix}-name`} name="name" label="Group name" defaultValue={group?.name} required error={fields?.name?.[0]} />
      <Field id={`${prefix}-min`} name="min" label="Must pick" type="number" min="0" step="1" defaultValue={group?.min ?? 0} required error={fields?.min?.[0]} />
      <Field id={`${prefix}-max`} name="max" label="Can pick" type="number" min="1" step="1" defaultValue={group?.max ?? 1} required error={fields?.max?.[0]} />
    </div>
  );
}

function OptionFields({ prefix, option, ingredients, fields }: { prefix: string; option?: OptionRow; ingredients: IngredientChoice[]; fields?: Record<string, string[] | undefined> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem_6rem]">
      <Field id={`${prefix}-name`} name="name" label="Option name" defaultValue={option?.name} required error={fields?.name?.[0]} />
      <Field label="Ingredient" id={`${prefix}-ingredient`} error={fields?.ingredientId?.[0]}>
        <select id={`${prefix}-ingredient`} name="ingredientId" defaultValue={option?.ingredientId ?? ""} required className={inputClass}>
          <option value="" disabled>
            Choose an ingredient
          </option>
          {ingredients.map((ingredient) => (
            <option key={ingredient.id} value={ingredient.id}>
              {ingredient.name}
            </option>
          ))}
        </select>
      </Field>
      <Field id={`${prefix}-grams`} name="grams" label="Grams" type="number" min="0" step="any" defaultValue={option?.grams} required error={fields?.grams?.[0]} />
      <Field id={`${prefix}-extra`} name="extraPriceCents" label="Extra (USD)" inputMode="decimal" autoComplete="off" defaultValue={option ? centsToDollars(option.extraPriceCents) : "0.00"} error={fields?.extraPriceCents?.[0]} />
    </div>
  );
}

function NewOption({ groupId, ingredients }: { groupId: string; ingredients: IngredientChoice[] }) {
  const { state, pending, formProps } = useAdminForm(createOptionAction.bind(null, groupId));
  return (
    <form {...formProps} className="space-y-3 border-t border-line pt-3">
      <h4 className="font-body text-sm font-semibold">Add an option</h4>
      <OptionFields prefix={`new-option-${groupId}`} ingredients={ingredients} fields={state.fields} />
      <FormResult error={state.error} saved={state.ok ? "Option added." : false} pending={pending} />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "Adding..." : "Add option"}
      </Button>
    </form>
  );
}

function OptionItem({ option, ingredients }: { option: OptionRow; ingredients: IngredientChoice[] }) {
  const { state, pending, formProps } = useAdminForm(updateOptionAction.bind(null, option.id));
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function run(action: () => Promise<{ error?: string }>) {
    setError(undefined);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  return (
    <li className="py-3" data-testid={`option-${option.name}`}>
      <details>
        <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-3 text-sm">
          <span className="font-medium">{option.name}</span>
          <span className="text-stone">
            {option.ingredientName}, {option.grams} g, {option.kcal} kcal, {option.extraPriceCents > 0 ? `+${formatMoney(option.extraPriceCents)}` : "no extra charge"}
          </span>
          {option.isActive ? null : <span className="rounded-full bg-oat-deep px-2 py-0.5 text-xs font-medium">Hidden</span>}
        </summary>
        <form {...formProps} className="mt-3 space-y-3">
          <OptionFields prefix={`option-${option.id}`} option={option} ingredients={ingredients} fields={state.fields} />
          <FormResult error={state.error ?? error} saved={state.ok ? "Saved." : false} pending={pending || busy} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              Save option
            </Button>
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => run(() => setOptionActiveAction(option.id, !option.isActive))}>
              {option.isActive ? "Hide" : "Show"}
            </Button>
            <Button type="button" size="sm" variant="danger" disabled={busy} onClick={() => run(() => deleteOptionAction(option.id))}>
              Delete
            </Button>
          </div>
        </form>
      </details>
    </li>
  );
}

function GroupCard({ group, ingredients }: { group: GroupRow; ingredients: IngredientChoice[] }) {
  const { state, pending, formProps } = useAdminForm(updateOptionGroupAction.bind(null, group.id));
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function remove() {
    setError(undefined);
    startTransition(async () => {
      const result = await deleteOptionGroupAction(group.id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <section aria-label={group.name} className="space-y-3 rounded-brand bg-paper p-5 shadow-soft" data-testid={`group-${group.name}`}>
      <form {...formProps} className="space-y-3">
        <GroupFields prefix={`group-${group.id}`} group={group} fields={state.fields} />
        <FormResult error={state.error ?? error} saved={state.ok ? "Saved." : false} pending={pending || busy} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            Save group
          </Button>
          <Button type="button" size="sm" variant="danger" disabled={busy} onClick={remove}>
            Delete group
          </Button>
        </div>
      </form>
      {group.options.length === 0 ? <p className="text-sm text-stone">No options yet.</p> : null}
      <ul className="divide-y divide-line">
        {group.options.map((option) => (
          <OptionItem key={option.id} option={option} ingredients={ingredients} />
        ))}
      </ul>
      <NewOption groupId={group.id} ingredients={ingredients} />
    </section>
  );
}

export function OptionGroups({ dishId, groups, ingredients }: { dishId: string; groups: GroupRow[]; ingredients: IngredientChoice[] }) {
  const { state, pending, formProps } = useAdminForm(createOptionGroupAction.bind(null, dishId));
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <GroupCard key={group.id} group={group} ingredients={ingredients} />
      ))}
      <form {...formProps} className="space-y-3 rounded-brand border border-dashed border-stone/50 p-5">
        <h3 className="font-heading text-xl">Add an option group</h3>
        <GroupFields prefix="new-group" fields={state.fields} />
        <p className="text-xs text-stone">A group starts with no options, so &quot;must pick&quot; has to be 0 until you have added them.</p>
        <FormResult error={state.error} saved={state.ok ? "Group added." : false} pending={pending} />
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {pending ? "Adding..." : "Add group"}
        </Button>
      </form>
    </div>
  );
}
