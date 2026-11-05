"use client";

import { useCallback, useState } from "react";
import type { StaffReservation } from "@/lib/booking/staff";
import { RESERVATION_LABEL, staffReservationActions, type StaffReservationStatus } from "@/lib/booking/status";
import { formatMoney } from "@/lib/domain";
import { useLiveRefresh } from "../checkout/useOrderLive";
import { Button } from "../ui/Button";
import { FormError } from "../ui/Form";

const ACTION_LABEL: Record<StaffReservationStatus, string> = {
  SEATED: "Seat guests",
  NO_SHOW: "Mark no-show",
  COMPLETED: "Mark finished",
};

const INACTIVE = ["CANCELLED", "NO_SHOW", "COMPLETED"];

export function ReservationDay({ branchId, date, initial }: { branchId: string; date: string; initial: StaffReservation[] }) {
  const [reservations, setReservations] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/staff/reservations?branchId=${branchId}&date=${date}`, { cache: "no-store" });
      if (response.ok) setReservations(((await response.json()) as { reservations: StaffReservation[] }).reservations);
    } catch {
      // The next refresh catches up.
    }
  }, [branchId, date]);

  useLiveRefresh(null, refresh, 15_000);

  async function move(id: string, status: StaffReservationStatus) {
    setBusy(id);
    setError(null);
    try {
      const response = await fetch(`/api/v1/staff/reservations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
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

  const coming = reservations.filter((row) => !INACTIVE.includes(row.status));
  const guests = coming.reduce((sum, row) => sum + row.partySize, 0);

  return (
    <div>
      <p className="text-sm text-stone" role="status" data-testid="day-summary">
        {coming.length} {coming.length === 1 ? "booking" : "bookings"}, {guests} {guests === 1 ? "guest" : "guests"}
      </p>
      <div className="mt-3">
        <FormError message={error} />
      </div>

      {reservations.length === 0 ? <p className="mt-4 rounded-brand bg-paper p-5 text-sm shadow-soft">No bookings on this day.</p> : null}

      <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {reservations.map((row) => {
          const actions = staffReservationActions(row.status).filter((status) => status !== "NO_SHOW" || row.slotStarted);
          return (
            <li key={row.id} className={`rounded-brand bg-paper p-4 shadow-soft ${INACTIVE.includes(row.status) ? "opacity-70" : ""}`} data-testid={`reservation-${row.name}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-lg font-semibold">
                  {row.time} · {row.partySize} {row.partySize === 1 ? "guest" : "guests"}
                </span>
                <span className="rounded-full bg-sage px-2 py-0.5 text-xs font-medium" data-testid="reservation-status">
                  {RESERVATION_LABEL[row.status]}
                </span>
              </div>
              <p className="mt-1 text-sm">
                {row.name} ·{" "}
                <a href={`tel:${row.phone.replace(/\s/g, "")}`} className="text-forest underline">
                  {row.phone}
                </a>
              </p>
              {row.occasion ? <p className="mt-1 text-sm">Occasion: {row.occasion}</p> : null}
              {row.specialRequests ? <p className="mt-2 rounded-md bg-honey/20 p-2 text-sm font-medium">{row.specialRequests}</p> : null}
              {row.depositState !== "NONE" ? (
                <p className="mt-2 text-xs text-stone">
                  {row.depositLabel}: {formatMoney(row.depositCents)}
                </p>
              ) : null}
              {actions.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {actions.map((status) => (
                    <Button key={status} type="button" size="sm" variant={status === "NO_SHOW" ? "danger" : "primary"} disabled={busy === row.id} onClick={() => move(row.id, status)}>
                      {ACTION_LABEL[status]}
                    </Button>
                  ))}
                </div>
              ) : null}
              {row.status === "CONFIRMED" && !row.slotStarted ? <p className="mt-2 text-xs text-stone">You can mark a no-show once the table&apos;s time has come.</p> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
