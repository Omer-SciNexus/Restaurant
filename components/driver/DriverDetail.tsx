"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DriverDelivery } from "@/lib/delivery/dispatch";
import { FormError } from "../ui/Form";
import { DeliveryActions } from "./DeliveryActions";

export function DriverDetail({ delivery }: { delivery: DriverDelivery }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-4 rounded-brand bg-paper p-5 shadow-soft">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-stone">Pick up from</h2>
      <p className="mt-1">
        {delivery.branch.name}, {delivery.branch.address}
      </p>
      <h2 className="mt-4 text-xs font-semibold uppercase tracking-wide text-stone">Deliver to</h2>
      <p className="mt-1 font-heading text-2xl">{delivery.street}</p>
      <p className="text-sm">
        {delivery.city} · {delivery.customerName}
      </p>
      {delivery.notes ? <p className="mt-2 rounded-md bg-oat-deep p-2 text-sm">{delivery.notes}</p> : null}
      <FormError message={error} />
      <DeliveryActions delivery={delivery} onError={setError} onChanged={() => router.refresh()} />
    </div>
  );
}
