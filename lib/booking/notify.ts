import { formatMoney } from "../domain";
import { now, siteUrl } from "../env";
import { sendEmail, sendSms } from "../notify";
import { cancellationRule } from "./deposits";
import { formatWhen } from "./slots";

// Guest messages for bookings. As with orders, a failed message is logged and never fails
// the booking that triggered it.

type BranchForNotice = { name: string; timezone: string };
type ReservationForNotice = { id: string; email: string; name: string; partySize: number; startsAt: Date; depositAmountCents: number; branch: BranchForNotice };
type WaitlistForNotice = { id: string; email: string; phone: string; partySize: number; startsAt: Date; branch: BranchForNotice };

function tableLine(r: ReservationForNotice): string {
  return `A table for ${r.partySize} at ${r.branch.name} on ${formatWhen(r.startsAt, r.branch.timezone)}`;
}

function reservationLink(id: string): string {
  return `${siteUrl()}/book/${id}`;
}

export async function notifyBooked(r: ReservationForNotice, freeCancelHours: number): Promise<void> {
  const rule = cancellationRule({ depositCents: r.depositAmountCents, startsAt: r.startsAt, freeCancelHours, timezone: r.branch.timezone, at: now() });
  await sendEmail(r.email, "Your table is booked", `${tableLine(r)} is confirmed.\n\n${rule}\n\nChange or cancel it here: ${reservationLink(r.id)}`);
}

export async function notifyDepositDue(r: ReservationForNotice, holdEnds: string): Promise<void> {
  await sendEmail(
    r.email,
    "Please pay your deposit to confirm your table",
    `${tableLine(r)} is held for you until ${holdEnds}. Pay the ${formatMoney(r.depositAmountCents)} deposit before then to confirm it: ${reservationLink(r.id)}`,
  );
}

export async function notifyChanged(r: ReservationForNotice, freeCancelHours: number, refundedCents: number): Promise<void> {
  const rule = cancellationRule({ depositCents: r.depositAmountCents, startsAt: r.startsAt, freeCancelHours, timezone: r.branch.timezone, at: now() });
  const refund = refundedCents > 0 ? `\n\nWe have refunded ${formatMoney(refundedCents)} of your deposit.` : "";
  await sendEmail(r.email, "Your booking has changed", `${tableLine(r)} is now your booking.${refund}\n\n${rule}\n\nManage it here: ${reservationLink(r.id)}`);
}

export async function notifyCancelled(r: ReservationForNotice, refundedCents: number, keptCents: number): Promise<void> {
  const money =
    refundedCents > 0
      ? ` Your deposit of ${formatMoney(refundedCents)} has been refunded.`
      : keptCents > 0
        ? ` Because it was cancelled inside the deposit window, your deposit of ${formatMoney(keptCents)} has been kept.`
        : "";
  await sendEmail(r.email, "Your booking is cancelled", `${tableLine(r)} has been cancelled.${money}`);
}

/** Money arrived for a table that is no longer held, so it goes straight back. */
export async function notifyLatePaymentRefunded(r: ReservationForNotice, refundedCents: number): Promise<void> {
  await sendEmail(
    r.email,
    "Your deposit has been refunded",
    `Your payment reached us after the hold on your table had ended, so we have refunded ${formatMoney(refundedCents)} in full. ${tableLine(r)} is not booked. You are welcome to book again at ${siteUrl()}/book`,
  );
}

export async function notifyNoShow(r: ReservationForNotice, keptCents: number): Promise<void> {
  const money = keptCents > 0 ? ` Your deposit of ${formatMoney(keptCents)} has been kept.` : "";
  await sendEmail(r.email, "We missed you", `${tableLine(r)} was marked as a no-show.${money}`);
}

function waitlistLink(id: string): string {
  return `${siteUrl()}/book/waitlist/${id}`;
}

export async function notifyWaitlistJoined(entry: WaitlistForNotice): Promise<void> {
  await sendEmail(
    entry.email,
    "You are on the waitlist",
    `You are on the waitlist for ${entry.partySize} at ${entry.branch.name} on ${formatWhen(entry.startsAt, entry.branch.timezone)}. We will email and text you if a table comes free.\n\nSee your place or leave the list: ${waitlistLink(entry.id)}`,
  );
}

/** Told by both email and SMS. The offer does not hold seats, and the message says so. */
export async function notifyWaitlistOffer(entry: WaitlistForNotice): Promise<void> {
  const what = `a table for ${entry.partySize} at ${entry.branch.name} on ${formatWhen(entry.startsAt, entry.branch.timezone)}`;
  const link = waitlistLink(entry.id);
  await Promise.all([
    sendEmail(entry.email, "A table has come free", `Good news: ${what} has come free. We cannot hold it, so please confirm soon: ${link}`),
    sendSms(entry.phone, `Nature Food: ${what} has come free. We cannot hold it, so please confirm soon: ${link}`),
  ]);
}
