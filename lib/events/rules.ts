// Event and catering rules, as plain functions.

import { addDays } from "../booking/slots";

export type EventType = "PRIVATE_EVENT" | "CATERING";

/** Catering needs the lead time in Settings. A private event only has to be in the future. */
export function earliestEventDate(type: EventType, today: string, cateringLeadDays: number): string {
  return type === "CATERING" ? addDays(today, cateringLeadDays) : addDays(today, 1);
}

/** "1,250.50" to 125050. Works on the text, so no floating point ever touches the money. */
export function dollarsToCents(text: string): number | null {
  const match = /^\$?\s*(\d{1,7})(?:\.(\d{1,2}))?$/.exec(text.trim().replace(/,/g, ""));
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

export function quoteProblem(quoteCents: number, depositCents: number): string | null {
  if (quoteCents <= 0) return "Enter a quote above zero.";
  if (depositCents <= 0) return "Enter a deposit above zero.";
  if (depositCents > quoteCents) return "The deposit cannot be more than the quote.";
  return null;
}

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  PRIVATE_EVENT: "Private event",
  CATERING: "Catering",
};

export const EVENT_STATUS_LABEL: Record<string, string> = {
  NEW: "Waiting for a quote",
  QUOTED: "Quote sent",
  DEPOSIT_PAID: "Deposit paid",
  DECLINED: "Declined",
  CLOSED: "Closed",
};
