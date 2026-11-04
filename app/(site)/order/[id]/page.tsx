import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { OrderTracker } from "@/components/checkout/OrderTracker";
import { ApiError } from "@/lib/api";
import { services } from "@/lib/env";
import { loadOrderForViewer, publicOrderView } from "@/lib/orders/access";
import { markPaymentSucceeded } from "@/lib/orders/service";
import { stripeIntentSucceeded } from "@/lib/payments/stripe";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  try {
    return await loadOrderForViewer(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) redirect(`/login?next=/order/${id}`);
    throw error;
  }
}

export default async function OrderPage({ params }: Props) {
  const { id } = await params;
  let order = await load(id);
  if (!order) notFound();

  // Returning from Stripe: confirm straight away instead of waiting for the webhook.
  const stripePayment = order.payments.find((payment) => payment.provider === "STRIPE" && payment.status === "PENDING");
  if (stripePayment?.providerRef && services.stripe && (await stripeIntentSucceeded(stripePayment.providerRef))) {
    await markPaymentSucceeded(stripePayment.id);
    order = await load(id);
    if (!order) notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-8 sm:px-6">
      <OrderTracker initial={publicOrderView(order)} />
    </div>
  );
}
