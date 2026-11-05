import { describe, expect, it } from "vitest";
import { cancellationRule, depositCents, depositState, heldCents, isRefundable, planDepositChange, refundDeadline, type DepositPolicy } from "@/lib/booking/deposits";
import { canStaffMove, staffReservationActions } from "@/lib/booking/status";

const policy: DepositPolicy = { depositPerGuestCents: 1000, depositMinParty: 7, freeCancelHours: 24 };
const TZ = "America/Chicago";

describe("depositCents", () => {
  it("is nothing below the threshold and starts exactly at it", () => {
    expect(depositCents(1, policy)).toBe(0);
    expect(depositCents(6, policy)).toBe(0);
    expect(depositCents(7, policy)).toBe(7000);
    expect(depositCents(8, policy)).toBe(8000);
  });

  it("follows Settings, with no number of its own", () => {
    expect(depositCents(4, { ...policy, depositMinParty: 4, depositPerGuestCents: 2550 })).toBe(10200);
    expect(depositCents(7, { ...policy, depositMinParty: 8 })).toBe(0);
    expect(depositCents(8, { ...policy, depositPerGuestCents: 0 })).toBe(0);
  });
});

describe("the cancel window", () => {
  const startsAt = new Date("2026-11-07T19:00:00Z");

  it("refunds at exactly the deadline and not a second after", () => {
    expect(isRefundable(startsAt, new Date("2026-11-06T18:59:59Z"), 24)).toBe(true);
    expect(isRefundable(startsAt, new Date("2026-11-06T19:00:00Z"), 24)).toBe(true);
    expect(isRefundable(startsAt, new Date("2026-11-06T19:00:01Z"), 24)).toBe(false);
  });

  it("follows the hours in Settings", () => {
    const at = new Date("2026-11-07T07:00:00Z"); // 12 hours before.
    expect(isRefundable(startsAt, at, 24)).toBe(false);
    expect(isRefundable(startsAt, at, 12)).toBe(true);
  });

  it("counts real hours across daylight saving", () => {
    // Noon on Sunday 14 March 2027 is 17:00 UTC. 24 real hours before is 11:00 on the Saturday.
    const deadline = refundDeadline(new Date("2027-03-14T17:00:00Z"), 24);
    expect(deadline.toISOString()).toBe("2027-03-13T17:00:00.000Z");
    expect(cancellationRule({ depositCents: 8000, startsAt: new Date("2027-03-14T17:00:00Z"), freeCancelHours: 24, timezone: TZ, at: new Date("2027-03-01T12:00:00Z") })).toContain("by Saturday 13 March at 11am");
  });
});

describe("cancellationRule", () => {
  const startsAt = new Date("2026-11-07T19:00:00Z"); // Saturday 1pm in Chicago.
  const at = new Date("2026-11-01T12:00:00Z");

  it("states the amount and the exact time", () => {
    expect(cancellationRule({ depositCents: 8000, startsAt, freeCancelHours: 24, timezone: TZ, at })).toBe(
      "Cancel at least 24 hours before your table, by Friday 6 November at 1pm, and your $80.00 deposit is refunded in full. After that the deposit is kept.",
    );
  });

  it("uses the singular for one hour", () => {
    expect(cancellationRule({ depositCents: 8000, startsAt, freeCancelHours: 1, timezone: TZ, at })).toContain("at least 1 hour before");
  });

  it("promises nothing about deposits when there is none", () => {
    expect(cancellationRule({ depositCents: 0, startsAt, freeCancelHours: 24, timezone: TZ, at })).toBe("There is no deposit for this table, so you can change or cancel it free of charge.");
  });

  it("does not offer a refund deadline that has already gone", () => {
    const late = new Date("2026-11-06T19:00:01Z");
    expect(cancellationRule({ depositCents: 8000, startsAt, freeCancelHours: 24, timezone: TZ, at: late })).toBe("Your table is less than 24 hours away, so if you cancel, your $80.00 deposit is kept.");
  });
});

describe("depositState", () => {
  const paid = { status: "SUCCEEDED", amountCents: 8000, refundedAmountCents: 0 };

  it("has nothing to say without a deposit", () => {
    expect(depositState({ status: "CONFIRMED", depositAmountCents: 0 }, null)).toBe("NONE");
  });

  it("is due while the table is held, even after a declined card", () => {
    expect(depositState({ status: "PENDING_DEPOSIT", depositAmountCents: 8000 }, null)).toBe("DUE");
    expect(depositState({ status: "PENDING_DEPOSIT", depositAmountCents: 8000 }, { ...paid, status: "FAILED" })).toBe("DUE");
  });

  it("is paid once money has arrived", () => {
    expect(depositState({ status: "CONFIRMED", depositAmountCents: 8000 }, paid)).toBe("PAID");
    expect(depositState({ status: "SEATED", depositAmountCents: 8000 }, paid)).toBe("PAID");
  });

  it("is refunded once the money has gone back", () => {
    expect(depositState({ status: "CANCELLED", depositAmountCents: 8000 }, { ...paid, status: "REFUNDED", refundedAmountCents: 8000 })).toBe("REFUNDED");
  });

  it("is kept on a late cancellation or a no-show", () => {
    expect(depositState({ status: "CANCELLED", depositAmountCents: 8000 }, paid)).toBe("KEPT");
    expect(depositState({ status: "NO_SHOW", depositAmountCents: 8000 }, paid)).toBe("KEPT");
  });

  it("was never paid when a hold ran out", () => {
    expect(depositState({ status: "CANCELLED", depositAmountCents: 8000 }, { ...paid, status: "PENDING" })).toBe("NOT_PAID");
    expect(depositState({ status: "CANCELLED", depositAmountCents: 8000 }, null)).toBe("NOT_PAID");
  });
});

