"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import type { DriverDelivery } from "@/lib/delivery/dispatch";
import { useLiveRefresh } from "../checkout/useOrderLive";
import { EmptyState } from "../ui/EmptyState";
import { FormError } from "../ui/Form";
import { DeliveryActions } from "./DeliveryActions";

export function DriverList({ driverId, initial }: { driverId: string; initial: DriverDelivery[] }) {
  const [deliveries, setDeliveries] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/driver/deliveries", { cache: "no-store" });
      if (response.ok) setDeliveries(((await response.json()) as { deliveries: DriverDelivery[] }).deliveries);
    } catch {
      // The next refresh catches up.
    }
  }, []);

  useLiveRefresh(`driver-${driverId}`, refresh, 5000);

  if (deliveries.length === 0) {
    return (
      <EmptyState image="/images/restaurant/delivery-bicycle.png" title="Nothing to deliver right now">
        <p>New deliveries appear here by themselves.</p>
      </EmptyState>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <FormError message={error} />
      <ul className="space-y-4">
        {deliveries.map((delivery) => (
          <li key={delivery.orderId} className="rounded-brand bg-paper p-4 shadow-soft" data-testid={`delivery-${delivery.reference}`}>
            <Link href={`/driver/${delivery.orderId}`} className="font-semibold hover:underline">
              {delivery.reference}
            </Link>
            <p className="mt-1 font-heading text-xl">{delivery.street}</p>
            <p className="text-sm text-stone">
              {delivery.city} · {delivery.itemCount} {delivery.itemCount === 1 ? "item" : "items"} · {delivery.customerName}
            </p>
            <DeliveryActions delivery={delivery} onChanged={refresh} onError={setError} />
          </li>
        ))}
      </ul>
    </div>
  );
}
