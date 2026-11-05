"use client";

import { updateBranchAction } from "@/lib/actions/admin-branches";
import { bpsToPercent, centsToDollars } from "@/lib/admin/money";
import { Button } from "../ui/Button";
import { Field } from "../ui/Form";
import { BranchOperationsFields, type BranchOperations } from "./BranchFields";
import { FormResult } from "./FormResult";
import { useAdminForm } from "./useAdminForm";

type Branch = BranchOperations & { id: string; deliveryFeeCents: number; minOrderCents: number; taxRateBps: number };

export function BranchForm({ branch }: { branch: Branch }) {
  const { state, pending, formProps } = useAdminForm(updateBranchAction.bind(null, branch.id));
  const fields = state.fields;
  return (
    <form {...formProps} className="space-y-6 rounded-brand bg-paper p-5 shadow-soft">
      <BranchOperationsFields branch={branch} fields={fields} />
      <fieldset>
        <legend className="font-heading text-xl">Fees and tax</legend>
        <div className="mt-2 grid gap-4 sm:grid-cols-3">
          <Field name="deliveryFeeCents" label="Delivery fee (USD)" inputMode="decimal" autoComplete="off" defaultValue={centsToDollars(branch.deliveryFeeCents)} required error={fields?.deliveryFeeCents?.[0]} />
          <Field name="minOrderCents" label="Minimum delivery order (USD)" inputMode="decimal" autoComplete="off" defaultValue={centsToDollars(branch.minOrderCents)} required error={fields?.minOrderCents?.[0]} />
          <Field name="taxRateBps" label="Sales tax (%)" inputMode="decimal" autoComplete="off" defaultValue={bpsToPercent(branch.taxRateBps)} required error={fields?.taxRateBps?.[0]} />
        </div>
      </fieldset>
      <FormResult error={state.error} saved={state.ok ? "Saved. New orders and bookings use these values." : false} pending={pending} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save branch"}
      </Button>
    </form>
  );
}
