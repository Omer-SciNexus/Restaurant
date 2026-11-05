"use client";

import { useState } from "react";
import { FormError } from "../ui/Form";

type Category = { id: string; name: string; items: { id: string; name: string }[] };

function withToggled(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function AvailabilityList({
  branchId,
  categories,
  soldOutIds,
  hiddenIds,
  canHide,
}: {
  branchId: string;
  categories: Category[];
  soldOutIds: string[];
  hiddenIds: string[];
  canHide: boolean;
}) {
  const [soldOut, setSoldOut] = useState(new Set(soldOutIds));
  const [hidden, setHidden] = useState(new Set(hiddenIds));
  const [error, setError] = useState<string | null>(null);

  async function save(change: { menuItemId: string; isAvailable?: boolean; isHidden?: boolean }): Promise<boolean> {
    setError(null);
    const response = await fetch("/api/v1/staff/availability", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId, ...change }),
    });
    if (!response.ok) setError("We could not save that. Please try again.");
    return response.ok;
  }

  async function toggleSoldOut(menuItemId: string) {
    if (await save({ menuItemId, isAvailable: soldOut.has(menuItemId) })) setSoldOut((previous) => withToggled(previous, menuItemId));
  }

  async function toggleHidden(menuItemId: string) {
    if (await save({ menuItemId, isHidden: !hidden.has(menuItemId) })) setHidden((previous) => withToggled(previous, menuItemId));
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
                const isHidden = hidden.has(item.id);
                return (
                  <li key={item.id} className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1 text-sm">
                    <span className={isSoldOut || isHidden ? "text-stone line-through" : ""}>{item.name}</span>
                    <span className="flex items-center gap-4">
                      <label className="flex min-h-9 cursor-pointer items-center gap-2">
                        <span className={`text-xs font-medium ${isSoldOut ? "text-danger" : "text-stone"}`}>{isSoldOut ? "Sold out" : "Available"}</span>
                        <input type="checkbox" checked={isSoldOut} onChange={() => toggleSoldOut(item.id)} aria-label={`${item.name} is sold out`} className="h-5 w-5 accent-forest" />
                      </label>
                      {canHide ? (
                        <label className="flex min-h-9 cursor-pointer items-center gap-2">
                          <span className={`text-xs font-medium ${isHidden ? "text-danger" : "text-stone"}`}>{isHidden ? "Hidden" : "On menu"}</span>
                          <input type="checkbox" checked={isHidden} onChange={() => toggleHidden(item.id)} aria-label={`Hide ${item.name} at this branch`} className="h-5 w-5 accent-forest" />
                        </label>
                      ) : null}
                    </span>
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
