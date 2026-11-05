import { describe, expect, it } from "vitest";
import { checkOffer, offerableSeats, pickOffers } from "@/lib/booking/waitlist";
import { dollarsToCents, earliestEventDate, quoteProblem } from "@/lib/events/rules";

const entry = (id: string, partySize: number, minute: number) => ({ id, partySize, createdAt: new Date(Date.UTC(2026, 10, 5, 12, minute)) });
const ids = (entries: { id: string }[]) => entries.map((e) => e.id);

describe("pickOffers", () => {
  it("offers the oldest entry first, whatever order they arrive in", () => {
    expect(ids(pickOffers([entry("newer", 2, 30), entry("oldest", 2, 10), entry("middle", 2, 20)], 2))).toEqual(["oldest"]);
  });

  it("passes over an entry that does not fit, and keeps its place", () => {
    // 2 seats free. The party of 4 was first but does not fit, so the party of 2 gets it.
    expect(ids(pickOffers([entry("big", 4, 1), entry("small", 2, 2)], 2))).toEqual(["small"]);
  });

  it("offers an entry that fits exactly", () => {
    expect(ids(pickOffers([entry("exact", 6, 1)], 6))).toEqual(["exact"]);
  });

  it("offers nobody when nobody fits", () => {
    expect(pickOffers([entry("big", 4, 1)], 3)).toEqual([]);
    expect(pickOffers([entry("any", 1, 1)], 0)).toEqual([]);
  });

  it("tells as many as there is room for, never more", () => {
    // 6 seats: oldest takes 2, the 5 no longer fits in the 4 left, the 3 does, the next 2 does not.
    const waiting = [entry("a", 2, 1), entry("b", 5, 2), entry("c", 3, 3), entry("d", 2, 4)];
    expect(ids(pickOffers(waiting, 6))).toEqual(["a", "c"]);
  });

  it("breaks a tie on arrival time the same way every time", () => {
    expect(ids(pickOffers([entry("b", 2, 1), entry("a", 2, 1)], 2))).toEqual(["a"]);
  });
});

describe("offerableSeats", () => {
  it("is the free seats", () => {
    expect(offerableSeats(20, 12, [])).toBe(8);
  });

  it("leaves out seats already offered to someone who has not answered", () => {
    expect(offerableSeats(20, 12, [{ partySize: 6 }])).toBe(2);
  });

  it("is never below zero", () => {
    expect(offerableSeats(20, 20, [{ partySize: 2 }])).toBe(0);
  });
});

describe("checkOffer", () => {
  const startsAt = new Date("2026-11-07T19:00:00Z");
  const at = new Date("2026-11-07T12:00:00Z");
  const base = { status: "OFFERED", startsAt, at, partySize: 4, capacity: 20, taken: 16 };

  it("goes ahead while the party still fits", () => {
    expect(checkOffer(base)).toBe("OK");
  });

  it("refuses when someone else has taken the seats since the offer", () => {
    expect(checkOffer({ ...base, taken: 17 })).toBe("FULL");
  });

  it("refuses without an open offer", () => {
    expect(checkOffer({ ...base, status: "WAITING" })).toBe("NOT_OFFERED");
    expect(checkOffer({ ...base, status: "CONFIRMED" })).toBe("NOT_OFFERED");
  });

  it("ends once the time has come", () => {
    expect(checkOffer({ ...base, at: startsAt })).toBe("EXPIRED");
  });
});

describe("event rules", () => {
  it("needs the catering lead time from Settings", () => {
    expect(earliestEventDate("CATERING", "2026-11-05", 3)).toBe("2026-11-08");
    expect(earliestEventDate("CATERING", "2026-11-05", 14)).toBe("2026-11-19");
  });

  it("only needs a private event to be in the future", () => {
    expect(earliestEventDate("PRIVATE_EVENT", "2026-11-05", 14)).toBe("2026-11-06");
  });

  it("turns dollars into whole cents without floating point", () => {
    expect(dollarsToCents("1500")).toBe(150000);
    expect(dollarsToCents("1,250.50")).toBe(125050);
    expect(dollarsToCents("$19.99")).toBe(1999);
    expect(dollarsToCents("0.07")).toBe(7);
    expect(dollarsToCents("1.1")).toBe(110);
    expect(dollarsToCents("1.999")).toBeNull();
    expect(dollarsToCents("-5")).toBeNull();
    expect(dollarsToCents("twelve")).toBeNull();
    expect(dollarsToCents("")).toBeNull();
  });

  it("keeps a quote and its deposit sensible", () => {
    expect(quoteProblem(100000, 20000)).toBeNull();
    expect(quoteProblem(100000, 100000)).toBeNull();
    expect(quoteProblem(0, 0)).not.toBeNull();
    expect(quoteProblem(100000, 0)).not.toBeNull();
    expect(quoteProblem(100000, 100001)).not.toBeNull();
  });
});
