import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handle, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { markPaymentFailed, markPaymentSucceeded } from "@/lib/orders/service";
import { capturePaypalOrder } from "@/lib/payments/paypal";

const schema = z.object({ paymentId: z.string().min(1) });

export const POST = handle(async (request: Request) => {
  const { paymentId } = schema.parse(await readJson(request));
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.provider !== "PAYPAL" || !payment.providerRef) {
    throw new ApiError(404, "PAYMENT_NOT_FOUND", "We could not find that payment.");
  }
  // The amount was fixed by the server when the PayPal order was created, so capturing is safe.
  const { completed, captureRef } = await capturePaypalOrder(payment.providerRef);
  if (!completed) {
    await markPaymentFailed(paymentId);
    throw new ApiError(402, "PAYMENT_DECLINED", "PayPal could not complete this payment.");
  }
  await markPaymentSucceeded(paymentId, captureRef);
  return NextResponse.json({ ok: true });
});
