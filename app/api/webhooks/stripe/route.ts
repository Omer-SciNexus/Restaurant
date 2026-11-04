import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { markPaymentFailed, markPaymentSucceeded } from "@/lib/orders/service";
import { stripe } from "@/lib/payments/stripe";

/** Stripe calls this after a payment. The signature proves the call really came from Stripe. */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Stripe retries on failure, so each event is applied at most once.
  const seen = await prisma.processedWebhook.findUnique({ where: { id: event.id } });
  if (seen) return NextResponse.json({ received: true });

  if (event.type === "payment_intent.succeeded" || event.type === "payment_intent.payment_failed") {
    const intent = event.data.object;
    const payment = await prisma.payment.findUnique({ where: { providerRef: intent.id } });
    if (payment) {
      if (event.type === "payment_intent.succeeded") await markPaymentSucceeded(payment.id);
      else await markPaymentFailed(payment.id);
    }
  }

  await prisma.processedWebhook.create({ data: { id: event.id } });
  return NextResponse.json({ received: true });
}
