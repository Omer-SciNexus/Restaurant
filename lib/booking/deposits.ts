// Table deposit rules. The amounts are the owner's to decide, so they always arrive as a
// policy read from the Settings table and never appear as numbers here.

import { formatMoney } from "../domain";
import { formatWhen } from "./slots";

export type DepositPolicy = { depositPerGuestCents: number; depositMinParty: number; freeCancelHours: number };

export function depositCents(partySize: number, policy: DepositPolicy): number {
  return partySize >= policy.depositMinParty ? policy.depositPerGuestCents * partySize : 0;
}

export function refundDeadline(startsAt: Date, freeCancelHours: number): Date {
  return new Date(startsAt.getTime() - freeCancelHours * 3_600_000);
}

/** Refundable when cancelled at least freeCancelHours before the slot: the exact boundary still counts. */
export function isRefundable(startsAt: Date, at: Date, freeCancelHours: number): boolean {
  return at.getTime() <= refundDeadline(startsAt, freeCancelHours).getTime();
}

function hoursText(hours: number): string {
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

/** The rule a guest reads before they book or cancel, with the exact time it changes. */
export function cancellationRule(input: { depositCents: number; startsAt: Date; freeCancelHours: number; timezone: string; at: Date }): string {
  if (input.depositCents === 0) return "There is no deposit for this table, so you can change or cancel it free of charge.";
  const amount = formatMoney(input.depositCents);
  if (!isRefundable(input.startsAt, input.at, input.freeCancelHours)) {
    return `Your table is less than ${hoursText(input.freeCancelHours)} away, so if you cancel, your ${amount} deposit is kept.`;
  }
  const deadline = formatWhen(refundDeadline(input.startsAt, input.freeCancelHours), input.timezone);
  return `Cancel at least ${hoursText(input.freeCancelHours)} before your table, by ${deadline}, and your ${amount} deposit is refunded in full. After that the deposit is kept.`;
}

export const DEPOSIT_STATES = ["NONE", "DUE", "PAID", "REFUNDED", "KEPT", "NOT_PAID"] as const;
export type DepositState = (typeof DEPOSIT_STATES)[number];

const MONEY_HELD = ["SUCCEEDED", "PARTIALLY_REFUNDED"];

/** What is left of a deposit we actually took. */
export function heldCents(payment: { status: string; amountCents: number; refundedAmountCents: number } | null | undefined): number {
  return payment && MONEY_HELD.includes(payment.status) ? payment.amountCents - payment.refundedAmountCents : 0;
}

/** The deposit line a guest and staff see, worked out from the reservation and its payment. */
export function depositState(
  reservation: { status: string; depositAmountCents: number },
  payment: { status: string; amountCents: number; refundedAmountCents: number } | null | undefined,
): DepositState {
  if (payment?.status === "REFUNDED") return "REFUNDED";
  if (heldCents(payment) > 0) return reservation.status === "CANCELLED" || reservation.status === "NO_SHOW" ? "KEPT" : "PAID";
  if (reservation.status === "PENDING_DEPOSIT") return "DUE";
  return reservation.depositAmountCents > 0 && reservation.status === "CANCELLED" ? "NOT_PAID" : "NONE";
}

export const DEPOSIT_LABEL: Record<DepositState, string> = {
  NONE: "No deposit",
  DUE: "Deposit due",
  PAID: "Deposit paid",
  REFUNDED: "Deposit refunded",
  KEPT: "Deposit kept",
  NOT_PAID: "Deposit not paid",
};

export type DepositChange =
  | { ok: true; refundCents: number; newDepositCents: number }
  | { ok: false; reason: "DEPOSIT_INCREASE" | "WINDOW_CLOSED" };

/**
 * What changing a confirmed table does to the deposit already taken.
 * - It can never ask for more money: a larger deposit means a new booking, so one reservation
 *   only ever has one payment to refund.
 * - Inside the free window, a smaller party gets the difference back.
 * - Outside it, the deposit is kept and the table cannot move, otherwise moving it to next
 *   week and cancelling would be a way around the rule.
 */
export function planDepositChange(input: {
  heldCents: number;
  currentParty: number;
  newParty: number;
  moving: boolean;
  refundable: boolean;
  policy: DepositPolicy;
}): DepositChange {
  const { heldCents: held, currentParty, newParty, moving, refundable, policy } = input;
  if (held > 0 && moving && !refundable) return { ok: false, reason: "WINDOW_CLOSED" };
  if (newParty === currentParty) return { ok: true, refundCents: 0, newDepositCents: held };

  const required = depositCents(newParty, policy);
  // A smaller party never owes more, even if the deposit rate has gone up since booking.
  const owed = newParty < currentParty ? Math.min(required, held) : required;
  if (owed > held) return { ok: false, reason: "DEPOSIT_INCREASE" };
  if (!refundable) return { ok: true, refundCents: 0, newDepositCents: held };
  return { ok: true, refundCents: held - owed, newDepositCents: owed };
}
