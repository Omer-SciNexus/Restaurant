"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { formatMoney } from "@/lib/domain";
import type { PublicOrder } from "@/lib/orders/access";
import { trackingSteps } from "@/lib/orders/status";
import { Button } from "../ui/Button";
import { FormError } from "../ui/Form";
import { useLiveRefresh } from "./useOrderLive";

const FINISHED = ["COMPLETED", "REJECTED", "CANCELLED"];

const ILLUSTRATION: Record<string, string> = {
  received: "/images/illustrations/status-received.png",
  preparing: "/images/illustrations/status-preparing.png",
  ready: "/images/restaurant/pickup-bag.png",
  "on-the-way": "/images/illustrations/status-on-the-way.png",
  done: "/images/illustrations/status-delivered.png",
};

export function OrderTracker({ initial }: { initial: PublicOrder }) {
  const [order, setOrder] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/orders/${initial.id}`, { cache: "no-store" });
      if (response.ok) setOrder(((await response.json()) as { order: PublicOrder }).order);
    } catch {
      // A missed refresh is fine; the next one catches up.
    }
  }, [initial.id]);

  const live = !FINISHED.includes(order.status);
  useLiveRefresh(live ? `order-${order.id}` : null, live ? refresh : noop, live ? 5000 : 3_600_000);

  async function cancel() {
    setCancelling(true);
    setError(null);
    const response = await fetch(`/api/v1/orders/${order.id}/cancel`, { method: "POST" });
    setCancelling(false);
    if (!response.ok) {
      const body = await response.json();
      setError(body.error?.message ?? "We could not cancel this order.");
    }
    await refresh();
  }

  const steps = trackingSteps(order.status, order.type);
  const current = steps.find((step) => step.current);

  return (
    <div>
      <p className="text-sm text-stone">Order {order.reference}</p>
      <h1 className="text-4xl" data-testid="order-headline">
        {headline(order)}
      </h1>

      {order.status === "PENDING_PAYMENT" ? (
        <p className="mt-3 text-stone">We are waiting for your payment to be confirmed. This page updates by itself.</p>
      ) : null}
      {order.status === "REJECTED" ? (
        <p className="mt-3 text-stone">
          {order.rejectionReason ? `${order.rejectionReason}. ` : ""}
          {formatMoney(order.refundedCents)} has been refunded to you.
        </p>
      ) : null}
      {order.status === "CANCELLED" ? <p className="mt-3 text-stone">{formatMoney(order.refundedCents)} has been refunded to you.</p> : null}

      {current ? (
        <div className="mt-6 flex justify-center">
          <Image src={ILLUSTRATION[current.key] ?? ILLUSTRATION.received!} alt="" width={180} height={180} className="h-44 w-44 rounded-brand object-contain" />
        </div>
      ) : null}

      {steps.some((step) => step.current || step.done) ? (
        <ol className="mt-6 grid grid-cols-4 gap-2" aria-label="Order progress">
          {steps.map((step) => (
            <li key={step.key} aria-current={step.current ? "step" : undefined} data-testid={step.current ? "current-step" : undefined}>
              <span className={`block h-1.5 rounded-full ${step.done || step.current ? "bg-forest" : "bg-line"}`} />
              <span className={`mt-2 block text-xs sm:text-sm ${step.current ? "font-semibold" : step.done ? "" : "text-stone"}`}>{step.label}</span>
            </li>
          ))}
        </ol>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <section className="rounded-brand bg-paper p-5 shadow-soft">
          <h2 className="text-xl">{order.type === "DELIVERY" ? "Delivering to" : "Pick up from"}</h2>
          {order.type === "DELIVERY" ? (
            <p className="mt-2 text-sm">
              {order.deliveryStreet}
              <br />
              {order.deliveryCity}
            </p>
          ) : (
            <p className="mt-2 text-sm">
              {order.branch.name}
              <br />
              {order.branch.address}, {order.branch.city}
            </p>
          )}
          <p className="mt-3 text-sm text-stone">Questions? Call {order.branch.name} on {order.branch.phone}.</p>
        </section>

        <section className="rounded-brand bg-paper p-5 shadow-soft">
          <h2 className="text-xl">Receipt</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>
                  {item.quantity} × {item.name}
                  {item.options.length > 0 ? <span className="block text-xs text-stone">{item.options.join(", ")}</span> : null}
                </span>
                <span>{formatMoney(item.unitPriceCents * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-line pt-2 text-sm">
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
      </div>

      {order.status === "RECEIVED" ? (
        <div className="mt-6">
          <FormError message={error} />
          <Button type="button" variant="danger" onClick={cancel} disabled={cancelling} className="mt-2">
            {cancelling ? "Cancelling..." : "Cancel this order"}
          </Button>
          <p className="mt-1 text-xs text-stone">You can cancel until the kitchen accepts it.</p>
        </div>
      ) : null}
    </div>
  );
}

function noop() {}

function headline(order: PublicOrder): string {
  switch (order.status) {
    case "PENDING_PAYMENT":
      return "Confirming your payment";
    case "RECEIVED":
    case "ACCEPTED":
      return "We have your order";
    case "PREPARING":
      return "We are preparing your order";
    case "READY":
      return order.type === "PICKUP" ? "Ready for pickup" : "Ready, waiting for the driver";
    case "OUT_FOR_DELIVERY":
      return "On the way to you";
    case "COMPLETED":
      return order.type === "PICKUP" ? "Collected. Enjoy!" : "Delivered. Enjoy!";
    case "REJECTED":
      return "We could not take this order";
    case "CANCELLED":
      return "Order cancelled";
  }
}
