"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/domain";
import type { BoardOrder } from "@/lib/orders/staff";
import { STATUS_LABEL, staffActions, type OrderStatus } from "@/lib/orders/status";
import { useLiveRefresh } from "../checkout/useOrderLive";
import { Button } from "../ui/Button";
import { FormError, inputClass } from "../ui/Form";

type Driver = { id: string; name: string | null };

const COLUMNS: { title: string; statuses: OrderStatus[] }[] = [
  { title: "New", statuses: ["RECEIVED"] },
  { title: "In the kitchen", statuses: ["ACCEPTED", "PREPARING"] },
  { title: "Ready", statuses: ["READY"] },
  { title: "Out for delivery", statuses: ["OUT_FOR_DELIVERY"] },
];

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  ACCEPTED: "Accept",
  PREPARING: "Start preparing",
  READY: "Mark ready",
  COMPLETED: "Mark collected",
};

/** A soft two-note chime, generated in the browser so it needs no sound file. */
function chime(context: AudioContext) {
  [660, 880].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + index * 0.22;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.4, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.55);
  });
}

/** Sends a staff action for an order, then refreshes whichever screen is showing it. */
export function useOrderActions(refresh: () => unknown) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function send(orderId: string, path: string, method: string, body?: unknown) {
    setBusy(orderId);
    setError(null);
    try {
      const response = await fetch(`/api/v1/staff/orders/${orderId}/${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!response.ok) {
        const result = await response.json();
        setError(result.error?.message ?? "That did not work. Please try again.");
      }
    } catch {
      setError("We could not reach the server. Please check the connection.");
    } finally {
      setBusy(null);
      await refresh();
    }
  }

  return { error, busy, send };
}

export function OrderBoard({ branchId, initialOrders, drivers, courierAvailable }: { branchId: string; initialOrders: BoardOrder[]; drivers: Driver[]; courierAvailable: boolean }) {
  const [orders, setOrders] = useState(initialOrders);
  const [soundOn, setSoundOn] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const known = useRef(new Set(initialOrders.map((order) => order.id)));

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/staff/orders?branchId=${branchId}`, { cache: "no-store" });
      if (response.ok) setOrders(((await response.json()) as { orders: BoardOrder[] }).orders);
    } catch {
      // The next refresh catches up.
    }
  }, [branchId]);

  const { error, busy, send } = useOrderActions(refresh);

  useLiveRefresh(`branch-${branchId}-orders`, refresh, 5000);

  // Browsers only allow sound after a tap, hence the switch. A new order rings once.
  useEffect(() => {
    const fresh = orders.filter((order) => !known.current.has(order.id));
    fresh.forEach((order) => known.current.add(order.id));
    if (fresh.length > 0 && audio.current) chime(audio.current);
  }, [orders]);

  function toggleSound() {
    if (soundOn) {
      void audio.current?.close();
      audio.current = null;
      setSoundOn(false);
    } else {
      audio.current = new AudioContext();
      chime(audio.current);
      setSoundOn(true);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone" role="status">
          {orders.length} open {orders.length === 1 ? "order" : "orders"}
        </p>
        <Button type="button" variant={soundOn ? "secondary" : "primary"} onClick={toggleSound}>
          {soundOn ? "Sound alerts on" : "Turn on sound alerts"}
        </Button>
      </div>
      <div className="mt-3">
        <FormError message={error} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((column) => {
          const inColumn = orders.filter((order) => column.statuses.includes(order.status));
          return (
            <section key={column.title} aria-label={column.title} className="rounded-brand bg-oat-deep p-3">
              <h2 className="px-1 font-body text-sm font-semibold">
                {column.title} <span className="font-normal text-stone">({inColumn.length})</span>
              </h2>
              <ul className="mt-3 space-y-3">
                {inColumn.map((order) => (
                  <OrderCard key={order.id} order={order} drivers={drivers} courierAvailable={courierAvailable} busy={busy === order.id} send={send} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function OrderCard({
  order,
  drivers,
  courierAvailable,
  busy,
  send,
}: {
  order: BoardOrder;
  drivers: Driver[];
  courierAvailable: boolean;
  busy: boolean;
  send: (orderId: string, path: string, method: string, body?: unknown) => Promise<void>;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [driverId, setDriverId] = useState("");
  const actions = staffActions(order.status, order.type).filter((status) => status !== "REJECTED");
  const canDispatch = order.type === "DELIVERY" && order.status !== "RECEIVED" && order.status !== "OUT_FOR_DELIVERY" && order.delivery?.status !== "PICKED_UP";

  return (
    <li className="rounded-brand bg-paper p-3 shadow-soft" data-testid={`order-${order.reference}`}>
      <div className="flex items-baseline justify-between gap-2">
        <Link href={`/staff/orders/${order.id}`} className="font-semibold underline-offset-2 hover:underline">
          {order.reference}
        </Link>
        <span className="rounded-full bg-sage px-2 py-0.5 text-xs font-medium">{order.type === "DELIVERY" ? "Delivery" : "Pickup"}</span>
      </div>
      <p className="mt-1 text-xs text-stone">
        {STATUS_LABEL[order.status]} · {order.customerName} · {new Date(order.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        {order.scheduledFor ? ` · for ${new Date(order.scheduledFor).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : " · ASAP"}
      </p>

      {order.allergyNote ? (
        <p className="mt-2 rounded-md bg-danger-soft p-2 text-sm font-semibold text-danger">Allergy: {order.allergyNote}</p>
      ) : null}

      <ul className="mt-2 space-y-1 text-sm">
        {order.items.map((item) => (
          <li key={item.id}>
            <strong>{item.quantity} ×</strong> {item.name}
            {item.options.length > 0 ? <span className="block text-xs text-stone">{item.options.join(", ")}</span> : null}
            {item.note ? <span className="block text-xs italic">{item.note}</span> : null}
          </li>
        ))}
      </ul>

      {order.type === "DELIVERY" ? (
        <p className="mt-2 text-xs text-stone">
          {order.deliveryStreet}, {order.deliveryCity}
          {order.deliveryNotes ? ` (${order.deliveryNotes})` : ""}
        </p>
      ) : null}

      <p className="mt-2 text-xs text-stone">{formatMoney(order.totalCents)} paid</p>

      {order.delivery && order.delivery.status !== "UNASSIGNED" ? (
        <p className="mt-2 text-sm font-medium">
          {order.delivery.method === "THIRD_PARTY" ? `Courier: ${order.delivery.courierProvider}` : `Driver: ${order.delivery.driver?.name}`}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((status) => (
          <Button key={status} type="button" size="sm" disabled={busy} onClick={() => send(order.id, "status", "PATCH", { status })}>
            {ACTION_LABEL[status]}
          </Button>
        ))}
        {order.status === "RECEIVED" && !rejecting ? (
          <Button type="button" size="sm" variant="danger" disabled={busy} onClick={() => setRejecting(true)}>
            Reject
          </Button>
        ) : null}
      </div>

      {rejecting ? (
        <div className="mt-3 space-y-2">
          <label htmlFor={`reason-${order.id}`} className="text-sm font-medium">
            Why? The guest sees this, and is refunded in full.
          </label>
          <input id={`reason-${order.id}`} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} placeholder="For example: kitchen closed early" />
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="danger" disabled={busy} onClick={() => send(order.id, "status", "PATCH", { status: "REJECTED", reason: reason || undefined })}>
              Reject and refund
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setRejecting(false)}>
              Keep order
            </Button>
          </div>
        </div>
      ) : null}

      {canDispatch ? (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          <label htmlFor={`driver-${order.id}`} className="text-xs font-medium">
            {order.delivery?.status === "ASSIGNED" ? "Change driver" : "Assign a driver"}
          </label>
          <div className="flex gap-2">
            <select id={`driver-${order.id}`} value={driverId} onChange={(e) => setDriverId(e.target.value)} className={`${inputClass} min-h-9 py-1 text-sm`}>
              <option value="">Choose</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </select>
            <Button type="button" size="sm" variant="secondary" disabled={busy || !driverId} onClick={() => send(order.id, "assign-driver", "POST", { driverId })}>
              Assign
            </Button>
          </div>
          {courierAvailable ? (
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => send(order.id, "courier", "POST")}>
              No driver free? Send to courier
            </Button>
          ) : null}
        </div>
      ) : null}

      {order.delivery?.courierProvider === "simulated" && (order.status === "READY" || order.status === "OUT_FOR_DELIVERY") ? (
        <div className="mt-3 space-y-2 rounded-md bg-honey/20 p-2">
          <p className="text-xs">
            <strong>Test mode.</strong> No real courier is coming. Press what the courier would report.
          </p>
          {order.status === "READY" ? (
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => send(order.id, "courier", "PATCH", { status: "PICKED_UP" })}>
              Courier picked up
            </Button>
          ) : (
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => send(order.id, "courier", "PATCH", { status: "DELIVERED" })}>
              Courier delivered
            </Button>
          )}
        </div>
      ) : null}
    </li>
  );
}
