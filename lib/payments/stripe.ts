import Stripe from "stripe";

let client: Stripe | null = null;

export function stripe(): Stripe {
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY!);
  return client;
}

export async function createStripeIntent(amountCents: number, metadata: Record<string, string>, receiptEmail?: string) {
  const intent = await stripe().paymentIntents.create(
    {
      amount: amountCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata,
      receipt_email: receiptEmail,
    },
    // A retried request can never create a second charge for the same payment row.
    { idempotencyKey: `nf-${metadata.paymentId}` },
  );
  return { providerRef: intent.id, clientSecret: intent.client_secret! };
}

export async function stripeIntentSucceeded(providerRef: string): Promise<boolean> {
  const intent = await stripe().paymentIntents.retrieve(providerRef);
  return intent.status === "succeeded";
}

export async function refundStripe(providerRef: string, amountCents: number, idempotencyKey: string): Promise<void> {
  await stripe().refunds.create({ payment_intent: providerRef, amount: amountCents }, { idempotencyKey });
}
