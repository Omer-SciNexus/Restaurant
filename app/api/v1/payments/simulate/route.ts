import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handle, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { markPaymentFailed, markPaymentSucceeded } from "@/lib/orders/service";
import { simulatedPaymentsAllowed } from "@/lib/payments";

const schema = z.object({ paymentId: z.string().min(1), outcome: z.enum(["succeed", "decline"]) });

/** Stands in for a payment provider on a laptop. Does not exist in production. */
export const POST = handle(async (request: Request) => {
  if (!simulatedPaymentsAllowed()) throw new ApiError(404, "NOT_FOUND", "Not found.");
  const { paymentId, outcome } = schema.parse(await readJson(request));
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.provider !== "SIMULATED") throw new ApiError(404, "NOT_FOUND", "Not found.");
  if (outcome === "decline") {
    await markPaymentFailed(paymentId);
    throw new ApiError(402, "CARD_DECLINED", "The test card was declined. Your order has not been placed.");
  }
  await markPaymentSucceeded(paymentId);
  return NextResponse.json({ ok: true });
});
