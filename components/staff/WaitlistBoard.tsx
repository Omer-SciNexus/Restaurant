"use client";

import { useCallback, useState } from "react";
import type { StaffWaitlistEntry } from "@/lib/booking/staff";
import { useLiveRefresh } from "../checkout/useOrderLive";
import { Button } from "../ui/Button";
import { FormError } from "../ui/Form";

export function WaitlistBoard({ branchId, initial }: { branchId: string; initial: StaffWaitlistEntry[] }) {
  const [entries, setEntries] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/staff/waitlist?branchId=${branchId}`, { cache: "no-store" });
      if (response.ok) setEntries(((await response.json()) as { entries: StaffWaitlistEntry[] }).entries);
    } catch {
      // The next refresh catches up.
    }
  }, [branchId]);

  useLiveRefresh(null, refresh, 15_000);

  async function act(id: string, action: "OFFER" | "REMOVE") {
    setBusy(id);
    setError(null);
    try {
      const response = await fetch(`/api/v1/staff/waitlist/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      if (!response.ok) {
        const body = await response.json();
        setError(body.error?.message ?? "That did not work. Please try again.");
      }
    } catch {
      setError("We could not reach the server. Please check the connection.");
    } finally {
      setBusy(null);
      await refresh();
    }
  }

  return (
    <div>
      <p className="text-sm text-stone" role="status">
        {entries.length} {entries.length === 1 ? "party" : "parties"} waiting
      </p>
      <p className="mt-1 text-sm text-stone">When a cancellation frees room, the oldest party that fits is told by email and text. An offer does not hold seats.</p>
      <div className="mt-3">
        <FormError message={error} />
      </div>

      {entries.length === 0 ? <p className="mt-4 rounded-brand bg-paper p-5 text-sm shadow-soft">Nobody is on the waitlist.</p> : null}

      <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => (
          <li key={entry.id} className="rounded-brand bg-paper p-4 shadow-soft" data-testid={`waitlist-${entry.name}`}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">
                {entry.partySize} {entry.partySize === 1 ? "guest" : "guests"}
              </span>
              <span className="rounded-full bg-sage px-2 py-0.5 text-xs font-medium">{entry.status === "OFFERED" ? "Table offered" : "Waiting"}</span>
            </div>
            <p className="mt-1 text-sm">{entry.when}</p>
            <p className="mt-1 text-sm">
              {entry.name} ·{" "}
              <a href={`tel:${entry.phone.replace(/\s/g, "")}`} className="text-forest underline">
                {entry.phone}
              </a>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {entry.status === "WAITING" ? (
                <Button type="button" size="sm" variant="secondary" disabled={busy === entry.id} onClick={() => act(entry.id, "OFFER")}>
                  Offer a table
                </Button>
              ) : null}
              <Button type="button" size="sm" variant="ghost" disabled={busy === entry.id} onClick={() => act(entry.id, "REMOVE")}>
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
