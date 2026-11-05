import { describe, expect, it } from "vitest";
import {
  addDays,
  bookableSlots,
  bookingWindow,
  countsTowardCapacity,
  daySlots,
  findBookableSlot,
  fitsInSlot,
  formatDay,
  formatWhen,
  holdEndsAt,
  isBookableDate,
  isHoldActive,
  isRealDate,
  seatsTaken,
} from "@/lib/booking/slots";
import { zonedToUtc, type OpeningHours } from "@/lib/hours";

const TZ = "America/Chicago";
const hours: OpeningHours = {
  mon: [{ open: "07:00", close: "21:00" }],
  tue: [{ open: "08:15", close: "10:00" }],
  wed: [
    { open: "09:00", close: "11:00" },
    { open: "17:00", close: "19:00" },
  ],
  sun: [],
};
const MONDAY = "2026-11-09";
const TUESDAY = "2026-11-10";
const WEDNESDAY = "2026-11-11";
const THURSDAY = "2026-11-12";

const times = (slots: { time: string }[]) => slots.map((slot) => slot.time);

describe("daySlots", () => {
  it("runs every 30 minutes from opening to one hour before closing", () => {
    const slots = daySlots(hours, MONDAY, TZ);
    // 07:00 to 20:00 inclusive is 13 hours of half-hours, plus the first: 27 slots.
    expect(slots).toHaveLength(27);
    expect(slots[0]!.time).toBe("07:00");
    expect(slots[1]!.time).toBe("07:30");
    expect(slots.at(-1)!.time).toBe("20:00");
  });

  it("does not offer a slot under an hour before closing", () => {
    expect(times(daySlots(hours, MONDAY, TZ))).not.toContain("20:30");
  });

  it("starts at the next half hour when a branch opens between them", () => {
    // Opens 08:15, closes 10:00, so the last seating is 09:00.
    expect(times(daySlots(hours, TUESDAY, TZ))).toEqual(["08:30", "09:00"]);
  });

  it("handles a day split into two sittings", () => {
    expect(times(daySlots(hours, WEDNESDAY, TZ))).toEqual(["09:00", "09:30", "10:00", "17:00", "17:30", "18:00"]);
  });

  it("offers nothing on a closed day or a day with no entry", () => {
    expect(daySlots(hours, "2026-11-08", TZ)).toEqual([]);
    expect(daySlots(hours, THURSDAY, TZ)).toEqual([]);
  });

  it("gives each slot's exact instant and a label", () => {
    // Monday 9 November, 12:30 in Chicago, UTC-6.
    const slot = daySlots(hours, MONDAY, TZ).find((s) => s.time === "12:30")!;
    expect(slot.iso).toBe("2026-11-09T18:30:00.000Z");
    expect(slot.label).toBe("12:30pm");
  });
});

describe("daySlots across daylight saving", () => {
  const nightOwl: OpeningHours = { sun: [{ open: "01:00", close: "05:00" }] };

  it("keeps the same wall-clock slots either side of the spring change, an hour apart in UTC", () => {
    const allDay: OpeningHours = { sat: [{ open: "12:00", close: "14:00" }], sun: [{ open: "12:00", close: "14:00" }] };
    // Clocks go forward on Sunday 14 March 2027: noon is 18:00 UTC on Saturday, 17:00 UTC on Sunday.
    expect(daySlots(allDay, "2027-03-13", TZ)[0]!.iso).toBe("2027-03-13T18:00:00.000Z");
    expect(daySlots(allDay, "2027-03-14", TZ)[0]!.iso).toBe("2027-03-14T17:00:00.000Z");
  });

  it("skips the hour that does not exist when the clocks go forward", () => {
    // 02:00 to 02:59 never happens on 14 March 2027.
    const slots = times(daySlots(nightOwl, "2027-03-14", TZ));
    expect(slots).not.toContain("02:00");
    expect(slots).not.toContain("02:30");
    expect(slots).toEqual(["01:00", "01:30", "03:00", "03:30", "04:00"]);
  });

  it("lists the repeated hour once when the clocks go back", () => {
    // 01:30 happens twice on 1 November 2026; it is offered once, the first time.
    const slots = daySlots(nightOwl, "2026-11-01", TZ);
    expect(slots.filter((slot) => slot.time === "01:30")).toHaveLength(1);
    expect(slots.find((slot) => slot.time === "01:30")!.iso).toBe("2026-11-01T06:30:00.000Z");
  });

  it("keeps instants in time order through the change", () => {
    const isos = daySlots(nightOwl, "2027-03-14", TZ).map((slot) => slot.iso);
    expect(isos).toEqual([...isos].sort());
    expect(isos.at(2)).toBe("2027-03-14T08:00:00.000Z");
  });
});

describe("bookableSlots", () => {
  const at = zonedToUtc(MONDAY, "12:30", TZ);

  it("hides past slots, including the one starting right now", () => {
    const slots = times(bookableSlots(hours, MONDAY, TZ, at));
    expect(slots[0]).toBe("13:00");
    expect(slots).not.toContain("12:00");
    expect(slots).not.toContain("12:30");
  });

  it("offers a slot one minute away", () => {
    expect(times(bookableSlots(hours, MONDAY, TZ, zonedToUtc(MONDAY, "12:29", TZ)))[0]).toBe("12:30");
  });

  it("has nothing left after the last seating", () => {
    expect(bookableSlots(hours, MONDAY, TZ, zonedToUtc(MONDAY, "20:00", TZ))).toEqual([]);
  });

  it("offers nothing for a past date", () => {
    expect(bookableSlots(hours, "2026-11-02", TZ, at)).toEqual([]);
  });
});

