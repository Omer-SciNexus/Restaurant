import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { markPaymentFailed, markPaymentSucceeded } from "@/lib/orders/service";
import { verifyPaypalWebhook } from "@/lib/payments/paypal";

type CaptureEvent = {
  id: string;
  event_type: string;
  resource: { id: string; custom_id?: string; supplementary_data?: { related_ids?: { order_id?: string } } };
};

/**
 * The capture route normally records a PayPal payment. This catches the case where the guest's
 * connection or our server dropped after PayPal took the money. PayPal itself verifies the call.
 */
export async function POST(request: Request) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });

  let event: CaptureEvent;
  try {
    event = (await request.json()) as CaptureEvent;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!(await verifyPaypalWebhook(request.headers, event, webhookId))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // PayPal retries on failure, so each event is applied at most once.
  const seen = await prisma.processedWebhook.findUnique({ where: { id: event.id } });
  if (seen) return NextResponse.json({ received: true });

  if (event.event_type === "PAYMENT.CAPTURE.COMPLETED" || event.event_type === "PAYMENT.CAPTURE.DENIED") {
    const { custom_id: paymentId, supplementary_data } = event.resource;
    const paypalOrderId = supplementary_data?.related_ids?.order_id;
    const payment = paymentId
      ? await prisma.payment.findUnique({ where: { id: paymentId } })
      : paypalOrderId
        ? await prisma.payment.findUnique({ where: { providerRef: paypalOrderId } })
        : null;
    if (payment) {
      if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") await markPaymentSucceeded(payment.id, event.resource.id);
      else await markPaymentFailed(payment.id);
    }
  }

  await prisma.processedWebhook.create({ data: { id: event.id } });
  return NextResponse.json({ received: true });
}
