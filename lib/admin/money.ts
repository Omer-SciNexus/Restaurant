// Money and percentages typed into admin forms. They are parsed as text, never through a
// float, so "19.99" is always exactly 1999 cents.

import { z } from "zod";

const DOLLARS = /^\d{1,7}(\.\d{1,2})?$/;
const PERCENT = /^\d{1,2}(\.\d{1,2})?$/;

function toHundredths(text: string): number {
  const [whole, fraction = ""] = text.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/** "12.5" or "$12.50" becomes 1250. Anything else, such as "1e3", "-5" or "12,50", is null. */
export function dollarsToCents(input: string): number | null {
  const text = input.trim().replace(/^\$\s*/, "");
  return DOLLARS.test(text) ? toHundredths(text) : null;
}

/** 1250 becomes "12.50", for the value of a form field. */
export function centsToDollars(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

/** "8.25" or "8.25%" becomes 825 basis points. */
export function percentToBps(input: string): number | null {
  const text = input.trim().replace(/\s*%$/, "");
  return PERCENT.test(text) ? toHundredths(text) : null;
}

export function bpsToPercent(bps: number): string {
  return centsToDollars(bps);
}

/** A required dollar amount from a form, as integer cents. */
export function dollarsField(label: string) {
  return z.string(`Enter ${label} in dollars, like 12.50.`).transform((value, ctx) => {
    const cents = dollarsToCents(value);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: `Enter ${label} in dollars, like 12.50.` });
      return z.NEVER;
    }
    return cents;
  });
}

/** The same, but an empty field means "not set" and becomes null. */
export function optionalDollarsField(label: string) {
  return z
    .string()
    .optional()
    .transform((value, ctx) => {
      if (!value || !value.trim()) return null;
      const cents = dollarsToCents(value);
      if (cents === null) {
        ctx.addIssue({ code: "custom", message: `Enter ${label} in dollars, like 12.50, or leave it empty.` });
        return z.NEVER;
      }
      return cents;
    });
}

/** A checkbox: present and "on" when ticked, absent otherwise. */
export const checkboxField = z
  .string()
  .optional()
  .transform((value) => value === "on");
