"use client";

import { useState, useTransition } from "react";
import { createSupplierAction, deleteSupplierAction, updateSupplierAction } from "@/lib/actions/admin-suppliers";
import { Button } from "../ui/Button";
import { Field, inputClass } from "../ui/Form";
import { FormResult } from "./FormResult";
import { useAdminForm } from "./useAdminForm";

type Supplier = {
  id: string;
  slug: string;
  name: string;
  region: string;
  story: string;
  photoUrl: string | null;
  certifications: string[];
  certificateUrl: string | null;
  isPublished: boolean;
};

type Ingredient = { id: string; name: string; supplierName: string | null; isHere: boolean };

export function SupplierForm({ supplier, ingredients }: { supplier?: Supplier; ingredients: Ingredient[] }) {
  const { state, pending, formProps } = useAdminForm(supplier ? updateSupplierAction.bind(null, supplier.id) : createSupplierAction);
  const [deleting, startDelete] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();
  const fields = state.fields;

  function remove() {
    setDeleteError(undefined);
    startDelete(async () => {
      const result = await deleteSupplierAction(supplier!.id);
      if (result.error) setDeleteError(result.error);
    });
  }

  return (
    <form {...formProps} className="space-y-5 rounded-brand bg-paper p-5 shadow-soft">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Name" defaultValue={supplier?.name} required error={fields?.name?.[0]} />
        <Field name="region" label="Region" defaultValue={supplier?.region} hint="As the supplier confirms it." error={fields?.region?.[0]} />
      </div>
      <div>
        <label htmlFor="story" className="mb-1 block text-sm font-medium">
          Story
        </label>
        <textarea id="story" name="story" rows={6} defaultValue={supplier?.story} aria-invalid={Boolean(fields?.story)} aria-describedby={fields?.story ? "story-error" : "story-hint"} className={inputClass} />
        {fields?.story ? (
          <p id="story-error" className="mt-1 text-sm text-danger">
            {fields.story[0]}
          </p>
        ) : (
          <p id="story-hint" className="mt-1 text-xs text-stone">
            Only what the supplier has confirmed. Guests read this as fact.
          </p>
        )}
      </div>
      <Field name="photoUrl" label="Photo path (optional)" defaultValue={supplier?.photoUrl ?? ""} placeholder="/images/farms/your-photo.png" hint="A real photo of this supplier, under public/images." error={fields?.photoUrl?.[0]} />

      <fieldset className="space-y-3">
        <legend className="font-heading text-xl">Certificates</legend>
        <div>
          <label htmlFor="certifications" className="mb-1 block text-sm font-medium">
            Certification claims
          </label>
          <textarea id="certifications" name="certifications" rows={2} defaultValue={supplier?.certifications.join("\n")} aria-describedby="certifications-hint" className={inputClass} />
          <p id="certifications-hint" className="mt-1 text-xs text-stone">
            One per line. A claim cannot be saved without its certificate below.
          </p>
        </div>
        <Field name="certificateUrl" label="Certificate web address" type="text" inputMode="url" defaultValue={supplier?.certificateUrl ?? ""} placeholder="https://" error={fields?.certificateUrl?.[0]} />
      </fieldset>

      <fieldset>
        <legend className="font-heading text-xl">Ingredients from this supplier</legend>
        <p className="mt-1 text-xs text-stone">Dish pages name a supplier for these ingredients once it is published. Ticking one moves it from any other supplier.</p>
        <div className="mt-3 grid max-h-72 gap-1 overflow-y-auto rounded-brand border border-line p-3 sm:grid-cols-2 lg:grid-cols-3">
          {ingredients.map((ingredient) => (
            <label key={ingredient.id} className="flex min-h-9 items-center gap-2 text-sm">
              <input type="checkbox" name="ingredientIds" value={ingredient.id} defaultChecked={ingredient.isHere} className="h-4 w-4 accent-forest" />
              <span>
                {ingredient.name}
                {ingredient.supplierName && !ingredient.isHere ? <span className="text-xs text-stone"> ({ingredient.supplierName})</span> : null}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex min-h-9 items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="isPublished" defaultChecked={supplier?.isPublished} className="h-4 w-4 accent-forest" />
        Published: show on the Our farms page and on dish pages
      </label>

      <FormResult error={state.error ?? deleteError} saved={state.ok ? "Saved." : false} pending={pending || deleting} />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : supplier ? "Save supplier" : "Create supplier"}
        </Button>
        {supplier ? (
          confirming ? (
            <>
              <Button type="button" variant="danger" disabled={deleting} onClick={remove}>
                Yes, delete this supplier
              </Button>
              <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
                Keep it
              </Button>
            </>
          ) : (
            <Button type="button" variant="danger" onClick={() => setConfirming(true)}>
              Delete
            </Button>
          )
        ) : null}
      </div>
      {supplier ? null : <p className="text-xs text-stone">Its web address is set from the name now and does not change.</p>}
    </form>
  );
}
