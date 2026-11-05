import { describe, expect, it } from "vitest";
import { bpsToPercent, centsToDollars, dollarsField, dollarsToCents, optionalDollarsField, percentToBps } from "@/lib/admin/money";

describe("dollarsToCents", () => {
  it("converts dollars to exact integer cents", () => {
    expect(dollarsToCents("12.50")).toBe(1250);
    expect(dollarsToCents("12.5")).toBe(1250);
    expect(dollarsToCents("12")).toBe(1200);
    expect(dollarsToCents(" $7.05 ")).toBe(705);
    expect(dollarsToCents("0")).toBe(0);
  });

  it("does not lose a cent to floating point", () => {
    // 19.99 * 100 is 1998.9999999999998 as a float; 1.15 * 100 is 114.99999999999999.
    expect(dollarsToCents("19.99")).toBe(1999);
    expect(dollarsToCents("1.15")).toBe(115);
    expect(dollarsToCents("4.35")).toBe(435);
  });

  it.each(["", "abc", "-5", "1e3", "12,50", "1.999", ".50", "12.", "NaN", "Infinity", "$", "1 000", "12345678"])("refuses %j", (input) => {
    expect(dollarsToCents(input)).toBeNull();
  });
});

describe("centsToDollars", () => {
  it("round-trips with dollarsToCents", () => {
    for (const cents of [0, 5, 50, 99, 100, 1999, 123456]) {
      expect(dollarsToCents(centsToDollars(cents))).toBe(cents);
    }
    expect(centsToDollars(705)).toBe("7.05");
  });
});

describe("percentToBps", () => {
  it("converts percentages to basis points", () => {
    expect(percentToBps("8.25")).toBe(825);
    expect(percentToBps("8.25%")).toBe(825);
    expect(percentToBps("0")).toBe(0);
    expect(percentToBps("7.5")).toBe(750);
    expect(bpsToPercent(825)).toBe("8.25");
  });

  it("refuses what is not a percentage", () => {
    expect(percentToBps("100")).toBeNull();
    expect(percentToBps("-1")).toBeNull();
    expect(percentToBps("8.255")).toBeNull();
    expect(percentToBps("abc")).toBeNull();
  });
});

describe("form fields", () => {
  it("a required field refuses an empty value with a usable message", () => {
    const result = dollarsField("the price").safeParse("");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("the price");
  });

  it("an optional field turns empty into null", () => {
    const field = optionalDollarsField("the threshold");
    expect(field.parse("")).toBeNull();
    expect(field.parse("   ")).toBeNull();
    expect(field.parse(undefined)).toBeNull();
    expect(field.parse("25")).toBe(2500);
    expect(field.safeParse("lots").success).toBe(false);
  });
});
