import { describe, expect, it } from "vitest";
import { hoursFromForm, isValidTime, openingHoursSchema, rangesProblem, servingWindowProblem } from "@/lib/admin/hours";

const EMPTY_WEEK = { sun: [], mon: [], tue: [], wed: [], thu: [], fri: [], sat: [] };

describe("isValidTime", () => {
  it("accepts 24-hour HH:mm", () => {
    for (const time of ["00:00", "07:00", "09:30", "23:59"]) expect(isValidTime(time)).toBe(true);
  });

  it("refuses anything else", () => {
    for (const time of ["7:00", "24:00", "12:60", "07:00:00", "noon", "", "07.00"]) expect(isValidTime(time)).toBe(false);
  });
});

describe("rangesProblem", () => {
  it("accepts a closed day, one opening and a split day", () => {
    expect(rangesProblem([])).toBeNull();
    expect(rangesProblem([{ open: "07:00", close: "21:00" }])).toBeNull();
    expect(rangesProblem([{ open: "07:00", close: "11:00" }, { open: "17:00", close: "21:00" }])).toBeNull();
  });

  it("requires open before close", () => {
    expect(rangesProblem([{ open: "21:00", close: "07:00" }])).toContain("before");
    expect(rangesProblem([{ open: "09:00", close: "09:00" }])).toContain("before");
  });

  it("requires HH:mm", () => {
    expect(rangesProblem([{ open: "7am", close: "21:00" }])).toContain("24-hour");
  });

  it("requires both times", () => {
    expect(rangesProblem([{ open: "07:00", close: "" }])).toContain("both");
    expect(rangesProblem([{ open: "", close: "21:00" }])).toContain("both");
  });

  it("refuses overlapping openings, in either order", () => {
    expect(rangesProblem([{ open: "07:00", close: "12:00" }, { open: "11:00", close: "21:00" }])).toContain("overlap");
    expect(rangesProblem([{ open: "11:00", close: "21:00" }, { open: "07:00", close: "12:00" }])).toContain("overlap");
  });

  it("allows one opening to start as the other ends", () => {
    expect(rangesProblem([{ open: "07:00", close: "12:00" }, { open: "12:00", close: "21:00" }])).toBeNull();
  });

  it("refuses more than two openings", () => {
    expect(rangesProblem([{ open: "07:00", close: "08:00" }, { open: "09:00", close: "10:00" }, { open: "11:00", close: "12:00" }])).toContain("at most");
  });
});

describe("openingHoursSchema", () => {
  it("names the day in its error, and sorts a day's openings", () => {
    const bad = openingHoursSchema.safeParse({ ...EMPTY_WEEK, tue: [{ open: "21:00", close: "07:00" }] });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0]?.message).toContain("Tuesday");

    const good = openingHoursSchema.parse({ ...EMPTY_WEEK, mon: [{ open: "17:00", close: "21:00" }, { open: "07:00", close: "11:00" }] });
    expect(good.mon[0]?.open).toBe("07:00");
  });
});

describe("hoursFromForm", () => {
  it("treats two empty times as closed, and keeps half-filled ones for the rules to refuse", () => {
    const form = new FormData();
    form.set("mon-open-0", "07:00");
    form.set("mon-close-0", "21:00");
    form.set("tue-open-0", "");
    form.set("tue-close-0", "");
    form.set("wed-open-0", "09:00");
    const week = hoursFromForm(form);
    expect(week.mon).toEqual([{ open: "07:00", close: "21:00" }]);
    expect(week.tue).toEqual([]);
    expect(week.wed).toEqual([{ open: "09:00", close: "" }]);
    expect(week.sun).toEqual([]);
    expect(openingHoursSchema.safeParse(week).success).toBe(false);
  });
});

describe("servingWindowProblem", () => {
  it("allows all day, or a proper window", () => {
    expect(servingWindowProblem(null, null)).toBeNull();
    expect(servingWindowProblem("07:00", "11:00")).toBeNull();
  });

  it("refuses half a window, a backwards one, and a bad format", () => {
    expect(servingWindowProblem("07:00", null)).toContain("both");
    expect(servingWindowProblem(null, "11:00")).toContain("both");
    expect(servingWindowProblem("11:00", "07:00")).toContain("before");
    expect(servingWindowProblem("7", "11:00")).toContain("24-hour");
  });
});
