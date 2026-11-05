import { services } from "../env";
import { markPaymentSucceeded } from "../orders/service";
import { stripeIntentSucceeded } from "../payments/stripe";

/**
 * Returning from Stripe: confirm straight away instead of waiting for the webhook, the same
 * way the order page does. Returns true when the payment has just been confirmed.
 */
export async function confirmStripeReturn(payment: { id: string; provider: string; status: string; providerRef: string | null } | null | undefined): Promise<boolean> {
  if (payment?.provider !== "STRIPE" || payment.status !== "PENDING" || !payment.providerRef || !services.stripe) return false;
  if (!(await stripeIntentSucceeded(payment.providerRef))) return false;
  await markPaymentSucceeded(payment.id);
  return true;
}
