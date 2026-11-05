import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  payment: { findUniqueOrThrow: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  order: { findUniqueOrThrow: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
  refundStripe: vi.fn(),
  applyReservationDeposit: vi.fn(),
  applyEventDeposit: vi.fn(),
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: { payment: mocks.payment, order: mocks.order, $transaction: mocks.$transaction } }));
vi.mock("@/lib/payments/stripe", () => ({ refundStripe: mocks.refundStripe, createStripeIntent: vi.fn() }));
vi.mock("@/lib/payments/paypal", () => ({ refundPaypal: vi.fn(), createPaypalOrder: vi.fn() }));
vi.mock("@/lib/booking/service", () => ({ applyReservationDeposit: mocks.applyReservationDeposit }));
vi.mock("@/lib/events/service", () => ({ applyEventDeposit: mocks.applyEventDeposit }));
vi.mock("@/lib/notify", () => ({ notifyOrderStatus: vi.fn() }));
vi.mock("@/lib/realtime", () => ({ publishOrderUpdate: vi.fn() }));
vi.mock("@/lib/geocode", () => ({ geocode: vi.fn() }));
vi.mock("@/lib/auth", () => ({}));

const { refundPayment } = await import("@/lib/payments");
const { markPaymentSucceeded } = await import("@/lib/orders/service");

const stripePayment = { id: "pay", provider: "STRIPE", providerRef: "pi_1", captureRef: null, amountCents: 1000, refundedAmountCents: 0, status: "SUCCEEDED" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.payment.updateMany.mockResolvedValue({ count: 1 });
  mocks.refundStripe.mockResolvedValue(undefined);
});

describe("refundPayment", () => {
  it("claims the amount before asking the provider to move money", async () => {
    mocks.payment.findUniqueOrThrow.mockResolvedValue(stripePayment);
    expect(await refundPayment("pay", 400)).toBe(400);
    expect(mocks.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "pay", status: "SUCCEEDED", refundedAmountCents: 0 },
      data: { refundedAmountCents: 400, status: "PARTIALLY_REFUNDED" },
    });
    expect(mocks.payment.updateMany.mock.invocationCallOrder[0]).toBeLessThan(mocks.refundStripe.mock.invocationCallOrder[0]!);
  });

  it("marks a full refund as refunded", async () => {
    mocks.payment.findUniqueOrThrow.mockResolvedValue(stripePayment);
    await refundPayment("pay");
    expect(mocks.payment.updateMany.mock.calls[0]![0].data).toEqual({ refundedAmountCents: 1000, status: "REFUNDED" });
  });

  it("does not call the provider when another refund won the race", async () => {
    mocks.payment.findUniqueOrThrow.mockResolvedValue(stripePayment);
    mocks.payment.updateMany.mockResolvedValue({ count: 0 });
    await expect(refundPayment("pay", 400)).rejects.toMatchObject({ code: "REFUND_CONFLICT" });
    expect(mocks.refundStripe).not.toHaveBeenCalled();
  });

  it("hands the claim back when the provider refuses, so a retry can still refund", async () => {
    mocks.payment.findUniqueOrThrow.mockResolvedValue(stripePayment);
    mocks.refundStripe.mockRejectedValue(new Error("provider down"));
    mocks.payment.update.mockResolvedValue({ refundedAmountCents: 0 });
    await expect(refundPayment("pay", 400)).rejects.toThrow("provider down");
    expect(mocks.payment.update).toHaveBeenCalledWith({ where: { id: "pay" }, data: { refundedAmountCents: { decrement: 400 } } });
    expect(mocks.payment.update).toHaveBeenCalledWith({ where: { id: "pay" }, data: { status: "SUCCEEDED" } });
  });

  it("keeps an earlier partial refund when the provider refuses a later one", async () => {
    mocks.payment.findUniqueOrThrow.mockResolvedValue({ ...stripePayment, status: "PARTIALLY_REFUNDED", refundedAmountCents: 200 });
    mocks.refundStripe.mockRejectedValue(new Error("provider down"));
    mocks.payment.update.mockResolvedValue({ refundedAmountCents: 200 });
    await expect(refundPayment("pay", 400)).rejects.toThrow("provider down");
    expect(mocks.payment.update).toHaveBeenCalledWith({ where: { id: "pay" }, data: { status: "PARTIALLY_REFUNDED" } });
  });

  it("refuses more than what is left", async () => {
    mocks.payment.findUniqueOrThrow.mockResolvedValue({ ...stripePayment, refundedAmountCents: 900, status: "PARTIALLY_REFUNDED" });
    await expect(refundPayment("pay", 101)).rejects.toMatchObject({ code: "BAD_REFUND_AMOUNT" });
    expect(mocks.payment.updateMany).not.toHaveBeenCalled();
  });
});

describe("markPaymentSucceeded", () => {
  const depositPayment = { id: "pay", purpose: "RESERVATION_DEPOSIT", orderId: null };

  it("does nothing on a second call", async () => {
    mocks.payment.updateMany.mockResolvedValue({ count: 0 });
    await markPaymentSucceeded("pay");
    expect(mocks.applyReservationDeposit).not.toHaveBeenCalled();
    expect(mocks.payment.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("releases the claim when applying the payment fails, so the provider's retry can finish it", async () => {
    mocks.payment.findUniqueOrThrow.mockResolvedValue(depositPayment);
    mocks.applyReservationDeposit.mockRejectedValueOnce(new Error("database down"));
    await expect(markPaymentSucceeded("pay")).rejects.toThrow("database down");
    expect(mocks.payment.updateMany).toHaveBeenLastCalledWith({
      where: { id: "pay", status: "SUCCEEDED", refundedAmountCents: 0 },
      data: { status: "PENDING" },
    });

    mocks.applyReservationDeposit.mockResolvedValueOnce(undefined);
    await markPaymentSucceeded("pay");
    expect(mocks.applyReservationDeposit).toHaveBeenCalledTimes(2);
  });

  it("refunds money for an order cancelled while the guest was paying", async () => {
    mocks.payment.findUniqueOrThrow.mockResolvedValue({ ...stripePayment, purpose: "ORDER", orderId: "order" });
    mocks.order.findUniqueOrThrow.mockResolvedValue({ status: "CANCELLED" });
    await markPaymentSucceeded("pay");
    expect(mocks.refundStripe).toHaveBeenCalledWith("pi_1", 1000, expect.any(String));
  });

  it("leaves an order alone when an earlier attempt already moved it on", async () => {
    mocks.payment.findUniqueOrThrow.mockResolvedValue({ ...stripePayment, purpose: "ORDER", orderId: "order" });
    mocks.order.findUniqueOrThrow.mockResolvedValue({ status: "RECEIVED" });
    await markPaymentSucceeded("pay");
    expect(mocks.order.findUnique).not.toHaveBeenCalled();
    expect(mocks.refundStripe).not.toHaveBeenCalled();
  });
});
