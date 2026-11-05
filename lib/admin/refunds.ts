// Refund rules, apart from the database and the payment providers. lib/payments refuses an
// amount over what is left; this is where a typed amount becomes cents, and the guest's email.

import { formatMoney } from "../domain";
import { dollarsToCents } from "./money";

type RefundablePayment = { status: string; amountCents: number; refundedAmountCents: number };

export function refundableCents(payment: RefundablePayment): number {
  if (payment.status !== "SUCCEEDED" && payment.status !== "PARTIALLY_REFUNDED") return 0;
  return Math.max(0, payment.amountCents - payment.refundedAmountCents);
}

/** A refund amount typed in dollars, as integer cents, or the reason it cannot be used. */
export function parseRefundAmount(input: string, left: number): { cents: number } | { error: string } {
  const cents = dollarsToCents(input);
  if (cents === null) return { error: "Enter the amount in dollars, like 12.50." };
  if (cents === 0) return { error: "Enter an amount above $0." };
  if (cents > left) return { error: `That is more than what is left on this payment (${formatMoney(left)}).` };
  return { cents };
}

export function refundEmail(order: { reference: string }, refundedCents: number, leftCents: number): { subject: string; text: string } {
  const outcome = leftCents > 0 ? `The rest of your payment, ${formatMoney(leftCents)}, stays as it was.` : "That is the full amount left on this order.";
  return {
    subject: `Order ${order.reference}: refund of ${formatMoney(refundedCents)}`,
    text: `We have refunded ${formatMoney(refundedCents)} for your order ${order.reference}. ${outcome}\n\nIt goes back to the card or account you paid with, and your bank can take a few days to show it.`,
  };
}
