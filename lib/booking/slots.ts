// Table slots. Plain functions, so every rule has a unit test. All dates and times are in
// branch time; a slot's exact instant only comes from zonedToUtc.

import { formatTime, fromMinutes, localTime, toMinutes, WEEKDAYS, zonedToUtc, type OpeningHours } from "../hours";

export const SLOT_MINUTES = 30;
export const LAST_SEATING_MINUTES_BEFORE_CLOSE = 60;
export const BOOKING_HORIZON_DAYS = 60;
export const DEPOSIT_HOLD_MINUTES = 30;

export type Slot = { iso: string; time: string; label: string };

export function isRealDate(isoDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day;
}

/** Calendar arithmetic only, so a daylight saving change can never shift the date. */
export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day! + days)).toISOString().slice(0, 10);
}

/** The first and last dates a guest can book, in branch time. */
export function bookingWindow(at: Date, timezone: string): { today: string; lastDate: string } {
  const today = localTime(at, timezone).isoDate;
  return { today, lastDate: addDays(today, BOOKING_HORIZON_DAYS) };
}

export function isBookableDate(isoDate: string, at: Date, timezone: string): boolean {
  if (!isRealDate(isoDate)) return false;
  const { today, lastDate } = bookingWindow(at, timezone);
  // ISO dates sort as text.
  return isoDate >= today && isoDate <= lastDate;
}

/** Every slot the opening hours allow on one date, whether or not it has passed. */
export function daySlots(hours: OpeningHours, isoDate: string, timezone: string): Slot[] {
  if (!isRealDate(isoDate)) return [];
  const [year, month, day] = isoDate.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay()]!;
  const slots = new Map<string, Slot>();
  for (const range of hours[weekday] ?? []) {
    const lastSeating = toMinutes(range.close) - LAST_SEATING_MINUTES_BEFORE_CLOSE;
    const first = Math.ceil(toMinutes(range.open) / SLOT_MINUTES) * SLOT_MINUTES;
    for (let minutes = first; minutes <= lastSeating; minutes += SLOT_MINUTES) {
      const time = fromMinutes(minutes);
      const instant = zonedToUtc(isoDate, time, timezone);
      // The hour skipped when the clocks go forward does not exist, so it cannot be booked.
      const local = localTime(instant, timezone);
      if (local.isoDate !== isoDate || local.minutes !== minutes) continue;
      slots.set(time, { iso: instant.toISOString(), time, label: formatTime(time) });
    }
  }
  return [...slots.values()].sort((a, b) => a.iso.localeCompare(b.iso));
}

/** What a guest can pick on one date: in the booking window, and still in the future. */
export function bookableSlots(hours: OpeningHours, isoDate: string, timezone: string, at: Date): Slot[] {
  if (!isBookableDate(isoDate, at, timezone)) return [];
  return daySlots(hours, isoDate, timezone).filter((slot) => new Date(slot.iso) > at);
}

/** Checks an instant sent by a browser against the slots we would have offered. */
export function findBookableSlot(hours: OpeningHours, startsAt: Date, timezone: string, at: Date): Slot | null {
  const { isoDate } = localTime(startsAt, timezone);
  return bookableSlots(hours, isoDate, timezone, at).find((slot) => slot.iso === startsAt.toISOString()) ?? null;
}

// ---- Capacity

export type SeatRow = { status: string; partySize: number; createdAt: Date };

/** A table waiting for its deposit is held for 30 minutes. At exactly 30 minutes it still holds. */
export function isHoldActive(createdAt: Date, at: Date): boolean {
  return at.getTime() - createdAt.getTime() <= DEPOSIT_HOLD_MINUTES * 60_000;
}

export function holdEndsAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + DEPOSIT_HOLD_MINUTES * 60_000);
}

export function countsTowardCapacity(row: SeatRow, at: Date): boolean {
  if (row.status === "CONFIRMED" || row.status === "SEATED") return true;
  return row.status === "PENDING_DEPOSIT" && isHoldActive(row.createdAt, at);
}

export function seatsTaken(rows: readonly SeatRow[], at: Date): number {
  return rows.filter((row) => countsTowardCapacity(row, at)).reduce((sum, row) => sum + row.partySize, 0);
}

export function fitsInSlot(capacity: number, rows: readonly SeatRow[], partySize: number, at: Date): boolean {
  return seatsTaken(rows, at) + partySize <= capacity;
}

// ---- Wording, in branch time

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "Friday 6 November", the same on every server and browser. */
export function formatDay(isoDate: string, withYear = false): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const weekday = new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay();
  return `${DAY_NAMES[weekday]} ${day} ${MONTH_NAMES[month! - 1]}${withYear ? ` ${year}` : ""}`;
}

/** "Friday 6 November at 1:30pm". */
export function formatWhen(instant: Date, timezone: string): string {
  const { isoDate, minutes } = localTime(instant, timezone);
  return `${formatDay(isoDate)} at ${formatTime(fromMinutes(minutes))}`;
}