describe("booking window", () => {
  // 03:00 UTC on 10 November is still 21:00 on 9 November in Chicago.
  const at = new Date("2026-11-10T03:00:00Z");

  it("uses the branch's date, not UTC's", () => {
    expect(bookingWindow(at, TZ).today).toBe("2026-11-09");
    expect(isBookableDate("2026-11-09", at, TZ)).toBe(true);
    expect(isBookableDate("2026-11-08", at, TZ)).toBe(false);
  });

  it("allows day 60 and refuses day 61", () => {
    // 9 November + 21 days = 30 November, + 31 = 31 December, + 8 = 8 January: 60 days.
    expect(bookingWindow(at, TZ).lastDate).toBe("2027-01-08");
    expect(isBookableDate("2027-01-08", at, TZ)).toBe(true);
    expect(isBookableDate("2027-01-09", at, TZ)).toBe(false);
  });

  it("does not let daylight saving shift the date arithmetic", () => {
    expect(addDays("2027-03-13", 1)).toBe("2027-03-14");
    expect(addDays("2027-03-14", 1)).toBe("2027-03-15");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });

  it("refuses dates that are not real", () => {
    expect(isRealDate("2026-02-30")).toBe(false);
    expect(isRealDate("2026-13-01")).toBe(false);
    expect(isRealDate("next tuesday")).toBe(false);
    expect(isRealDate("2028-02-29")).toBe(true);
  });
});

describe("findBookableSlot", () => {
  const at = zonedToUtc(MONDAY, "12:30", TZ);

  it("accepts an instant we would have offered", () => {
    expect(findBookableSlot(hours, zonedToUtc(MONDAY, "13:00", TZ), TZ, at)?.time).toBe("13:00");
  });

  it("refuses an instant between slots, a past slot, and one too near closing", () => {
    expect(findBookableSlot(hours, zonedToUtc(MONDAY, "13:15", TZ), TZ, at)).toBeNull();
    expect(findBookableSlot(hours, zonedToUtc(MONDAY, "12:00", TZ), TZ, at)).toBeNull();
    expect(findBookableSlot(hours, zonedToUtc(MONDAY, "20:30", TZ), TZ, at)).toBeNull();
  });
});

describe("capacity", () => {
  const at = new Date("2026-11-09T18:30:00Z");
  const minutesAgo = (minutes: number) => new Date(at.getTime() - minutes * 60_000);
  const row = (status: string, partySize: number, createdAt = minutesAgo(5)) => ({ status, partySize, createdAt });

  it("counts confirmed, seated and fresh deposit holds, in guests", () => {
    expect(seatsTaken([row("CONFIRMED", 4), row("SEATED", 2), row("PENDING_DEPOSIT", 8)], at)).toBe(14);
  });

  it("does not count finished, no-show or cancelled tables", () => {
    expect(seatsTaken([row("COMPLETED", 4), row("NO_SHOW", 2), row("CANCELLED", 8)], at)).toBe(0);
  });

  it("holds an unpaid table for exactly 30 minutes", () => {
    expect(isHoldActive(minutesAgo(29), at)).toBe(true);
    expect(isHoldActive(minutesAgo(30), at)).toBe(true);
    expect(isHoldActive(new Date(at.getTime() - 30 * 60_000 - 1000), at)).toBe(false);
    expect(countsTowardCapacity(row("PENDING_DEPOSIT", 8, minutesAgo(30)), at)).toBe(true);
    expect(countsTowardCapacity(row("PENDING_DEPOSIT", 8, minutesAgo(31)), at)).toBe(false);
    expect(holdEndsAt(minutesAgo(10)).toISOString()).toBe("2026-11-09T18:50:00.000Z");
  });

  it("a confirmed table counts however old it is", () => {
    expect(countsTowardCapacity(row("CONFIRMED", 4, minutesAgo(10_000)), at)).toBe(true);
  });

  it("fits exactly up to capacity and refuses one more", () => {
    const rows = [row("CONFIRMED", 12), row("PENDING_DEPOSIT", 6)];
    expect(fitsInSlot(20, rows, 2, at)).toBe(true);
    expect(fitsInSlot(20, rows, 3, at)).toBe(false);
  });

  it("gives room back once a hold has run out", () => {
    const rows = [row("CONFIRMED", 12), row("PENDING_DEPOSIT", 8, minutesAgo(31))];
    expect(fitsInSlot(20, rows, 8, at)).toBe(true);
  });

  it("an empty slot still refuses a party bigger than the branch", () => {
    expect(fitsInSlot(20, [], 20, at)).toBe(true);
    expect(fitsInSlot(20, [], 21, at)).toBe(false);
  });
});

describe("wording", () => {
  it("writes dates in plain words", () => {
    expect(formatDay("2026-11-06")).toBe("Friday 6 November");
    expect(formatDay("2027-01-01", true)).toBe("Friday 1 January 2027");
  });

  it("writes a time in branch time", () => {
    expect(formatWhen(new Date("2026-11-06T19:30:00Z"), TZ)).toBe("Friday 6 November at 1:30pm");
    expect(formatWhen(new Date("2027-03-15T02:00:00Z"), TZ)).toBe("Sunday 14 March at 9pm");
  });
});