describe("heldCents", () => {
  it("only counts money we actually have", () => {
    expect(heldCents(null)).toBe(0);
    expect(heldCents({ status: "PENDING", amountCents: 8000, refundedAmountCents: 0 })).toBe(0);
    expect(heldCents({ status: "FAILED", amountCents: 8000, refundedAmountCents: 0 })).toBe(0);
    expect(heldCents({ status: "REFUNDED", amountCents: 8000, refundedAmountCents: 8000 })).toBe(0);
    expect(heldCents({ status: "SUCCEEDED", amountCents: 8000, refundedAmountCents: 0 })).toBe(8000);
    expect(heldCents({ status: "PARTIALLY_REFUNDED", amountCents: 8000, refundedAmountCents: 1000 })).toBe(7000);
  });
});

describe("planDepositChange", () => {
  const base = { heldCents: 8000, currentParty: 8, newParty: 8, moving: false, refundable: true, policy };

  it("changes nothing when the party stays the same", () => {
    expect(planDepositChange({ ...base, moving: true })).toEqual({ ok: true, refundCents: 0, newDepositCents: 8000 });
  });

  it("refunds the difference for a smaller party in the free window", () => {
    expect(planDepositChange({ ...base, newParty: 7 })).toEqual({ ok: true, refundCents: 1000, newDepositCents: 7000 });
  });

  it("refunds everything when the party drops below the threshold", () => {
    expect(planDepositChange({ ...base, newParty: 6 })).toEqual({ ok: true, refundCents: 8000, newDepositCents: 0 });
  });

  it("refunds nothing for a smaller party after the window", () => {
    expect(planDepositChange({ ...base, newParty: 4, refundable: false })).toEqual({ ok: true, refundCents: 0, newDepositCents: 8000 });
  });

  it("will not move a paid table after the window, or cancelling later would dodge the rule", () => {
    expect(planDepositChange({ ...base, moving: true, refundable: false })).toEqual({ ok: false, reason: "WINDOW_CLOSED" });
  });

  it("moves a table with no deposit at any time", () => {
    expect(planDepositChange({ ...base, heldCents: 0, currentParty: 4, newParty: 4, moving: true, refundable: false }).ok).toBe(true);
  });

  it("refuses a change that would need a larger deposit", () => {
    expect(planDepositChange({ ...base, newParty: 9 })).toEqual({ ok: false, reason: "DEPOSIT_INCREASE" });
    expect(planDepositChange({ ...base, heldCents: 0, currentParty: 6, newParty: 7 })).toEqual({ ok: false, reason: "DEPOSIT_INCREASE" });
  });

  it("lets a small party grow while still under the threshold", () => {
    expect(planDepositChange({ ...base, heldCents: 0, currentParty: 2, newParty: 6 })).toEqual({ ok: true, refundCents: 0, newDepositCents: 0 });
  });

  it("never asks for more from a smaller party, even if the rate has gone up", () => {
    const dearer = { ...policy, depositPerGuestCents: 2000 };
    // 7 guests at the new rate would be $140, more than the $80 held.
    expect(planDepositChange({ ...base, newParty: 7, policy: dearer })).toEqual({ ok: true, refundCents: 0, newDepositCents: 8000 });
  });
});

describe("staff moves", () => {
  const startsAt = new Date("2026-11-07T19:00:00Z");
  const before = new Date("2026-11-07T18:59:00Z");
  const after = new Date("2026-11-07T19:01:00Z");

  it("seats a confirmed table, then finishes it", () => {
    expect(canStaffMove("CONFIRMED", "SEATED", startsAt, before)).toBe(true);
    expect(canStaffMove("SEATED", "COMPLETED", startsAt, after)).toBe(true);
  });

  it("marks a no-show only once the time has come", () => {
    expect(canStaffMove("CONFIRMED", "NO_SHOW", startsAt, before)).toBe(false);
    expect(canStaffMove("CONFIRMED", "NO_SHOW", startsAt, startsAt)).toBe(true);
    expect(canStaffMove("CONFIRMED", "NO_SHOW", startsAt, after)).toBe(true);
  });

  it("cannot seat an unpaid hold, or touch a finished booking", () => {
    expect(canStaffMove("PENDING_DEPOSIT", "SEATED", startsAt, after)).toBe(false);
    expect(canStaffMove("CANCELLED", "SEATED", startsAt, after)).toBe(false);
    expect(canStaffMove("NO_SHOW", "SEATED", startsAt, after)).toBe(false);
    expect(canStaffMove("SEATED", "NO_SHOW", startsAt, after)).toBe(false);
    expect(staffReservationActions("COMPLETED")).toEqual([]);
  });
});
