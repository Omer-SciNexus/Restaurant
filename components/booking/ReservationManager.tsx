"use client";

import Image from "next/image";
import { useCallback, useState, type FormEvent } from "react";
import type { PublicReservation } from "@/lib/booking/access";
import { DEPOSIT_HOLD_MINUTES, formatDay } from "@/lib/booking/slots";
import { OCCASIONS } from "@/lib/booking/status";
import { formatMoney } from "@/lib/domain";
import { useLiveRefresh } from "../checkout/useOrderLive";
import { Button, LinkButton } from "../ui/Button";
import { FormError, inputClass } from "../ui/Form";
import { DepositPay } from "./DepositPay";
import { SlotPicker, useDaySlots } from "./SlotPicker";

const HEADLINE: Record<PublicReservation["status"], string> = {
  PENDING_DEPOSIT: "Your table is held",
  CONFIRMED: "Your table is booked",
  SEATED: "Enjoy your meal",
  COMPLETED: "Thanks for coming",
  NO_SHOW: "We missed you",
  CANCELLED: "This booking is cancelled",
};

function DepositSummary({ reservation }: { reservation: PublicReservation }) {
  const { deposit } = reservation;
  if (deposit.state === "NONE") return <p>No deposit is needed for this table.</p>;
  if (deposit.state === "DUE") return <p>{formatMoney(deposit.amountCents)} to pay, which confirms your table.</p>;
  if (deposit.state === "PAID") return <p>{formatMoney(deposit.heldCents)} paid.</p>;
  if (deposit.state === "KEPT") return <p>{formatMoney(deposit.heldCents)} was kept, under the cancellation rule.</p>;
  if (deposit.state === "REFUNDED") return <p>{formatMoney(deposit.refundedCents)} refunded to you.</p>;
  return <p>The deposit was not paid, so nothing was charged.</p>;
}

