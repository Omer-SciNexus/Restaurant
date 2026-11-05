"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/domain";
import { PaymentStep, type StartedPayment } from "../checkout/PaymentStep";
import { Button } from "../ui/Button";
import { FormError } from "../ui/Form";
import { PaymentMethodChoice, type PaymentChoice } from "./PaymentMethodChoice";

type Props = {
  /** The route that starts the payment. The amount is decided there, never sent from here. */
  endpoint: string;
  id: string;
  amountCents: number;
  returnPath: string;
  note: string;
  testMode: boolean;
  buttonLabel?: string;
  onPaid: () => void;
  onRefused?: () => void;
};

export function DepositPay({ endpoint, id, amountCents, returnPath, note, testMode, buttonLabel, onPaid, onRefused }: Props) {
  const [method, setMethod] = useState<PaymentChoice>("card");
  const [started, setStarted] = useState<StartedPayment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function start() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentMethod: method }) });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error?.message ?? "We could not start the payment.");
        onRefused?.();
        return;
      }
      setStarted({ orderId: id, reference: "", totalCents: amountCents, payment: body.payment });
    } catch {
      setError("We could not reach the server. You have not been charged.");
    } finally {
      setSubmitting(false);
    }
  }

  if (started) return <PaymentStep started={started} onPaid={onPaid} returnPath={returnPath} note={note} />;

  return (
    <div className="space-y-4">
      <PaymentMethodChoice value={method} onChange={setMethod} testMode={testMode} />
      <FormError message={error} />
      <Button type="button" size="lg" className="w-full" disabled={submitting} onClick={start}>
        {submitting ? "Starting payment..." : (buttonLabel ?? `Continue to pay ${formatMoney(amountCents)}`)}
      </Button>
    </div>
  );
}
