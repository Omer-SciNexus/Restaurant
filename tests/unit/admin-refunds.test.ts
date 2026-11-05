import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseRefundAmount, refundableCents, refundEmail } from "@/lib/admin/refunds";

const mocks = vi.hoisted(() => ({
  payment: { findFirst: vi.fn() },
  refundPayment: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: { payment: mocks.payment } }));
vi.mock("@/lib/payments", () => ({ refundPayment: mocks.refundPayment }));
vi.mock("@/lib/notify", () => ({ sendEmail: mocks.sendEmail }));

const { refundOrderPayment } = await import("@/lib/admin/refund-service");

describe("refundableCents", () => {
  it("is what is left on a paid payment", () => {
    expect(refundableCents({ status: "SUCCEEDED", amountCents: 1618, refundedAmountCents: 0 })).toBe(1618);
    expect(refundableCents({ status: "PARTIALLY_REFUNDED", amountCents: 1618, refundedAmountCents: 200 })).toBe(1418);
  });

  it("is nothing on a payment that was not taken, or has gone back", () => {
    for (const status of ["PENDING", "FAILED", "REFUNDED"]) expect(refundableCents({ status, amountCents: 1618, refundedAmountCents: 0 })).toBe(0);
  });
});

describe("parseRefundAmount", () => {
  it("converts dollars to integer cents", () => {
    expect(parseRefundAmount("2.00", 1618)).toEqual({ cents: 200 });
    expect(parseRefundAmount("16.18", 1618)).toEqual({ cents: 1618 });
  });

  it("refuses more than what is left, by even one cent", () => {
    expect(parseRefundAmount("16.19", 1618)).toHaveProperty("error");
  });

  it.each(["0", "0.00", "abc", "-1", "1e2", "2.005", ""])("refuses %j", (input) => {
    expect(parseRefundAmount(input, 1618)).toHaveProperty("error");
  });
});

describe("refundEmail", () => {
  it("says how much, for which order, and whether any is left", () => {
    const partial = refundEmail({ reference: "NF-ABC234" }, 200, 1418);
    expect(partial.subject).toContain("NF-ABC234");
    expect(partial.subject).toContain("$2.00");
    expect(partial.text).toContain("$14.18");

    expect(refundEmail({ reference: "NF-ABC234" }, 1418, 0).text).toContain("full amount left");
  });
});

describe("refundOrderPayment", () => {
  const paid = { id: "pay", orderId: "order", status: "SUCCEEDED", amountCents: 1618, refundedAmountCents: 0 };
  const order = { reference: "NF-ABC234", customerEmail: "guest@example.com" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => {});
    mocks.payment.findFirst.mockResolvedValue({ ...paid, order });
    mocks.refundPayment.mockImplementation(async (_id: string, cents: number) => cents);
  });

  it("refunds the amount in cents and emails the guest", async () => {
    const result = await refundOrderPayment("order", "pay", "2.00", "admin");
    expect(mocks.refundPayment).toHaveBeenCalledWith("pay", 200);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    const [to, subject, text] = mocks.sendEmail.mock.calls[0]!;
    expect(to).toBe("guest@example.com");
    expect(subject).toContain("$2.00");
    expect(text).toContain("$14.18");
    expect(result).toEqual({ amountCents: 200, leftCents: 1418, email: "guest@example.com" });
  });

  it("checks against what is left now, not what the page showed", async () => {
    mocks.payment.findFirst.mockResolvedValue({ ...paid, order, status: "PARTIALLY_REFUNDED", refundedAmountCents: 1600 });
    await expect(refundOrderPayment("order", "pay", "1.00", "admin")).rejects.toMatchObject({ code: "BAD_REFUND_AMOUNT" });
    expect(mocks.refundPayment).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("refuses an over-refund and sends no email", async () => {
    await expect(refundOrderPayment("order", "pay", "16.19", "admin")).rejects.toMatchObject({ code: "BAD_REFUND_AMOUNT" });
    expect(mocks.refundPayment).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("refuses when nothing is left", async () => {
    mocks.payment.findFirst.mockResolvedValue({ ...paid, order, status: "REFUNDED", refundedAmountCents: 1618 });
    await expect(refundOrderPayment("order", "pay", "1.00", "admin")).rejects.toMatchObject({ code: "NOTHING_TO_REFUND" });
  });

  it("only finds a payment through its own order", async () => {
    mocks.payment.findFirst.mockResolvedValue(null);
    await expect(refundOrderPayment("another-order", "pay", "1.00", "admin")).rejects.toMatchObject({ code: "PAYMENT_NOT_FOUND" });
    expect(mocks.payment.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "pay", orderId: "another-order", purpose: "ORDER" } }));
  });

  it("sends no email when the provider refuses the refund", async () => {
    mocks.refundPayment.mockRejectedValue(new Error("provider down"));
    await expect(refundOrderPayment("order", "pay", "1.00", "admin")).rejects.toThrow("provider down");
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
