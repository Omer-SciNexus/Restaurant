"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { dollarsToCents, EVENT_TYPE_LABEL, type EventType } from "@/lib/events/rules";
import { Button } from "../ui/Button";
import { Field, FormError, inputClass } from "../ui/Form";

type Props = {
  branches: { id: string; name: string }[];
  initialBranchId: string;
  earliest: Record<EventType, string>;
  cateringLeadDays: number;
  cateringMinLabel: string | null;
  user: { name: string; email: string; phone: string } | null;
};

const HINT: Record<EventType, string> = {
  PRIVATE_EVENT: "At one of our branches",
  CATERING: "We bring the food to you",
};

export function EventRequestForm({ branches, initialBranchId, earliest, cateringLeadDays, cateringMinLabel, user }: Props) {
  const [type, setType] = useState<EventType>("PRIVATE_EVENT");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const budgetText = String(form.get("budget") ?? "").trim();
    const budgetCents = budgetText ? dollarsToCents(budgetText) : null;
    if (budgetText && budgetCents === null) {
      setFieldErrors({ budget: ["Enter an amount in dollars, for example 1500."] });
      return;
    }
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const response = await fetch("/api/v1/event-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          branchId: String(form.get("branch") ?? "") || null,
          date: form.get("date"),
          guests: Number(form.get("guests")),
          budgetCents,
          menuNotes: String(form.get("menuNotes") ?? "") || undefined,
          allergies: String(form.get("allergies") ?? "") || undefined,
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setFieldErrors(body.error?.fields ?? {});
        setError(body.error?.message ?? "We could not send your request.");
        return;
      }
      setSentId(body.id);
    } catch {
      setError("We could not reach the server. Your request has not been sent.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sentId) {
    return (
      <div role="status" className="mt-6 flex flex-col items-center rounded-brand bg-paper p-6 text-center shadow-soft" data-testid="event-sent">
        <Image src="/images/illustrations/event-request-sent.png" alt="" width={180} height={180} className="h-44 w-44 object-contain" />
        <h2 className="mt-3 text-2xl">We have your request</h2>
        <p className="mt-2 max-w-md text-sm text-stone">We will reply with a quote by email. You can also follow your request on its own page, which only you have the link to.</p>
        <Link href={`/events/${sentId}`} className="mt-4 text-forest underline">
          See your request
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mt-6 space-y-8">
      <fieldset>
        <legend className="font-heading text-2xl">What are you planning?</legend>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {(["PRIVATE_EVENT", "CATERING"] as const).map((option) => (
            <label key={option} className={`cursor-pointer rounded-brand border-2 bg-paper p-4 has-focus-visible:outline-3 has-focus-visible:outline-forest ${type === option ? "border-forest" : "border-transparent"}`}>
              <input type="radio" name="type" className="sr-only" checked={type === option} onChange={() => setType(option)} />
              <span className="block font-medium">{EVENT_TYPE_LABEL[option]}</span>
              <span className="text-sm text-stone">{HINT[option]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-heading text-2xl">The details</legend>
        <div>
          <label htmlFor="event-branch" className="mb-1 block text-sm font-medium">
            Branch
          </label>
          <select id="event-branch" name="branch" defaultValue={initialBranchId} className={inputClass}>
            {type === "CATERING" ? <option value="">No preference</option> : null}
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            key={type}
            label="Date"
            name="date"
            type="date"
            required
            min={earliest[type]}
            hint={type === "CATERING" ? `Catering needs at least ${cateringLeadDays} days' notice.` : undefined}
            error={fieldErrors.date?.[0]}
          />
          <Field label="Number of guests" name="guests" type="number" inputMode="numeric" min={1} max={5000} required error={fieldErrors.guests?.[0]} />
        </div>
        <Field label="Budget in dollars (optional)" name="budget" inputMode="decimal" hint={type === "CATERING" && cateringMinLabel ? `Catering starts from ${cateringMinLabel}.` : "A rough figure helps us suggest the right menu."} error={fieldErrors.budget?.[0]} />
        <div>
          <label htmlFor="menuNotes" className="mb-1 block text-sm font-medium">
            Menu wishes (optional)
          </label>
          <textarea id="menuNotes" name="menuNotes" rows={3} maxLength={1000} className={inputClass} placeholder="Dishes you love, the feel of the day, the time you would like to start" />
        </div>
        <div>
          <label htmlFor="allergies" className="mb-1 block text-sm font-medium">
            Allergies and diets (optional)
          </label>
          <textarea id="allergies" name="allergies" rows={2} maxLength={500} className={inputClass} />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-heading text-2xl">Your details</legend>
        <Field label="Name" name="name" autoComplete="name" required defaultValue={user?.name} error={fieldErrors.name?.[0]} />
        <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={user?.email} error={fieldErrors.email?.[0]} />
        <Field label="Phone" name="phone" type="tel" autoComplete="tel" required defaultValue={user?.phone} error={fieldErrors.phone?.[0]} />
      </fieldset>

      <FormError message={error} />
      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "Sending..." : "Send my request"}
      </Button>
      <p className="text-center text-sm text-stone">Nothing is charged now. We reply with a quote, and you decide from there.</p>
    </form>
  );
}
