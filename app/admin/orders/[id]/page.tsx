import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RefundForm } from "@/components/admin/RefundForm";
import { ADMIN_ROLES } from "@/lib/access";
import { refundableCents } from "@/lib/admin/refunds";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/domain";
import { orderViewInclude } from "@/lib/orders/service";
import { STATUS_LABEL, type OrderStatus } from "@/lib/orders/status";

export const metadata: Metadata = { title: "Order" };

const PROVIDER_LABEL: Record<string, string> = { STRIPE: "Stripe", PAYPAL: "PayPal", SIMULATED: "Test mode (simulated)" };
const PAYMENT_LABEL: Record<string, string> = { PENDING: "Not paid yet", SUCCEEDED: "Paid", FAILED: "Failed", PARTIALLY_REFUNDED: "Partly refunded", REFUNDED: "Refunded" };
const ACTIVE: readonly OrderStatus[] = ["RECEIVED", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY"];

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePageRole(ADMIN_ROLES, `/admin/orders/${id}`);
  const order = await prisma.order.findUnique({ where: { id }, include: orderViewInclude });
  if (!order) notFound();

  const when = (date: Date) => new Intl.DateTimeFormat("en-US", { timeZone: order.branch.timezone, dateStyle: "medium", timeStyle: "short" }).format(date);
  const payments = order.payments.filter((payment) => payment.purpose === "ORDER");
  const isActive = ACTIVE.includes(order.status as OrderStatus);

  return (
    <div className="max-w-3xl">
      <Link href="/admin/orders" className="text-sm text-forest underline">
        All orders
      </Link>
      <h1 className="mt-2 text-3xl">Order {order.reference}</h1>
      <p className="mt-1 text-sm text-stone">
        {order.branch.name}, {order.type === "DELIVERY" ? "delivery" : "pickup"}, placed {when(order.createdAt)}.
      </p>
      <p className="mt-2 text-sm font-medium" data-testid="order-status">
        {STATUS_LABEL[order.status as OrderStatus]}
      </p>

      <section aria-labelledby="payment" className="mt-6 rounded-brand bg-paper p-5 shadow-soft">
        <h2 id="payment" className="text-xl">
          Payment and refunds
        </h2>
        {payments.length === 0 ? <p className="mt-2 text-sm text-stone">No payment on this order.</p> : null}
        {payments.map((payment) => {
          const left = refundableCents(payment);
          return (
            <div key={payment.id} className="mt-3 border-t border-line pt-3 first:border-t-0" data-testid="payment">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-stone">Paid with</dt>
                  <dd>{PROVIDER_LABEL[payment.provider]}</dd>
                </div>
                <div>
                  <dt className="text-xs text-stone">Status</dt>
                  <dd data-testid="payment-status">{PAYMENT_LABEL[payment.status]}</dd>
                </div>
                <div>
                  <dt className="text-xs text-stone">Refunded</dt>
                  <dd data-testid="payment-refunded">
                    {formatMoney(payment.refundedAmountCents)} of {formatMoney(payment.amountCents)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-stone">Left to refund</dt>
                  <dd data-testid="payment-left">{formatMoney(left)}</dd>
                </div>
              </dl>
              {left > 0 ? <RefundForm orderId={order.id} paymentId={payment.id} leftCents={left} /> : null}
            </div>
          );
        })}
        {isActive && payments.some((payment) => refundableCents(payment) > 0 || payment.refundedAmountCents > 0) ? (
          <p className="mt-4 rounded-brand bg-honey/20 p-3 text-sm">
            This order is still with the branch, and a refund does not stop the kitchen. To stop it,{" "}
            <Link href={`/staff/orders?branch=${order.branch.slug}`} className="font-medium text-forest underline">
              use the order board
            </Link>
            .
          </p>
        ) : null}
      </section>

      <section aria-labelledby="guest" className="mt-6 rounded-brand bg-paper p-5 shadow-soft">
        <h2 id="guest" className="text-xl">
          Guest
        </h2>
        <p className="mt-2 text-sm">{order.customerName}</p>
        <p className="text-sm">
          <a href={`mailto:${order.customerEmail}`} className="text-forest underline">
            {order.customerEmail}
          </a>
          {", "}
          <a href={`tel:${order.customerPhone.replace(/\s/g, "")}`} className="text-forest underline">
            {order.customerPhone}
          </a>
        </p>
        {order.deliveryStreet ? (
          <p className="mt-1 text-sm">
            {order.deliveryStreet}, {order.deliveryCity}
          </p>
        ) : null}
        {order.allergyNote ? (
          <p className="mt-2 rounded-brand border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
            <strong>Allergy note:</strong> {order.allergyNote}
          </p>
        ) : null}
        {order.rejectionReason ? <p className="mt-2 text-sm">Rejected: {order.rejectionReason}</p> : null}
      </section>

      <section aria-labelledby="items" className="mt-6 rounded-brand bg-paper p-5 shadow-soft">
        <h2 id="items" className="text-xl">
          What was ordered
        </h2>
        <ul className="mt-2 divide-y divide-line text-sm">
          {order.items.map((item) => {
            const options = (item.selectedOptions as { name: string }[]).map((option) => option.name).join(", ");
            return (
              <li key={item.id} className="flex justify-between gap-4 py-2">
                <span>
                  {item.quantity} x {item.nameSnapshot}
                  {options ? <span className="block text-xs text-stone">{options}</span> : null}
                  {item.note ? <span className="block text-xs text-stone">Note: {item.note}</span> : null}
                </span>
                <span>{formatMoney(item.unitPriceCents * item.quantity)}</span>
              </li>
            );
          })}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatMoney(order.subtotalCents)}</dd>
          </div>
          {order.type === "DELIVERY" ? (
            <div className="flex justify-between">
              <dt>Delivery</dt>
              <dd>{formatMoney(order.deliveryFeeCents)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt>Tax</dt>
            <dd>{formatMoney(order.taxCents)}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Total</dt>
            <dd>{formatMoney(order.totalCents)}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="history" className="mt-6 rounded-brand bg-paper p-5 shadow-soft">
        <h2 id="history" className="text-xl">
          Status history
        </h2>
        <ol className="mt-2 divide-y divide-line text-sm">
          {order.events.map((event) => (
            <li key={event.id} className="flex justify-between gap-4 py-2">
              <span>{STATUS_LABEL[event.status as OrderStatus]}</span>
              <span className="text-stone">{when(event.createdAt)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
