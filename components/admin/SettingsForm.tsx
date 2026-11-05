"use client";

import { updateSettingsAction } from "@/lib/actions/admin-settings";
import { centsToDollars } from "@/lib/admin/money";
import { Button } from "../ui/Button";
import { Field } from "../ui/Form";
import { FormResult } from "./FormResult";
import { useAdminForm } from "./useAdminForm";

type Settings = {
  freeDeliveryAboveCents: number | null;
  depositPerGuestCents: number;
  depositMinParty: number;
  freeCancelHours: number;
  cateringMinCents: number | null;
  cateringLeadDays: number;
};

const money = (cents: number | null) => (cents === null ? "" : centsToDollars(cents));

export function SettingsForm({ settings }: { settings: Settings }) {
  const { state, pending, formProps } = useAdminForm(updateSettingsAction);
  const fields = state.fields;
  return (
    <form {...formProps} className="space-y-6 rounded-brand bg-paper p-5 shadow-soft">
      <fieldset>
        <legend className="font-heading text-xl">Delivery</legend>
        <div className="mt-2 max-w-xs">
          <Field name="freeDeliveryAboveCents" label="Free delivery above (USD)" inputMode="decimal" autoComplete="off" defaultValue={money(settings.freeDeliveryAboveCents)} hint="Leave empty for no free delivery." error={fields?.freeDeliveryAboveCents?.[0]} />
        </div>
      </fieldset>
      <fieldset>
        <legend className="font-heading text-xl">Table deposits</legend>
        <div className="mt-2 grid gap-4 sm:grid-cols-3">
          <Field name="depositPerGuestCents" label="Deposit per guest (USD)" inputMode="decimal" autoComplete="off" defaultValue={money(settings.depositPerGuestCents)} required error={fields?.depositPerGuestCents?.[0]} />
          <Field name="depositMinParty" label="Deposit from a party of" type="number" min="1" step="1" defaultValue={settings.depositMinParty} required error={fields?.depositMinParty?.[0]} />
          <Field name="freeCancelHours" label="Free cancellation until (hours before)" type="number" min="0" step="1" defaultValue={settings.freeCancelHours} required error={fields?.freeCancelHours?.[0]} />
        </div>
      </fieldset>
      <fieldset>
        <legend className="font-heading text-xl">Catering</legend>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <Field name="cateringMinCents" label="Catering minimum (USD)" inputMode="decimal" autoComplete="off" defaultValue={money(settings.cateringMinCents)} hint="Leave empty for no minimum." error={fields?.cateringMinCents?.[0]} />
          <Field name="cateringLeadDays" label="Catering lead time (days)" type="number" min="0" step="1" defaultValue={settings.cateringLeadDays} required error={fields?.cateringLeadDays?.[0]} />
        </div>
      </fieldset>
      <FormResult error={state.error} saved={state.ok ? "Saved. New orders and bookings use these values." : false} pending={pending} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save settings"}
      </Button>
    </form>
  );
}
