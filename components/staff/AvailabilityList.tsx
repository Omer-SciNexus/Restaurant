"use client";

import { useState } from "react";
import { FormError } from "../ui/Form";

type Category = { id: string; name: string; items: { id: string; name: string }[] };

export function AvailabilityList({ branchId, categories, soldOutIds }: { branchId: string; categories: Category[]; soldOutIds: string[] }) {
  const [soldOut, setSoldOut] = useState(new Set(soldOutIds));
  const [error, setError] = useState<string | null>(null);

  async function toggle(menuItemId: string) {
    const nowSoldOut = !soldOut.has(menuItemId);
    setError(null);
    const response = await fetch("/api/v1/staff/availability", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId, menuItemId, isAvailable: !nowSoldOut }),
    });
    if (!response.ok) {
      setError("We could not save that. Please try again.");
      return;
    }
    setSoldOut((previous) => {
      const next = new Set(previous);
      if (nowSoldOut) next.add(menuItemId);
      else next.delete(menuItemId);
      return next;
    });
  }

  return (
    <div>
      <FormError message={error} />
      <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => (
          <section key={category.id} className="rounded-brand bg-paper p-4 shadow-soft">
            <h2 className="text-lg">{category.name}</h2>
            <ul className="mt-2 divide-y divide-line">
              {category.items.map((item) => {
                const isSoldOut = soldOut.has(item.id);
                return (
                  <li key={item.id}>
                    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm">
                      <span className={isSoldOut ? "text-stone line-through" : ""}>{item.name}</span>
                      <span className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${isSoldOut ? "text-danger" : "text-stone"}`}>{isSoldOut ? "Sold out" : "Available"}</span>
                        <input type="checkbox" checked={isSoldOut} onChange={() => toggle(item.id)} aria-label={`${item.name} is sold out`} className="h-5 w-5 accent-forest" />
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
