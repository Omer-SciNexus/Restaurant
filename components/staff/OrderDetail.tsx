"use client";

import { useCallback, useState } from "react";
import { formatMoney } from "@/lib/domain";
import type { StaffOrder } from "@/lib/orders/staff";
import { STATUS_LABEL } from "@/lib/orders/status";
import { useLiveRefresh } from "../checkout/useOrderLive";
import { FormError } from "../ui/Form";
import { OrderCard, useOrderActions } from "./OrderBoard";

/** One order's page, kept live the same way the board is. */
export function OrderDetail({ initialOrder, drivers, courierAvailable }: { initialOrder: StaffOrder; drivers: { id: string; name: string | null }[]; courierAvailable: boolean }) {
  const [order, setOrder] = useState(initialOrder);
  const { id, branchId, reference, status, customerName, customerPhone } = order.board;

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/staff/orders/${id}`, { cache: "no-store" });
      if (response.ok) setOrder(((await response.json()) as { order: StaffOrder }).order);
    } catch {
      // The next refresh catches up.
    }
  }, [id]);

  const { error, busy, send } = useOrderActions(refresh);
  useLiveRefresh(`branch-${branchId}-orders`, refresh, 5000);

  const time = (iso: string) => new Date(iso).toLocaleString("en-US", { timeZone: order.timezone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <>
      <h1 className="mt-2 text-3xl">
        Order {reference} · {STATUS_LABEL[status]}
      </h1>
      {order.rejectionReason ? <p className="mt-2 text-sm">Reason given to the guest: {order.rejectionReason}</p> : null}

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <FormError message={error} />
          <ul>
            <OrderCard order={order.board} drivers={drivers} courierAvailable={courierAvailable} busy={busy === id} send={send} />
          </ul>
        </div>

        <div className="space-y-4">
          <section className="rounded-brand bg-paper p-4 shadow-soft">
            <h2 className="text-lg">Guest</h2>
            <p className="mt-1 text-sm">{customerName}</p>
            <p className="text-sm">
              <a href={`tel:${customerPhone}`} className="inline-flex min-h-9 items-center text-forest underline">
                {customerPhone}
              </a>
            </p>
            <p className="break-words text-sm">{order.customerEmail}</p>
          </section>

          <section className="rounded-brand bg-paper p-4 shadow-soft">
            <h2 className="text-lg">Payment</h2>
            <ul className="mt-1 space-y-1 text-sm">
              {order.payments.map((payment) => (
                <li key={payment.id}>
                  {formatMoney(payment.amountCents)}: {payment.status.toLowerCase().replace("_", " ")}
                  {payment.refundedAmountCents > 0 ? ` (${formatMoney(payment.refundedAmountCents)} refunded)` : ""}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-brand bg-paper p-4 shadow-soft">
            <h2 className="text-lg">History</h2>
            <ol className="mt-1 space-y-1 text-sm">
              {order.events.map((event) => (
                <li key={event.id} className="flex justify-between gap-3">
                  <span>{STATUS_LABEL[event.status]}</span>
                  <span className="text-stone">{time(event.createdAt)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
