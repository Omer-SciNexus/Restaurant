import { services, siteUrl } from "../env";
import { formatMoney } from "../domain";
import { STATUS_LABEL, type OrderStatus } from "../orders/status";

// Email goes through Resend and SMS through Twilio. With no keys, messages are written to
// the server log, so every flow can be followed locally. A failed message is logged and
// never fails the order or booking that triggered it.

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  if (!services.resend) {
    console.info(`[email to ${to}] ${subject}\n${text}`);
    return;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text }),
    });
    if (!response.ok) console.error("Email failed", response.status, await response.text());
  } catch (error) {
    console.error("Email failed", error);
  }
}

export async function sendSms(to: string, body: string): Promise<void> {
  if (!services.twilio) {
    console.info(`[sms to ${to}] ${body}`);
    return;
  }
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: process.env.TWILIO_FROM ?? "", Body: body }),
    });
    if (!response.ok) console.error("SMS failed", response.status, await response.text());
  } catch (error) {
    console.error("SMS failed", error);
  }
}

type OrderForNotice = {
  id: string;
  reference: string;
  type: "PICKUP" | "DELIVERY";
  customerEmail: string;
  customerPhone: string;
  totalCents: number;
  rejectionReason?: string | null;
};

const MESSAGES: Partial<Record<OrderStatus, (order: OrderForNotice) => string>> = {
  RECEIVED: (o) => `Thanks! We have your order ${o.reference} (${formatMoney(o.totalCents)}).`,
  PREPARING: (o) => `Your order ${o.reference} is being prepared.`,
  READY: (o) => (o.type === "PICKUP" ? `Your order ${o.reference} is ready for pickup.` : `Your order ${o.reference} is ready and waiting for its driver.`),
  OUT_FOR_DELIVERY: (o) => `Your order ${o.reference} is on the way.`,
  COMPLETED: (o) => (o.type === "PICKUP" ? `Thanks for collecting order ${o.reference}. Enjoy!` : `Your order ${o.reference} has been delivered. Enjoy!`),
  REJECTED: (o) => `We are sorry, we could not take order ${o.reference}${o.rejectionReason ? `: ${o.rejectionReason}` : ""}. You have been refunded in full.`,
  CANCELLED: (o) => `Your order ${o.reference} has been cancelled and refunded.`,
};

/** Each status change the guest should hear about sends an email, and an SMS for the moments that matter. */
export async function notifyOrderStatus(order: OrderForNotice, status: OrderStatus): Promise<void> {
  const message = MESSAGES[status]?.(order);
  if (!message) return;
  const link = `${siteUrl()}/order/${order.id}`;
  const smsWorthy: OrderStatus[] = ["READY", "OUT_FOR_DELIVERY", "REJECTED"];
  await Promise.all([
    sendEmail(order.customerEmail, `Order ${order.reference}: ${STATUS_LABEL[status]}`, `${message}\n\nTrack it here: ${link}`),
    smsWorthy.includes(status) ? sendSms(order.customerPhone, `Nature Food: ${message} ${link}`) : Promise.resolve(),
  ]);
}
