"use client";

import { useActionState, useState, useTransition } from "react";
import { closeRequestAction, sendQuoteAction } from "@/lib/actions/events";
import type { ActionState } from "@/lib/actions/helpers";
import { Button } from "../ui/Button";
import { Field, FormError, inputClass } from "../ui/Form";

const INITIAL: ActionState = {};

export function EventQuoteForm({ requestId, quote, deposit, notes }: { requestId: string; quote: string; deposit: string; notes: string }) {
  const [state, action, pending] = useActionState(sendQuoteAction.bind(null, requestId), INITIAL);
  const [closing, startClose] = useTransition();
  const [closeError, setCloseError] = useState<string | null>(null);

  function close() {
    setCloseError(null);
    startClose(async () => {
      const result = await closeRequestAction(requestId);
      if (result.error) setCloseError(result.error);
    });
  }

  return (
    <form action={action} className="mt-4 space-y-3 border-t border-line pt-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Quote in dollars" id={`quote-${requestId}`} name="quote" inputMode="decimal" required defaultValue={quote} placeholder="1500" />
        <Field label="Deposit in dollars" id={`deposit-${requestId}`} name="deposit" inputMode="decimal" required defaultValue={deposit} placeholder="300" />
      </div>
      <div>
        <label htmlFor={`notes-${requestId}`} className="mb-1 block text-sm font-medium">
          Menu and notes for the guest
        </label>
        <textarea id={`notes-${requestId}`} name="quoteNotes" rows={3} maxLength={2000} defaultValue={notes} className={inputClass} />
      </div>
      <FormError message={state.error ?? closeError} />
      {state.ok ? (
        <p role="status" className="rounded-brand bg-sage p-3 text-sm">
          Quote sent. The guest has been emailed a link to accept it and pay the deposit.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Sending..." : quote ? "Send updated quote" : "Send quote"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={closing} onClick={close}>
          Close request
        </Button>
      </div>
    </form>
  );
}
