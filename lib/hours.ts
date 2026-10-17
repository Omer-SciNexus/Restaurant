// Branch-local time. Every branch has an IANA timezone; all rules are evaluated in it,
// whatever timezone the server or the guest happens to be in.

export const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export type TimeRange = { open: string; close: string };
export type OpeningHours = Partial<Record<Weekday, readonly TimeRange[]>>;

function parts(date: Date, timezone: string) {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(formatted.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

export function toMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours! * 60 + minutes!;
}

export function fromMinutes(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Weekday, minutes since midnight and calendar date, in branch time. */
export function localTime(date: Date, timezone: string) {
  const p = parts(date, timezone);
  const weekday = WEEKDAYS[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()]!;
  const isoDate = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  return { weekday, minutes: p.hour * 60 + p.minute, isoDate };
}

/** Converts a branch-local date and time into the exact instant, including across daylight saving. */
export function zonedToUtc(isoDate: string, hhmm: string, timezone: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  const minutes = toMinutes(hhmm);
  const wallClock = Date.UTC(year!, month! - 1, day!, Math.floor(minutes / 60), minutes % 60);
  const offsetAt = (instant: number) => {
    const p = parts(new Date(instant), timezone);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - instant;
  };
  const first = wallClock - offsetAt(wallClock);
  return new Date(wallClock - offsetAt(first));
}

export function isOpenAt(hours: OpeningHours, date: Date, timezone: string): boolean {
  const { weekday, minutes } = localTime(date, timezone);
  return (hours[weekday] ?? []).some((r) => minutes >= toMinutes(r.open) && minutes < toMinutes(r.close));
}

/** True when a category with a serving window (breakfast 07:00 to 11:00) is being served. */
export function isServedAt(servedFrom: string | null, servedUntil: string | null, date: Date, timezone: string): boolean {
  if (!servedFrom || !servedUntil) return true;
  const { minutes } = localTime(date, timezone);
  return minutes >= toMinutes(servedFrom) && minutes < toMinutes(servedUntil);
}

export function isInSeason(from: Date | null, to: Date | null, date: Date): boolean {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export const PREP_LEAD_MINUTES = 20;

/** Pickup or delivery times left today, every 15 minutes, starting after the kitchen's lead time. */
export function orderTimeSlots(hours: OpeningHours, now: Date, timezone: string): { iso: string; label: string }[] {
  const { weekday, minutes, isoDate } = localTime(now, timezone);
  const earliest = minutes + PREP_LEAD_MINUTES;
  const slots: { iso: string; label: string }[] = [];
  for (const range of hours[weekday] ?? []) {
    const close = toMinutes(range.close);
    for (let m = Math.ceil(Math.max(earliest, toMinutes(range.open)) / 15) * 15; m < close; m += 15) {
      const hhmm = fromMinutes(m);
      slots.push({ iso: zonedToUtc(isoDate, hhmm, timezone).toISOString(), label: formatTime(hhmm) });
    }
  }
  return slots;
}

export function formatTime(hhmm: string): string {
  const total = toMinutes(hhmm);
  const hour = Math.floor(total / 60);
  const suffix = hour >= 12 ? "pm" : "am";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return total % 60 === 0 ? `${twelve}${suffix}` : `${twelve}:${String(total % 60).padStart(2, "0")}${suffix}`;
}
