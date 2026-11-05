import { ApiError } from "../api";
import { prisma } from "../db";
import { isProduction, services } from "../env";
import { createPaypalOrder, refundPaypal } from "./paypal";
import { createStripeIntent, refundStripe } from "./stripe";

export type PaymentMethod = "card" | "paypal";
export type PaymentPurpose = "ORDER" | "RESERVATION_DEPOSIT" | "EVENT_DEPOSIT";

export type CheckoutPayment =
  | { provider: "STRIPE"; paymentId: string; clientSecret: string }
  | { provider: "PAYPAL"; paymentId: string; paypalOrderId: string }
  | { provider: "SIMULATED"; paymentId: string };

/** The simulated provider exists for local work only. In production it is an error. */
export function simulatedPaymentsAllowed(): boolean {
  return !isProduction;
}

export async function startPayment(input: {
  method: PaymentMethod;
  amountCents: number;
  purpose: PaymentPurpose;
  orderId?: string;
  receiptEmail?: string;
}): Promise<CheckoutPayment> {
  const configured = input.method === "card" ? services.stripe : services.paypal;
  const provider = configured ? (input.method === "card" ? "STRIPE" : "PAYPAL") : "SIMULATED";
  if (provider === "SIMULATED" && !simulatedPaymentsAllowed()) {
    throw new ApiError(503, "PAYMENTS_UNAVAILABLE", "Payments are not available right now.");
  }

  const payment = await prisma.payment.create({
    data: { provider, amountCents: input.amountCents, purpose: input.purpose, orderId: input.orderId },
  });

  if (provider === "STRIPE") {
    const { providerRef, clientSecret } = await createStripeIntent(
      input.amountCents,
      { paymentId: payment.id, orderId: input.orderId ?? "", purpose: input.purpose },
      input.receiptEmail,
    );
    await prisma.payment.update({ where: { id: payment.id }, data: { providerRef } });
    return { provider, paymentId: payment.id, clientSecret };
  }
  if (provider === "PAYPAL") {
    const { providerRef } = await createPaypalOrder(input.amountCents, payment.id);
    await prisma.payment.update({ where: { id: payment.id }, data: { providerRef } });
    return { provider, paymentId: payment.id, paypalOrderId: providerRef };
  }
  return { provider, paymentId: payment.id };
}

/** Refunds up to what is left on a payment. Returns the amount refunded now. */
export async function refundPayment(paymentId: string, amountCents?: number): Promise<number> {
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (payment.status !== "SUCCEEDED" && payment.status !== "PARTIALLY_REFUNDED") return 0;

  const remaining = payment.amountCents - payment.refundedAmountCents;
  const amount = amountCents ?? remaining;
  if (amount <= 0 || amount > remaining) {
    throw new ApiError(422, "BAD_REFUND_AMOUNT", "That is more than what is left on this payment.");
  }

  // Claim the amount before the provider moves any money, conditional on what we read, so two
  // refunds at the same moment cannot both pass the check above.
  const refunded = payment.refundedAmountCents + amount;
  const claimed = await prisma.payment.updateMany({
    where: { id: payment.id, status: payment.status, refundedAmountCents: payment.refundedAmountCents },
    data: { refundedAmountCents: refunded, status: refunded >= payment.amountCents ? "REFUNDED" : "PARTIALLY_REFUNDED" },
  });
  if (claimed.count === 0) {
    throw new ApiError(409, "REFUND_CONFLICT", "This payment has just changed. Please refresh and check before refunding.");
  }

  const idempotencyKey = `nf-refund-${payment.id}-${payment.refundedAmountCents}-${amount}`;
  try {
    if (payment.provider === "STRIPE") {
      await refundStripe(payment.providerRef!, amount, idempotencyKey);
    } else if (payment.provider === "PAYPAL") {
      await refundPaypal(payment.captureRef!, amount, idempotencyKey);
    }
  } catch (error) {
    await releaseRefundClaim(payment.id, amount);
    throw error;
  }
  return amount;
}

/** The provider refused, so no money moved: hand the claimed amount back. */
async function releaseRefundClaim(paymentId: string, amount: number): Promise<void> {
  try {
    const released = await prisma.payment.update({ where: { id: paymentId }, data: { refundedAmountCents: { decrement: amount } } });
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: released.refundedAmountCents > 0 ? "PARTIALLY_REFUNDED" : "SUCCEEDED" },
    });
  } catch (error) {
    console.error("Refund failed and its claim could not be released; fix this payment by hand", paymentId, amount, error);
  }
}
