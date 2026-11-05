"use client";

import Image from "next/image";
import { useState } from "react";
import { createDishAction, updateDishAction } from "@/lib/actions/admin-menu";
import { centsToDollars } from "@/lib/admin/money";
import { isPhotoPath } from "@/lib/admin/menu";
import { Button } from "../ui/Button";
import { Field, inputClass } from "../ui/Form";
import { FormResult } from "./FormResult";
import { useAdminForm } from "./useAdminForm";

type Dish = {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  basePriceCents: number;
  imageUrl: string;
  isSeasonal: boolean;
  availableFrom: Date | null;
  availableTo: Date | null;
};

const dateValue = (date: Date | null | undefined) => date?.toISOString().slice(0, 10) ?? "";

export function DishForm({ dish, categories }: { dish?: Dish; categories: { id: string; name: string }[] }) {
  const { state, pending, formProps } = useAdminForm(dish ? updateDishAction.bind(null, dish.id) : createDishAction);
  const [photo, setPhoto] = useState(dish?.imageUrl ?? "");
  const [seasonal, setSeasonal] = useState(dish?.isSeasonal ?? false);
  const fields = state.fields;

  return (
    <form {...formProps} className="space-y-4 rounded-brand bg-paper p-5 shadow-soft">
      <Field name="name" label="Name" defaultValue={dish?.name} required error={fields?.name?.[0]} />
      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium">
          Description
        </label>
        <textarea id="description" name="description" rows={3} defaultValue={dish?.description} required aria-invalid={Boolean(fields?.description)} aria-describedby={fields?.description ? "description-error" : undefined} className={inputClass} />
        {fields?.description ? (
          <p id="description-error" className="mt-1 text-sm text-danger">
            {fields.description[0]}
          </p>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="categoryId" className="mb-1 block text-sm font-medium">
            Category
          </label>
          <select id="categoryId" name="categoryId" defaultValue={dish?.categoryId ?? ""} required className={inputClass}>
            <option value="" disabled>
              Choose a category
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {fields?.categoryId ? <p className="mt-1 text-sm text-danger">{fields.categoryId[0]}</p> : null}
        </div>
        <Field name="basePriceCents" label="Price (USD)" inputMode="decimal" autoComplete="off" defaultValue={dish ? centsToDollars(dish.basePriceCents) : ""} required hint="Branch price overrides stay as they are." error={fields?.basePriceCents?.[0]} />
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-start">
        <Field name="imageUrl" label="Photo path" value={photo} onChange={(event) => setPhoto(event.target.value)} required placeholder="/images/dishes/green-juice.png" hint="A file under public/images." error={fields?.imageUrl?.[0]} />
        {isPhotoPath(photo) ? (
          <div className="relative aspect-square w-32 overflow-hidden rounded-brand bg-oat-deep">
            <Image key={photo} src={photo} alt="" fill sizes="128px" className="object-cover" />
          </div>
        ) : null}
      </div>

      <fieldset>
        <legend className="font-heading text-xl">Season</legend>
        <label className="mt-2 flex min-h-9 items-center gap-2 text-sm">
          <input type="checkbox" name="isSeasonal" checked={seasonal} onChange={(event) => setSeasonal(event.target.checked)} className="h-4 w-4 accent-forest" />
          Seasonal: only on the menu between these days
        </label>
        {seasonal ? (
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <Field name="availableFrom" label="First day" type="date" defaultValue={dateValue(dish?.availableFrom)} error={fields?.availableFrom?.[0]} />
            <Field name="availableTo" label="Last day" type="date" defaultValue={dateValue(dish?.availableTo)} />
          </div>
        ) : null}
      </fieldset>

      <FormResult error={state.error} saved={state.ok ? "Saved." : false} pending={pending} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : dish ? "Save details" : "Create dish"}
      </Button>
      {dish ? null : <p className="text-xs text-stone">The dish starts hidden. Its web address is set from the name now and never changes. Next you add its ingredients and put it on the menu.</p>}
    </form>
  );
}
