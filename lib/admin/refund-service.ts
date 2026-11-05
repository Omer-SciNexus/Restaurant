import { ApiError } from "../api";
import { prisma } from "../db";
import { sendEmail } from "../notify";
import { refundPayment } from "../payments";
import { parseRefundAmount, refundableCents, refundEmail } from "./refunds";

/**
 * Refunds part or all of one payment on an order, and tells the guest by email. The payment
 * must belong to that order, and the amount is checked against what is left right now.
 */
export async function refundOrderPayment(orderId: string, paymentId: string, amountInDollars: string, actorId: string) {
  const payment = await prisma.payment.findFirst({ where: { id: paymentId, orderId, purpose: "ORDER" }, include: { order: true } });
  if (!payment?.order) throw new ApiError(404, "PAYMENT_NOT_FOUND", "We could not find that payment on this order.");
  const { order } = payment;

  const left = refundableCents(payment);
  if (left === 0) throw new ApiError(409, "NOTHING_TO_REFUND", "There is nothing left to refund on this payment.");
  const parsed = parseRefundAmount(amountInDollars, left);
  if ("error" in parsed) throw new ApiError(422, "BAD_REFUND_AMOUNT", parsed.error);

  const refunded = await refundPayment(paymentId, parsed.cents);
  const leftCents = left - refunded;

  console.info(`[refund] ${order.reference}: ${refunded} cents by user ${actorId}`);
  const email = refundEmail(order, refunded, leftCents);
  await sendEmail(order.customerEmail, email.subject, email.text);
  return { amountCents: refunded, leftCents, email: order.customerEmail };
}