export function ReservationManager({ initial, testMode }: { initial: PublicReservation; testMode: boolean }) {
  const [reservation, setReservation] = useState(initial);
  const [panel, setPanel] = useState<"none" | "change" | "cancel">("none");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/reservations/${initial.id}`, { cache: "no-store" });
      if (response.ok) setReservation(((await response.json()) as { reservation: PublicReservation }).reservation);
    } catch {
      // A missed refresh is fine; the next one catches up.
    }
  }, [initial.id]);

  // While a deposit is due the page keeps up with the payment and the end of the hold by itself.
  const waiting = reservation.status === "PENDING_DEPOSIT";
  useLiveRefresh(null, waiting ? refresh : noop, waiting ? 5000 : 3_600_000);

  const onPaid = useCallback(() => {
    setNotice("Your deposit is paid and your table is confirmed.");
    void refresh();
  }, [refresh]);

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/reservations/${initial.id}/cancel`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error?.message ?? "We could not cancel this booking.");
        return;
      }
      setPanel("none");
      setNotice(
        body.refundedCents > 0
          ? `Your booking is cancelled and ${formatMoney(body.refundedCents)} has been refunded.`
          : body.keptCents > 0
            ? `Your booking is cancelled. Your ${formatMoney(body.keptCents)} deposit has been kept, as the time to cancel for a refund had passed.`
            : "Your booking is cancelled.",
      );
    } catch {
      setError("We could not reach the server. Your booking has not been cancelled.");
    } finally {
      setBusy(false);
      await refresh();
    }
  }

  const live = reservation.status === "CONFIRMED" || reservation.status === "SEATED";

  return (
    <div>
      <p className="text-sm text-stone">{reservation.branch.name}</p>
      <h1 className="text-4xl" data-testid="booking-headline">
        {HEADLINE[reservation.status]}
      </h1>

      {notice ? (
        <p role="status" data-testid="booking-notice" className="mt-4 rounded-brand bg-sage p-4 text-sm">
          {notice}
        </p>
      ) : null}

      {live ? (
        <div className="mt-6 flex justify-center">
          <Image src="/images/illustrations/reservation-confirmed.png" alt="" width={180} height={180} className="h-44 w-44 rounded-brand object-contain" />
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section aria-labelledby="your-table" className="rounded-brand bg-paper p-5 shadow-soft">
          <h2 id="your-table" className="text-xl">
            Your table
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-stone">When</dt>
              <dd className="font-medium" data-testid="booking-when">
                {reservation.when}
              </dd>
            </div>
            <div>
              <dt className="text-stone">Guests</dt>
              <dd className="font-medium" data-testid="booking-party">
                {reservation.partySize}
              </dd>
            </div>
            <div>
              <dt className="text-stone">Where</dt>
              <dd>
                {reservation.branch.name}, {reservation.branch.address}, {reservation.branch.city}
                <br />
                <a href={`tel:${reservation.branch.phone.replace(/\s/g, "")}`} className="text-forest underline">
                  {reservation.branch.phone}
                </a>
              </dd>
            </div>
            {reservation.occasion ? (
              <div>
                <dt className="text-stone">Occasion</dt>
                <dd>{reservation.occasion}</dd>
              </div>
            ) : null}
            {reservation.specialRequests ? (
              <div>
                <dt className="text-stone">Requests</dt>
                <dd>{reservation.specialRequests}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section aria-labelledby="deposit" className="rounded-brand bg-paper p-5 shadow-soft">
          <h2 id="deposit" className="text-xl">
            Deposit and cancelling
          </h2>
          <p className="mt-3 font-medium" data-testid="deposit-status">
            {reservation.deposit.label}
          </p>
          <div className="mt-1 text-sm">
            <DepositSummary reservation={reservation} />
          </div>
          {reservation.canCancel ? (
            <p className="mt-3 rounded-brand bg-sage p-3 text-sm" data-testid="cancel-rule">
              {reservation.rule}
            </p>
          ) : null}
        </section>
      </div>

      {reservation.canPay ? (
        <section aria-labelledby="pay-deposit" className="mt-6 rounded-brand bg-paper p-5 shadow-soft">
          <h2 id="pay-deposit" className="text-xl">
            Pay your deposit
          </h2>
          <p className="mt-1 mb-4 text-sm">
            We are holding this table until {reservation.holdEnds}, {DEPOSIT_HOLD_MINUTES} minutes from when you booked. If the deposit is not paid by then, the table is released.
          </p>
          <DepositPay
            endpoint={`/api/v1/reservations/${reservation.id}/pay`}
            id={reservation.id}
            amountCents={reservation.deposit.amountCents}
            returnPath={`/book/${reservation.id}?paid=1`}
            note="Your table is confirmed as soon as your deposit is paid."
            testMode={testMode}
            onPaid={onPaid}
            onRefused={refresh}
          />
        </section>
      ) : null}

      {reservation.canCancel || reservation.canChange ? (
        <div className="mt-6">
          {panel === "none" ? (
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="secondary" onClick={() => setPanel("change")}>
                Change booking
              </Button>
              <Button type="button" variant="danger" onClick={() => setPanel("cancel")}>
                Cancel booking
              </Button>
            </div>
          ) : null}

          {panel === "cancel" ? (
            <section aria-labelledby="cancel-heading" className="rounded-brand bg-paper p-5 shadow-soft">
              <h2 id="cancel-heading" className="text-xl">
                Cancel this booking?
              </h2>
              <p className="mt-2 text-sm" data-testid="cancel-outcome">
                {reservation.ifCancelledNow}
              </p>
              <div className="mt-4">
                <FormError message={error} />
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button type="button" variant="danger" disabled={busy} onClick={cancel}>
                  {busy ? "Cancelling..." : "Yes, cancel it"}
                </Button>
                <Button type="button" variant="ghost" disabled={busy} onClick={() => setPanel("none")}>
                  Keep my booking
                </Button>
              </div>
            </section>
          ) : null}

          {panel === "change" ? (
            <ChangeForm
              reservation={reservation}
              onDone={(updated, message) => {
                setReservation(updated);
                setPanel("none");
                setNotice(message);
              }}
              onClose={() => setPanel("none")}
            />
          ) : null}
        </div>
      ) : null}

      {reservation.status === "CANCELLED" ? (
        <div className="mt-6">
          <LinkButton href={`/book?branch=${reservation.branch.slug}`} variant="secondary">
            Book another table
          </LinkButton>
        </div>
      ) : null}
    </div>
  );
}

function noop() {}

function ChangeForm({ reservation, onDone, onClose }: { reservation: PublicReservation; onDone: (updated: PublicReservation, message: string) => void; onClose: () => void }) {
  const [date, setDate] = useState(reservation.date);
  const [party, setParty] = useState(reservation.partySize);
  const [slotIso, setSlotIso] = useState(reservation.startsAt);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const slots = useDaySlots(reservation.branch.id, date || reservation.date, party, reservation.id);
  const chosen = slots.data?.slots.find((slot) => slot.iso === slotIso) ?? null;
  const moved = slotIso !== reservation.startsAt;

  const deposit = slots.data?.deposit;
  const paid = reservation.deposit.heldCents > 0;
  const needsMore = reservation.status === "CONFIRMED" && deposit !== undefined && party > reservation.partySize && deposit.amountCents > reservation.deposit.heldCents;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/reservations/${reservation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsAt: moved ? slotIso : undefined,
          partySize: party === reservation.partySize ? undefined : party,
          occasion: String(form.get("occasion") ?? ""),
          specialRequests: String(form.get("requests") ?? ""),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error?.message ?? "We could not change your booking.");
        slots.reload();
        return;
      }
      const updated = body.reservation as PublicReservation;
      const refunded = reservation.deposit.heldCents - updated.deposit.heldCents;
      onDone(updated, refunded > 0 ? `Your booking has been changed and ${formatMoney(refunded)} of your deposit has been refunded.` : "Your booking has been changed.");
    } catch {
      setError("We could not reach the server. Your booking has not changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate aria-labelledby="change-heading" className="space-y-5 rounded-brand bg-paper p-5 shadow-soft">
      <h2 id="change-heading" className="text-xl">
        Change your booking
      </h2>
      {reservation.canMove ? null : (
        <p className="rounded-brand bg-sage p-3 text-sm">
          Your deposit is paid and the time to cancel for a refund has passed, so the date and time cannot be moved online. Please call {reservation.branch.name} on {reservation.branch.phone}. You can still make your party smaller here, but the deposit is not refunded.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {reservation.canMove ? (
          <div>
            <label htmlFor="change-date" className="mb-1 block text-sm font-medium">
              Date
            </label>
            <input
              id="change-date"
              type="date"
              required
              min={slots.data?.today}
              max={slots.data?.lastDate}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setError(null);
              }}
              className={inputClass}
            />
          </div>
        ) : null}
        <div>
          <label htmlFor="change-party" className="mb-1 block text-sm font-medium">
            Party size
          </label>
          <select id="change-party" value={party} onChange={(e) => setParty(Number(e.target.value))} className={inputClass}>
            {Array.from({ length: reservation.branch.capacity }, (_, index) => index + 1).map((size) => (
              <option key={size} value={size}>
                {size} {size === 1 ? "guest" : "guests"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {reservation.canMove ? <SlotPicker branchName={reservation.branch.name} date={date || reservation.date} slots={slots} value={slotIso} onChange={setSlotIso} allowFull={false} /> : null}

      <div>
        <label htmlFor="change-occasion" className="mb-1 block text-sm font-medium">
          Occasion (optional)
        </label>
        <select id="change-occasion" name="occasion" defaultValue={reservation.occasion ?? ""} className={inputClass}>
          <option value="">No special occasion</option>
          {[...new Set([...OCCASIONS, ...(reservation.occasion ? [reservation.occasion] : [])])].map((occasion) => (
            <option key={occasion} value={occasion}>
              {occasion}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="change-requests" className="mb-1 block text-sm font-medium">
          Special requests (optional)
        </label>
        <textarea id="change-requests" name="requests" rows={2} maxLength={500} defaultValue={reservation.specialRequests ?? ""} className={inputClass} />
      </div>

      {needsMore ? (
        <p role="status" className="rounded-brand bg-honey/20 p-3 text-sm">
          A party of {party} needs a deposit of {formatMoney(deposit!.amountCents)}, more than this booking has, so this cannot be done as a change. Please make a new booking for the larger party, then cancel this one.
        </p>
      ) : paid && party < reservation.partySize ? (
        <p className="text-sm text-stone">
          {reservation.canMove
            ? "With a smaller party, we refund the part of your deposit you no longer need."
            : "The time to cancel for a refund has passed, so a smaller party does not change your deposit."}
        </p>
      ) : reservation.status === "PENDING_DEPOSIT" && deposit && deposit.amountCents !== reservation.deposit.amountCents ? (
        <p className="text-sm text-stone">{deposit.amountCents > 0 ? `Your deposit will be ${formatMoney(deposit.amountCents)}.` : "A party this size does not need a deposit, so your table will be confirmed straight away."}</p>
      ) : null}

      {reservation.canMove && moved && chosen ? (
        <p className="text-sm text-stone" data-testid="change-summary">
          New time: {formatDay(date)} at {chosen.label}.
        </p>
      ) : null}
      {reservation.canMove && !chosen && !slots.loading ? <p className="text-sm text-stone">Choose a time for this date.</p> : null}
      {reservation.canMove && chosen && !chosen.available ? <p className="text-sm text-stone">There is not enough room at {chosen.label} for a party of {party}. Please choose another time.</p> : null}

      <FormError message={error} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy || needsMore || (reservation.canMove && !chosen?.available)}>
          {busy ? "Saving..." : "Save changes"}
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
          Never mind
        </Button>
      </div>
    </form>
  );
}
