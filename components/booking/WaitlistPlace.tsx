"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import type { PublicWaitlistEntry } from "@/lib/booking/access";
import { DEPOSIT_HOLD_MINUTES } from "@/lib/booking/slots";
import { formatMoney } from "@/lib/domain";
import { useLiveRefresh } from "../checkout/useOrderLive";
import { PaymentStep, type StartedPayment } from "../checkout/PaymentStep";
import { Button, LinkButton } from "../ui/Button";
import { FormError } from "../ui/Form";
import { PaymentMethodChoice, type PaymentChoice } from "./PaymentMethodChoice";

const HEADLINE: Record<string, string> = {
  WAITING: "You are on the waitlist",
  OFFERED: "A table has come free",
  CONFIRMED: "You took this table",
  EXPIRED: "This waitlist place has ended",
  CANCELLED: "You have left the waitlist",
};

export function WaitlistPlace({ initial, testMode }: { initial: PublicWaitlistEntry; testMode: boolean }) {
  const router = useRouter();
  const [entry, setEntry] = useState(initial);
  const [method, setMethod] = useState<PaymentChoice>("card");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState<StartedPayment | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/waitlist/${initial.id}`, { cache: "no-store" });
      if (response.ok) setEntry(((await response.json()) as { entry: PublicWaitlistEntry }).entry);
    } catch {
      // A missed refresh is fine; the next one catches up.
    }
  }, [initial.id]);

  // A guest with this page open sees an offer arrive without reloading.
  useLiveRefresh(null, refresh, entry.status === "WAITING" ? 5000 : 3_600_000);

  const onPaid = useCallback((reservationId: string) => router.push(`/book/${reservationId}`), [router]);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/waitlist/${entry.id}/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentMethod: method }) });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error?.message ?? "We could not confirm this table.");
        await refresh();
        return;
      }
      if (body.payment) setStarted({ orderId: body.reservationId, reference: "", totalCents: body.depositCents, payment: body.payment });
      else router.push(`/book/${body.reservationId}`);
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/waitlist/${entry.id}/cancel`, { method: "POST" });
      if (!response.ok) {
        const body = await response.json();
        setError(body.error?.message ?? "We could not take you off the waitlist.");
      }
      await refresh();
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (started) {
    return (
      <div>
        <h1 className="text-4xl">Pay your deposit</h1>
        <p className="mb-4 mt-2 text-stone" role="status">
          We are holding this table for {DEPOSIT_HOLD_MINUTES} minutes while you pay.
        </p>
        <p className="mb-4 rounded-brand bg-sage p-3 text-sm">{entry.rule}</p>
        <PaymentStep started={started} onPaid={onPaid} returnPath={`/book/${started.orderId}?paid=1`} note="Your table is confirmed as soon as your deposit is paid." />
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-stone">{entry.branch.name}</p>
      <h1 className="text-4xl" data-testid="waitlist-headline">
        {HEADLINE[entry.status]}
      </h1>
      <div className="mt-6 flex justify-center">
        <Image src="/images/illustrations/waitlist-joined.png" alt="" width={180} height={180} className="h-44 w-44 rounded-brand object-contain" />
      </div>

      <section aria-label="Your place" className="mt-6 rounded-brand bg-paper p-5 shadow-soft">
        <p className="font-medium" data-testid="waitlist-when">
          {entry.partySize} {entry.partySize === 1 ? "guest" : "guests"} on {entry.when}
        </p>
        <p className="mt-1 text-sm text-stone">
          {entry.branch.name}, {entry.branch.address}, {entry.branch.city}
        </p>
      </section>

      {entry.status === "WAITING" ? (
        <p role="status" className="mt-4 text-stone">
          We will email and text you if a table comes free. This page also updates by itself. We cannot promise a table.
        </p>
      ) : null}

      {entry.status === "CONFIRMED" ? <p className="mt-4 text-stone">We have emailed you a link to your booking, where you can change or cancel it.</p> : null}

      {entry.status === "EXPIRED" ? (
        <div className="mt-6">
          <LinkButton href={`/book?branch=${entry.branch.slug}`} variant="secondary">
            Find another time
          </LinkButton>
        </div>
      ) : null}

      {entry.status === "OFFERED" ? (
        <section aria-labelledby="offer" className="mt-6 space-y-4 rounded-brand bg-paper p-5 shadow-soft">
          <h2 id="offer" className="text-2xl">
            Take this table
          </h2>
          <p className="text-sm">We cannot hold this table for you, so it stays open to other guests until you confirm. We check it is still free when you do.</p>
          {entry.depositCents > 0 ? (
            <>
              <p className="text-sm">A party of {entry.partySize} pays a {formatMoney(entry.depositCents)} deposit to confirm the table.</p>
              <p className="rounded-brand bg-sage p-3 text-sm" data-testid="cancel-rule">
                {entry.rule}
              </p>
              <PaymentMethodChoice value={method} onChange={setMethod} testMode={testMode} />
            </>
          ) : null}
          <Button type="button" size="lg" className="w-full" disabled={busy} onClick={confirm}>
            {busy ? "Confirming..." : entry.depositCents > 0 ? `Continue to pay ${formatMoney(entry.depositCents)}` : "Confirm this table"}
          </Button>
        </section>
      ) : null}

      <div className="mt-4">
        <FormError message={error} />
      </div>

      {entry.status === "WAITING" || entry.status === "OFFERED" ? (
        <div className="mt-4">
          <Button type="button" variant="ghost" disabled={busy} onClick={leave}>
            Leave the waitlist
          </Button>
        </div>
      ) : null}
    </div>
  );
}
