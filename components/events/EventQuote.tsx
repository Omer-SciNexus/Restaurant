"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { formatMoney } from "@/lib/domain";
import { EVENT_TYPE_LABEL } from "@/lib/events/rules";
import type { PublicEvent } from "@/lib/events/service";
import { DepositPay } from "../booking/DepositPay";
import { Button } from "../ui/Button";
import { FormError } from "../ui/Form";

const HEADLINE: Record<PublicEvent["status"], string> = {
  NEW: "We have your request",
  QUOTED: "Your quote is ready",
  DEPOSIT_PAID: "Your deposit is paid",
  DECLINED: "You declined this quote",
  CLOSED: "This request is closed",
};

export function EventQuote({ initial, testMode }: { initial: PublicEvent; testMode: boolean }) {
  const [request, setRequest] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/event-requests/${initial.id}`, { cache: "no-store" });
      if (response.ok) setRequest(((await response.json()) as { request: PublicEvent }).request);
    } catch {
      // The guest can reload; nothing is lost.
    }
  }, [initial.id]);

  async function decline() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/event-requests/${initial.id}/decline`, { method: "POST" });
      if (!response.ok) {
        const body = await response.json();
        setError(body.error?.message ?? "We could not decline this quote.");
      }
      await refresh();
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const rest = request.quoteCents !== null && request.depositCents !== null ? request.quoteCents - request.depositCents : 0;

  return (
    <div>
      <p className="text-sm text-stone">{EVENT_TYPE_LABEL[request.type]}</p>
      <h1 className="text-4xl" data-testid="event-headline">
        {HEADLINE[request.status]}
      </h1>

      {request.status === "NEW" || request.status === "DEPOSIT_PAID" ? (
        <div className="mt-6 flex justify-center">
          <Image src="/images/illustrations/event-request-sent.png" alt="" width={180} height={180} className="h-44 w-44 rounded-brand object-contain" />
        </div>
      ) : null}

      {request.status === "NEW" ? <p className="mt-4 text-stone">We will reply with a quote by email, and it will appear on this page.</p> : null}

      <section aria-labelledby="request-details" className="mt-6 rounded-brand bg-paper p-5 shadow-soft">
        <h2 id="request-details" className="text-xl">
          Your request
        </h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-stone">Date</dt>
            <dd className="font-medium">{request.date}</dd>
          </div>
          <div>
            <dt className="text-stone">Guests</dt>
            <dd className="font-medium">{request.guests}</dd>
          </div>
          {request.branchName ? (
            <div>
              <dt className="text-stone">Branch</dt>
              <dd>{request.branchName}</dd>
            </div>
          ) : null}
          {request.budgetCents !== null ? (
            <div>
              <dt className="text-stone">Your budget</dt>
              <dd>{formatMoney(request.budgetCents)}</dd>
            </div>
          ) : null}
          {request.menuNotes ? (
            <div className="sm:col-span-2">
              <dt className="text-stone">Menu wishes</dt>
              <dd>{request.menuNotes}</dd>
            </div>
          ) : null}
          {request.allergies ? (
            <div className="sm:col-span-2">
              <dt className="text-stone">Allergies and diets</dt>
              <dd>{request.allergies}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {request.quoteCents !== null && request.depositCents !== null && request.status !== "NEW" ? (
        <section aria-labelledby="quote" className="mt-4 rounded-brand bg-paper p-5 shadow-soft">
          <h2 id="quote" className="text-xl">
            Our quote
          </h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt>Quote</dt>
              <dd data-testid="quote-total">{formatMoney(request.quoteCents)}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>{request.status === "DEPOSIT_PAID" ? "Deposit paid" : "Deposit to pay now"}</dt>
              <dd data-testid="quote-deposit">{formatMoney(request.depositCents)}</dd>
            </div>
            <div className="flex justify-between text-stone">
              <dt>The rest, not charged now</dt>
              <dd>{formatMoney(rest)}</dd>
            </div>
          </dl>
          {request.quoteNotes ? <p className="mt-3 whitespace-pre-line text-sm">{request.quoteNotes}</p> : null}
        </section>
      ) : null}

      {request.canAccept && request.depositCents !== null ? (
        <section aria-labelledby="accept" className="mt-4 rounded-brand bg-paper p-5 shadow-soft">
          <h2 id="accept" className="mb-3 text-xl">
            Accept and pay the deposit
          </h2>
          <DepositPay
            endpoint={`/api/v1/event-requests/${request.id}/accept`}
            id={request.id}
            amountCents={request.depositCents}
            returnPath={`/events/${request.id}?paid=1`}
            note="Your date is confirmed as soon as your deposit is paid."
            testMode={testMode}
            buttonLabel={`Accept and pay ${formatMoney(request.depositCents)}`}
            onPaid={refresh}
            onRefused={refresh}
          />
          <div className="mt-4 border-t border-line pt-4">
            <FormError message={error} />
            {declining ? (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <p className="text-sm">Decline this quote? We will not charge you anything.</p>
                <Button type="button" size="sm" variant="danger" disabled={busy} onClick={decline}>
                  Yes, decline
                </Button>
                <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setDeclining(false)}>
                  Keep the quote
                </Button>
              </div>
            ) : (
              <Button type="button" size="sm" variant="ghost" onClick={() => setDeclining(true)}>
                Decline this quote
              </Button>
            )}
          </div>
        </section>
      ) : null}

      {request.status === "DEPOSIT_PAID" ? (
        <p role="status" className="mt-4 rounded-brand bg-sage p-4 text-sm">
          Thank you. Your deposit is paid and we have emailed you a confirmation. We will be in touch about the final details.
        </p>
      ) : null}
    </div>
  );
}
