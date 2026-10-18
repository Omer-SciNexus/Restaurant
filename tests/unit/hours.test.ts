import { describe, expect, it } from "vitest";
import { formatTime, isInSeason, isOpenAt, isServedAt, localTime, orderTimeSlots, zonedToUtc, type OpeningHours } from "@/lib/hours";

const TZ = "America/Chicago";
const hours: OpeningHours = {
  mon: [{ open: "07:00", close: "21:00" }],
  sun: [],
};

describe("zonedToUtc and localTime", () => {
  it("handles standard time (UTC-6) and daylight time (UTC-5)", () => {
    expect(zonedToUtc("2026-01-15", "12:00", TZ).toISOString()).toBe("2026-01-15T18:00:00.000Z");
    expect(zonedToUtc("2026-07-15", "12:00", TZ).toISOString()).toBe("2026-07-15T17:00:00.000Z");
  });

  it("round-trips in branch time", () => {
    const local = localTime(zonedToUtc("2026-11-02", "07:30", TZ), TZ);
    expect(local).toEqual({ weekday: "mon", minutes: 450, isoDate: "2026-11-02" });
  });

  it("gives the branch's date, not UTC's, late in the evening", () => {
    // 03:00 UTC on Tuesday is still 21:00 on Monday in Chicago.
    expect(localTime(new Date("2026-11-03T03:00:00Z"), TZ).isoDate).toBe("2026-11-02");
  });
});

describe("isOpenAt", () => {
  it("includes the opening minute and excludes the closing minute", () => {
    expect(isOpenAt(hours, zonedToUtc("2026-11-02", "07:00", TZ), TZ)).toBe(true);
    expect(isOpenAt(hours, zonedToUtc("2026-11-02", "20:59", TZ), TZ)).toBe(true);
    expect(isOpenAt(hours, zonedToUtc("2026-11-02", "21:00", TZ), TZ)).toBe(false);
    expect(isOpenAt(hours, zonedToUtc("2026-11-02", "06:59", TZ), TZ)).toBe(false);
  });

  it("is closed on a closed day and on a day with no entry", () => {
    expect(isOpenAt(hours, zonedToUtc("2026-11-01", "12:00", TZ), TZ)).toBe(false);
    expect(isOpenAt(hours, zonedToUtc("2026-11-03", "12:00", TZ), TZ)).toBe(false);
  });
});

describe("isServedAt", () => {
  it("serves breakfast from 07:00 until just before 11:00", () => {
    const at = (hhmm: string) => isServedAt("07:00", "11:00", zonedToUtc("2026-11-02", hhmm, TZ), TZ);
    expect(at("06:59")).toBe(false);
    expect(at("07:00")).toBe(true);
    expect(at("10:59")).toBe(true);
    expect(at("11:00")).toBe(false);
  });

  it("always serves a category with no window", () => {
    expect(isServedAt(null, null, new Date(), TZ)).toBe(true);
  });
});

describe("isInSeason", () => {
  const from = new Date("2026-10-01T00:00:00Z");
  const to = new Date("2027-03-31T00:00:00Z");

  it("checks both ends and allows open ends", () => {
    expect(isInSeason(from, to, new Date("2026-12-01T00:00:00Z"))).toBe(true);
    expect(isInSeason(from, to, new Date("2026-09-01T00:00:00Z"))).toBe(false);
    expect(isInSeason(from, to, new Date("2027-04-01T00:00:00Z"))).toBe(false);
    expect(isInSeason(null, null, new Date())).toBe(true);
  });
});

describe("orderTimeSlots", () => {
  it("starts after the prep lead time on a 15-minute grid and stops before closing", () => {
    const slots = orderTimeSlots(hours, zonedToUtc("2026-11-02", "20:05", TZ), TZ);
    expect(slots.map((s) => s.label)).toEqual(["8:30pm", "8:45pm"]);
  });

  it("has no slots when closed or past closing", () => {
    expect(orderTimeSlots(hours, zonedToUtc("2026-11-01", "12:00", TZ), TZ)).toEqual([]);
    expect(orderTimeSlots(hours, zonedToUtc("2026-11-02", "20:50", TZ), TZ)).toEqual([]);
  });

  it("does not offer times before opening", () => {
    const slots = orderTimeSlots(hours, zonedToUtc("2026-11-02", "03:00", TZ), TZ);
    expect(slots[0]?.label).toBe("7am");
  });
});

describe("formatTime", () => {
  it("formats 12-hour labels", () => {
    expect(formatTime("00:00")).toBe("12am");
    expect(formatTime("07:30")).toBe("7:30am");
    expect(formatTime("12:00")).toBe("12pm");
    expect(formatTime("21:15")).toBe("9:15pm");
  });
});
