"use client";

import { useState } from "react";
import { refundOrderAction, type RefundState } from "@/lib/actions/admin-orders";
import { centsToDollars, dollarsToCents } from "@/lib/admin/money";
import { formatMoney } from "@/lib/domain";
import { Button } from "../ui/Button";
import { Field } from "../ui/Form";
import { FormResult } from "./FormResult";
import { useAdminForm } from "./useAdminForm";

/**
 * One amount box for full and partial refunds, so money only moves on a figure the admin
 * can read on the button. The server converts and checks the amount again.
 */
export function RefundForm({ orderId, paymentId, leftCents }: { orderId: string; paymentId: string; leftCents: number }) {
  const { state, pending, formProps } = useAdminForm<RefundState>(refundOrderAction.bind(null, orderId, paymentId));
  const [amount, setAmount] = useState("");
  const cents = dollarsToCents(amount);
  const fieldId = `amount-${paymentId}`;

  return (
    <form {...formProps} className="mt-3 max-w-md space-y-3">
      <Field
        id={fieldId}
        name="amount"
        label="Refund amount (USD)"
        inputMode="decimal"
        autoComplete="off"
        placeholder={centsToDollars(leftCents)}
        hint={`Up to ${formatMoney(leftCents)}.`}
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Refunding..." : cents ? `Refund ${formatMoney(cents)}` : "Refund"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setAmount(centsToDollars(leftCents))}>
          Fill in all that is left
        </Button>
      </div>
      <FormResult error={state.error} saved={state.ok ? state.message : false} pending={pending} />
    </form>
  );
}
