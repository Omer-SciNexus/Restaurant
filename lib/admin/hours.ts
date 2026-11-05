// Opening hours and serving windows as typed into admin forms. The rest of the app assumes
// these are clean: lib/hours.ts compares "HH:mm" as minutes and has no notion of a range
// that runs past midnight, so anything else has to stop here.

import { z } from "zod";
import { toMinutes, WEEKDAYS, type OpeningHours, type TimeRange, type Weekday } from "../hours";

export const DAY_NAMES: Record<Weekday, string> = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};

/** Monday first, the way a week is read on a branch's hours. */
export const WEEK_ORDER: readonly Weekday[] = [...WEEKDAYS.slice(1), WEEKDAYS[0]];

/** Two openings a day covers a split lunch and dinner service. */
export const MAX_RANGES_PER_DAY = 2;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTime(value: string): boolean {
  return HHMM.test(value);
}

/** What is wrong with one day's openings, or null when they are fine. */
export function rangesProblem(ranges: readonly TimeRange[]): string | null {
  if (ranges.length > MAX_RANGES_PER_DAY) return `A day can have at most ${MAX_RANGES_PER_DAY} openings.`;
  for (const range of ranges) {
    if (!range.open || !range.close) return "Enter both an opening and a closing time, or leave both empty.";
    if (!isValidTime(range.open) || !isValidTime(range.close)) return "Use 24-hour times, like 07:00.";
    if (toMinutes(range.open) >= toMinutes(range.close)) return "The opening time must be before the closing time.";
  }
  const ordered = [...ranges].sort((a, b) => toMinutes(a.open) - toMinutes(b.open));
  for (let i = 1; i < ordered.length; i++) {
    if (toMinutes(ordered[i]!.open) < toMinutes(ordered[i - 1]!.close)) return "The two openings overlap.";
  }
  return null;
}

const rangeSchema = z.object({ open: z.string(), close: z.string() });

const dayEntries = Object.fromEntries(WEEKDAYS.map((day) => [day, z.array(rangeSchema)])) as Record<Weekday, z.ZodArray<typeof rangeSchema>>;

/** Every day of the week, each with its openings in order. An empty list means closed. */
export const openingHoursSchema = z
  .object(dayEntries)
  .superRefine((hours, ctx) => {
    for (const day of WEEK_ORDER) {
      const problem = rangesProblem(hours[day]);
      // The day goes in the message because a form shows these errors as one list.
      if (problem) ctx.addIssue({ code: "custom", message: `${DAY_NAMES[day]}: ${problem}` });
    }
  })
  .transform((hours) => Object.fromEntries(WEEKDAYS.map((day) => [day, [...hours[day]].sort((a, b) => toMinutes(a.open) - toMinutes(b.open))])) as Record<Weekday, TimeRange[]>);

export function hoursFieldName(day: Weekday, edge: "open" | "close", index: number): string {
  return `${day}-${edge}-${index}`;
}

/** Reads the hours fields. A range with both times empty is no range, so empty means closed. */
export function hoursFromForm(form: FormData): Record<Weekday, TimeRange[]> {
  const read = (name: string) => String(form.get(name) ?? "").trim();
  const week = {} as Record<Weekday, TimeRange[]>;
  for (const day of WEEKDAYS) {
    week[day] = [];
    for (let index = 0; index < MAX_RANGES_PER_DAY; index++) {
      const open = read(hoursFieldName(day, "open", index));
      const close = read(hoursFieldName(day, "close", index));
      if (open || close) week[day].push({ open, close });
    }
  }
  return week;
}

/** A day's openings as stored, safe to read even if a row predates these rules. */
export function dayRanges(hours: OpeningHours, day: Weekday): readonly TimeRange[] {
  return hours[day] ?? [];
}

/** A category's serving window: both times or neither, and from before until. */
export function servingWindowProblem(from: string | null, until: string | null): string | null {
  if (!from && !until) return null;
  if (!from || !until) return "Enter both times, or leave both empty for all day.";
  if (!isValidTime(from) || !isValidTime(until)) return "Use 24-hour times, like 07:00.";
  if (toMinutes(from) >= toMinutes(until)) return "The start time must be before the end time.";
  return null;
}
