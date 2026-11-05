"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";
import { DEPOSIT_HOLD_MINUTES, formatDay } from "@/lib/booking/slots";
import { OCCASIONS } from "@/lib/booking/status";
import { formatMoney } from "@/lib/domain";
import { PaymentStep, type StartedPayment } from "../checkout/PaymentStep";
import { Button } from "../ui/Button";
import { Field, FormError, inputClass } from "../ui/Form";
import { PaymentMethodChoice, type PaymentChoice } from "./PaymentMethodChoice";
import { SlotPicker, useDaySlots } from "./SlotPicker";

export type BookingBranch = { id: string; slug: string; name: string; address: string; capacity: number };
type FieldErrors = Record<string, string[] | undefined>;

type Props = {
  branches: BookingBranch[];
  initialBranchId: string;
  initialParty: number;
  today: string;
  lastDate: string;
  user: { name: string; email: string; phone: string } | null;
  testMode: boolean;
};

export function BookingForm({ branches, initialBranchId, initialParty, today, lastDate, user, testMode }: Props) {
  const router = useRouter();
  const [branchId, setBranchId] = useState(initialBranchId);
  const [date, setDate] = useState(today);
  const [party, setParty] = useState(initialParty);
  const [slotIso, setSlotIso] = useState("");
  const [method, setMethod] = useState<PaymentChoice>("card");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState<(StartedPayment & { when: string }) | null>(null);

  const branch = branches.find((b) => b.id === branchId) ?? branches[0]!;
  // A date cleared by the browser's picker is not sent; the last good one keeps the list stable.
  const slots = useDaySlots(branch.id, date || today, party);
  const chosen = slots.data?.slots.find((slot) => slot.iso === slotIso) ?? null;
  const deposit = slots.data?.deposit;
  const depositDue = deposit && deposit.amountCents > 0 && !slots.data?.partyTooLarge;
  const joining = chosen !== null && !chosen.available;

  const onPaid = useCallback(
    (reservationId: string) => {
      router.push(`/book/${reservationId}`);
    },
    [router],
  );

  function resetTime() {
    setSlotIso("");
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chosen) {
      setError("Please choose a time.");
      return;
    }
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    const contact = { branchId: branch.id, startsAt: chosen.iso, partySize: party, name: form.get("name"), email: form.get("email"), phone: form.get("phone") };
    try {
      if (joining) {
        const response = await fetch("/api/v1/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(contact) });
        const body = await response.json();
        if (response.ok) {
          router.push(`/book/waitlist/${body.id}`);
          return;
        }
        setFieldErrors(body.error?.fields ?? {});
        setError(body.error?.message ?? "We could not add you to the waitlist.");
        slots.reload();
        return;
      }
      const response = await fetch("/api/v1/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...contact,
          occasion: String(form.get("occasion") ?? "") || undefined,
          specialRequests: String(form.get("requests") ?? "") || undefined,
          paymentMethod: method,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setFieldErrors(body.error?.fields ?? {});
        setError(body.error?.message ?? "We could not book that table.");
        slots.reload();
        return;
      }
      if (body.payment) {
        setStarted({ orderId: body.reservationId, reference: "", totalCents: body.depositCents, payment: body.payment, when: `${formatDay(date)} at ${chosen.label}` });
      } else {
        router.push(`/book/${body.reservationId}`);
      }
    } catch {
      setError("We could not reach the server. Nothing has been booked.");
    } finally {
      setSubmitting(false);
    }
  }

  if (started) {
    return (
      <div className="mt-6 max-w-2xl">
        <p className="mb-4 text-stone" role="status">
          We are holding your table at {branch.name} for {started.when}. It is held for {DEPOSIT_HOLD_MINUTES} minutes while you pay.
        </p>
        <p className="mb-4 rounded-brand bg-sage p-3 text-sm">{chosen?.rule}</p>
        <PaymentStep started={started} onPaid={onPaid} returnPath={`/book/${started.orderId}?paid=1`} note="Your table is confirmed as soon as your deposit is paid." />
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mt-6 max-w-2xl space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="branch" className="mb-1 block text-sm font-medium">
            Branch
          </label>
          <select
            id="branch"
            value={branch.id}
            onChange={(e) => {
              const next = branches.find((b) => b.id === e.target.value)!;
              setBranchId(next.id);
              setParty((current) => Math.min(current, next.capacity));
              resetTime();
            }}
            className={inputClass}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="date" className="mb-1 block text-sm font-medium">
            Date
          </label>
          <input
            id="date"
            type="date"
            required
            min={today}
            max={lastDate}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              resetTime();
            }}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="party" className="mb-1 block text-sm font-medium">
            Party size
          </label>
          <select
            id="party"
            value={party}
            onChange={(e) => {
              setParty(Number(e.target.value));
              setError(null);
            }}
            className={inputClass}
          >
            {Array.from({ length: branch.capacity }, (_, index) => index + 1).map((size) => (
              <option key={size} value={size}>
                {size} {size === 1 ? "guest" : "guests"}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-stone">
            A bigger group?{" "}
            <Link href="/events" className="text-forest underline">
              Request an event
            </Link>
          </p>
        </div>
      </div>

      <SlotPicker branchName={branch.name} date={date || today} slots={slots} value={slotIso} onChange={setSlotIso} allowFull />

      {joining ? (
        <p role="status" className="rounded-brand bg-sage p-4 text-sm">
          <strong>{chosen.label} is full.</strong> Join the waitlist and we will email and text you if a table comes free. We cannot promise one, and you can leave the list at any time.
        </p>
      ) : (
        <div className="space-y-3">
          <h2 className="text-2xl">Your visit</h2>
          <div>
            <label htmlFor="occasion" className="mb-1 block text-sm font-medium">
              Occasion (optional)
            </label>
            <select id="occasion" name="occasion" defaultValue="" className={inputClass}>
              <option value="">No special occasion</option>
              {OCCASIONS.map((occasion) => (
                <option key={occasion} value={occasion}>
                  {occasion}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="requests" className="mb-1 block text-sm font-medium">
              Special requests (optional)
            </label>
            <textarea id="requests" name="requests" rows={2} maxLength={500} className={inputClass} placeholder="A high chair, an allergy we should know about" />
            {fieldErrors.specialRequests?.[0] ? <p className="mt-1 text-sm text-danger">{fieldErrors.specialRequests[0]}</p> : null}
          </div>
        </div>
      )}

      <fieldset className="space-y-3">
        <legend className="font-heading text-2xl">Your details</legend>
        {user ? null : (
          <p className="text-sm text-stone">
            No account needed.{" "}
            <Link href="/login?next=/book" className="text-forest underline">
              Sign in
            </Link>{" "}
            to use saved details and see your bookings in one place.
          </p>
        )}
        <Field label="Name" name="name" autoComplete="name" required defaultValue={user?.name} error={fieldErrors.name?.[0]} />
        <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={user?.email} error={fieldErrors.email?.[0]} />
        <Field label="Phone" name="phone" type="tel" autoComplete="tel" required defaultValue={user?.phone} hint={joining ? "We text you if a table comes free." : undefined} error={fieldErrors.phone?.[0]} />
      </fieldset>

      {depositDue && !joining ? (
        <section aria-labelledby="deposit" className="space-y-3 rounded-brand bg-paper p-5 shadow-soft">
          <h2 id="deposit" className="text-2xl">
            Deposit: {formatMoney(deposit.amountCents)}
          </h2>
          <p className="text-sm">
            Groups of {deposit.minParty} or more pay {formatMoney(deposit.perGuestCents)} per guest to confirm the table. We hold it for {DEPOSIT_HOLD_MINUTES} minutes while you pay.
          </p>
          <p className="rounded-brand bg-sage p-3 text-sm" data-testid="cancel-rule">
            {chosen ? chosen.rule : `Cancel at least ${deposit.freeCancelHours} hours before your table and your deposit is refunded in full. After that the deposit is kept.`}
          </p>
          <PaymentMethodChoice value={method} onChange={setMethod} testMode={testMode} />
        </section>
      ) : null}

      <FormError message={error} />

      <Button type="submit" size="lg" className="w-full" disabled={submitting || !chosen || slots.loading}>
        {submitting ? "One moment..." : joining ? "Join the waitlist" : depositDue ? `Continue to pay ${formatMoney(deposit.amountCents)}` : "Book this table"}
      </Button>
      {chosen ? null : <p className="text-center text-sm text-stone">Choose a time to continue.</p>}
    </form>
  );
}
