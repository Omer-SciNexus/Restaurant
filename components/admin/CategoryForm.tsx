"use client";

import { createCategoryAction, updateCategoryAction } from "@/lib/actions/admin-menu";
import { Button } from "../ui/Button";
import { Field } from "../ui/Form";
import { FormResult } from "./FormResult";
import { useAdminForm } from "./useAdminForm";

type Category = { id: string; slug: string; name: string; sortOrder: number; servedFrom: string | null; servedUntil: string | null };

export function CategoryForm({ category, nextSort }: { category?: Category; nextSort?: number }) {
  const { state, pending, formProps } = useAdminForm(category ? updateCategoryAction.bind(null, category.id) : createCategoryAction);
  const prefix = category?.id ?? "new";
  const fields = state.fields;

  return (
    <form {...formProps} className="space-y-3 rounded-brand bg-paper p-4 shadow-soft" data-testid={category ? `category-${category.slug}` : "new-category"}>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_6rem_8rem_8rem]">
        <Field id={`${prefix}-name`} name="name" label="Name" defaultValue={category?.name} required error={fields?.name?.[0]} />
        <Field id={`${prefix}-sort`} name="sortOrder" label="Sort" type="number" min="0" step="1" defaultValue={category?.sortOrder ?? nextSort ?? 0} required error={fields?.sortOrder?.[0]} />
        <Field id={`${prefix}-from`} name="servedFrom" label="Served from" type="time" defaultValue={category?.servedFrom ?? ""} error={fields?.servedFrom?.[0]} />
        <Field id={`${prefix}-until`} name="servedUntil" label="Served until" type="time" defaultValue={category?.servedUntil ?? ""} />
      </div>
      <p className="text-xs text-stone">Leave the times empty if it is served all day.{category ? ` Its address stays /menu/${category.slug}.` : " Its address is set from the name and does not change."}</p>
      <FormResult error={state.error} saved={state.ok ? "Saved." : false} pending={pending} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving..." : category ? "Save" : "Add category"}
      </Button>
    </form>
  );
}
