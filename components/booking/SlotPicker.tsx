"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { DaySlots } from "@/lib/booking/service";
import { BOOKING_HORIZON_DAYS, formatDay } from "@/lib/booking/slots";

type Loaded = { key: string; data: DaySlots | null; error: string | null };

/** Free times always come from the server. A stale answer is ignored when the choice has moved on. */
export function useDaySlots(branchId: string, date: string, party: number, reservationId?: string) {
  const [version, setVersion] = useState(0);
  const key = `${branchId}|${date}|${party}|${version}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let ignore = false;
    const query = new URLSearchParams({ date, party: String(party) });
    if (reservationId) query.set("reservationId", reservationId);
    const load = async (attempt: number): Promise<void> => {
      try {
        const response = await fetch(`/api/v1/branches/${branchId}/slots?${query}`, { cache: "no-store" });
        // A hiccup on our side is worth a second try before bothering the guest.
        if (response.status >= 500 && attempt === 0) return await load(1);
        const body = await response.json();
        if (ignore) return;
        if (response.ok) setLoaded({ key, data: body as DaySlots, error: null });
        else setLoaded({ key, data: null, error: body.error?.message ?? "We could not load the times." });
      } catch {
        if (attempt === 0) return await load(1);
        if (!ignore) setLoaded({ key, data: null, error: "We could not reach the server. Please check your connection." });
      }
    };
    void load(0);
    return () => {
      ignore = true;
    };
  }, [branchId, date, party, reservationId, key]);

  const current = loaded?.key === key ? loaded : null;
  return useMemo(
    () => ({ data: current?.data ?? null, error: current?.error ?? null, loading: current === null, reload: () => setVersion((v) => v + 1) }),
    [current],
  );
}

function statusLine(data: DaySlots, date: string, branchName: string): string {
  if (data.partyTooLarge) return "That party is larger than we can seat at one time.";
  if (data.reason === "OUT_OF_RANGE") return `We take bookings up to ${BOOKING_HORIZON_DAYS} days ahead. Please choose a date between ${formatDay(data.today)} and ${formatDay(data.lastDate)}.`;
  if (data.reason === "CLOSED") return `${branchName} is closed on ${formatDay(date)}. Please choose another day.`;
  if (data.reason === "NONE_LEFT") return `There are no more times left on ${formatDay(date)}. Please choose another day.`;
  const free = data.slots.filter((slot) => slot.available).length;
  if (free === 0) return `Every time on ${formatDay(date)} is full. Choose one to join its waitlist.`;
  return `${free} ${free === 1 ? "time" : "times"} free on ${formatDay(date)}, in the branch's local time.`;
}

type Props = {
  branchName: string;
  date: string;
  slots: ReturnType<typeof useDaySlots>;
  value: string;
  onChange: (iso: string) => void;
  /** Full times can be chosen when the guest can join their waitlist. */
  allowFull: boolean;
};

export function SlotPicker({ branchName, date, slots: { data, error, loading }, value, onChange, allowFull }: Props) {
  return (
    <fieldset>
      <legend className="font-heading text-2xl">Time</legend>
      <p role="status" data-testid="slot-status" className="mt-1 min-h-5 text-sm text-stone">
        {loading ? "Finding free times..." : data ? statusLine(data, date, branchName) : null}
      </p>
      {error ? (
        <p role="alert" className="mt-2 rounded-brand bg-danger-soft p-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {data?.partyTooLarge ? (
        <p className="mt-2 text-sm">
          For a larger group, please{" "}
          <Link href="/events" className="text-forest underline">
            send us an event request
          </Link>
          .
        </p>
      ) : null}
      {data && !data.partyTooLarge && data.slots.length > 0 ? (
        <div className={`mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 ${loading ? "opacity-60" : ""}`}>
          {data.slots.map((slot) => {
            const selected = value === slot.iso;
            const disabled = !slot.available && !allowFull;
            return (
              <label
                key={slot.iso}
                className={`flex min-h-11 flex-col items-center justify-center rounded-brand border-2 px-1 py-1.5 text-center has-focus-visible:outline-3 has-focus-visible:outline-forest ${
                  selected ? "border-forest bg-sage" : "border-transparent bg-paper"
                } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-sage/60"}`}
              >
                <input type="radio" name="slot" className="sr-only" disabled={disabled} checked={selected} onChange={() => onChange(slot.iso)} />
                <span className="text-[15px] font-medium">{slot.label}</span>
                {slot.available ? null : <span className="text-xs text-stone">{allowFull ? "Full, waitlist" : "Full"}</span>}
              </label>
            );
          })}
        </div>
      ) : null}
    </fieldset>
  );
}
