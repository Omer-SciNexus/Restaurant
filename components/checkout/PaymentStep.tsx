"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatMoney } from "@/lib/domain";
import { Button } from "../ui/Button";
import { FormError } from "../ui/Form";

export type StartedPayment = {
  orderId: string;
  reference: string;
  totalCents: number;
  payment:
    | { provider: "STRIPE"; paymentId: string; clientSecret: string }
    | { provider: "PAYPAL"; paymentId: string; paypalOrderId: string }
    | { provider: "SIMULATED"; paymentId: string };
};

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
let stripePromise: ReturnType<typeof loadStripe> | undefined;

/** Stripe's script is large, so it loads when a card payment starts, not with the page. */
function getStripe() {
  stripePromise ??= loadStripe(stripeKey!);
  return stripePromise;
}

type PaymentStepProps = {
  started: StartedPayment;
  onPaid: (orderId: string) => void;
  /** Where Stripe sends the guest back to. Defaults to the order tracking page. */
  returnPath?: string;
  /** Replaces the line about the kitchen, for payments that are not food orders. */
  note?: string;
};

export function PaymentStep({ started, onPaid, returnPath, note }: PaymentStepProps) {
  const { payment, orderId, reference, totalCents } = started;
  return (
    <section aria-labelledby="pay">
      <h2 id="pay" className="font-heading text-2xl">
        Pay {formatMoney(totalCents)}
      </h2>
      <p className="mt-1 text-sm text-stone">{note ?? `Order ${reference}. We send it to the kitchen as soon as payment is confirmed.`}</p>
      <div className="mt-4 rounded-brand bg-paper p-5 shadow-soft">
        {payment.provider === "STRIPE" && stripeKey ? (
          <Elements stripe={getStripe()} options={{ clientSecret: payment.clientSecret, appearance: { variables: { colorPrimary: "#2f5d3a", borderRadius: "12px", fontFamily: "Inter, system-ui, sans-serif" } } }}>
            <StripeForm returnPath={returnPath ?? `/order/${orderId}?paid=1`} totalCents={totalCents} />
          </Elements>
        ) : payment.provider === "PAYPAL" ? (
          <PaypalButtons orderId={orderId} paymentId={payment.paymentId} paypalOrderId={payment.paypalOrderId} onPaid={onPaid} />
        ) : payment.provider === "SIMULATED" ? (
          <SimulatedForm orderId={orderId} paymentId={payment.paymentId} totalCents={totalCents} onPaid={onPaid} />
        ) : (
          <FormError message="Card payments are not set up on this site." />
        )}
      </div>
    </section>
  );
}

function StripeForm({ returnPath, totalCents }: { returnPath: string; totalCents: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    // On success Stripe redirects back to the page, which then confirms the payment.
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}${returnPath}` },
    });
    setError(result.error?.message ?? "Your payment could not be completed.");
    setSubmitting(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PaymentElement />
      <FormError message={error} />
      <Button type="submit" size="lg" className="w-full" disabled={!stripe || submitting}>
        {submitting ? "Paying..." : `Pay ${formatMoney(totalCents)}`}
      </Button>
    </form>
  );
}

type PaypalNamespace = {
  Buttons: (options: {
    createOrder: () => string;
    onApprove: () => Promise<void>;
    onError: () => void;
  }) => { render: (element: HTMLElement) => void };
};

function PaypalButtons({ orderId, paymentId, paypalOrderId, onPaid }: { orderId: string; paymentId: string; paypalOrderId: string; onPaid: (orderId: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    if (!clientId) return;
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD`;
    script.onload = () => {
      const paypal = (window as unknown as { paypal?: PaypalNamespace }).paypal;
      if (!paypal || !container.current) return;
      paypal
        .Buttons({
          createOrder: () => paypalOrderId,
          onApprove: async () => {
            const response = await fetch("/api/v1/payments/paypal/capture", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentId }),
            });
            if (response.ok) onPaid(orderId);
            else setError("PayPal could not complete this payment. You have not been charged.");
          },
          onError: () => setError("PayPal could not start. Please try again."),
        })
        .render(container.current);
    };
    document.body.appendChild(script);
    return () => script.remove();
  }, [onPaid, orderId, paymentId, paypalOrderId]);

  return (
    <div className="space-y-4">
      <div ref={container} />
      <FormError message={error} />
    </div>
  );
}

/** Local development only: the server refuses this provider in production. */
function SimulatedForm({ orderId, paymentId, totalCents, onPaid }: { orderId: string; paymentId: string; totalCents: number; onPaid: (orderId: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function send(outcome: "succeed" | "decline") {
    setSubmitting(true);
    setError(null);
    const response = await fetch("/api/v1/payments/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, outcome }),
    });
    setSubmitting(false);
    if (response.ok) {
      onPaid(orderId);
      return;
    }
    const body = await response.json();
    setError(body.error?.message ?? "The payment failed.");
  }

  return (
    <div className="space-y-4">
      <p className="rounded-brand bg-honey/20 p-3 text-sm">
        <strong>Test mode.</strong> No payment keys are set, so this step is simulated and no money moves.
      </p>
      <FormError message={error} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" size="lg" className="flex-1" disabled={submitting} onClick={() => send("succeed")}>
          Simulate paying {formatMoney(totalCents)}
        </Button>
        <Button type="button" size="lg" variant="secondary" disabled={submitting} onClick={() => send("decline")}>
          Simulate a declined card
        </Button>
      </div>
    </div>
  );
}
