"use client";

import { useState } from "react";
import type { DriverDelivery } from "@/lib/delivery/dispatch";
import { Button, buttonClass } from "../ui/Button";

/** Big buttons, usable one-handed: directions, call, then the next step. */
export function DeliveryActions({ delivery, onChanged, onError }: { delivery: DriverDelivery; onChanged: () => void | Promise<void>; onError: (message: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const address = encodeURIComponent(`${delivery.street}, ${delivery.city}`);

  async function update(status: "PICKED_UP" | "DELIVERED") {
    setBusy(true);
    onError(null);
    try {
      const response = await fetch(`/api/v1/driver/deliveries/${delivery.orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const body = await response.json();
        onError(body.error?.message ?? "That did not work. Please try again.");
      }
    } catch {
      onError("We could not reach the server. Please check your signal.");
    } finally {
      setBusy(false);
      await onChanged();
    }
  }

  const waitingForKitchen = delivery.orderStatus !== "READY" && delivery.deliveryStatus === "ASSIGNED";

  return (
    <div className="mt-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${address}`} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
          Directions
        </a>
        <a href={`tel:${delivery.customerPhone.replace(/[^\d+]/g, "")}`} className={buttonClass("secondary")}>
          Call guest
        </a>
      </div>
      {delivery.deliveryStatus === "ASSIGNED" ? (
        <>
          <Button type="button" size="lg" className="w-full" disabled={busy || waitingForKitchen} onClick={() => update("PICKED_UP")}>
            Picked up
          </Button>
          {waitingForKitchen ? <p className="text-center text-xs text-stone">The kitchen has not marked this ready yet.</p> : null}
        </>
      ) : (
        <Button type="button" size="lg" className="w-full" disabled={busy} onClick={() => update("DELIVERED")}>
          Delivered
        </Button>
      )}
    </div>
  );
}
