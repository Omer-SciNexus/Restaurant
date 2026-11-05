import type { Metadata } from "next";
import Link from "next/link";
import { EventQuoteForm } from "@/components/admin/EventQuoteForm";
import { ADMIN_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";
import { formatDay } from "@/lib/booking/slots";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/domain";
import { localTime } from "@/lib/hours";
import { EVENT_STATUS_LABEL, EVENT_TYPE_LABEL } from "@/lib/events/rules";
import { DEFAULT_TIMEZONE } from "@/lib/selection";

export const metadata: Metadata = { title: "Events" };

const dollars = (cents: number | null) => (cents === null ? "" : (cents / 100).toFixed(2));

export default async function AdminEventsPage() {
  await requirePageRole(ADMIN_ROLES, "/admin/events");
  const requests = await prisma.eventRequest.findMany({
    orderBy: [{ eventDate: "asc" }, { createdAt: "asc" }],
    include: { branch: { select: { name: true, timezone: true } }, payment: { select: { status: true } } },
    take: 200,
  });
  const open = requests.filter((row) => row.status === "NEW" || row.status === "QUOTED");
  const paid = requests.filter((row) => row.status === "DEPOSIT_PAID");
  const done = requests.filter((row) => row.status === "DECLINED" || row.status === "CLOSED");
  const dateOf = (row: (typeof requests)[number]) => formatDay(localTime(row.eventDate, row.branch?.timezone ?? DEFAULT_TIMEZONE).isoDate, true);

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl">Events and catering</h1>
      <p className="mt-1 text-sm text-stone">Reply with a quote and a deposit. The guest gets a private link to accept and pay.</p>

      {open.length === 0 ? <p className="mt-6 rounded-brand bg-paper p-5 text-sm shadow-soft">No requests are waiting.</p> : null}

      <ul className="mt-6 space-y-4">
        {open.map((row) => (
          <li key={row.id} className="rounded-brand bg-paper p-5 shadow-soft" data-testid={`event-${row.contactName}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl">
                {EVENT_TYPE_LABEL[row.type]} · {row.guests} guests
              </h2>
              <span className="rounded-full bg-sage px-2 py-0.5 text-xs font-medium" data-testid="event-status">
                {EVENT_STATUS_LABEL[row.status]}
              </span>
            </div>
            <p className="mt-1 text-sm">
              {dateOf(row)}
              {row.branch ? ` · ${row.branch.name}` : " · No branch preference"}
            </p>
            <p className="mt-1 text-sm">
              {row.contactName} · {row.contactEmail} · {row.contactPhone}
            </p>
            {row.budgetCents !== null ? <p className="mt-1 text-sm">Budget: {formatMoney(row.budgetCents)}</p> : null}
            {row.menuNotes ? <p className="mt-2 text-sm">Menu wishes: {row.menuNotes}</p> : null}
            {row.allergies ? <p className="mt-2 rounded-md bg-danger-soft p-2 text-sm font-semibold text-danger">Allergies: {row.allergies}</p> : null}
            <p className="mt-2 text-xs">
              <Link href={`/events/${row.id}`} className="text-forest underline">
                See the guest&apos;s page
              </Link>
            </p>
            <EventQuoteForm requestId={row.id} quote={dollars(row.quoteCents)} deposit={dollars(row.depositCents)} notes={row.quoteNotes ?? ""} />
          </li>
        ))}
      </ul>

      {paid.length > 0 ? (
        <section aria-labelledby="paid" className="mt-10">
          <h2 id="paid" className="text-2xl">
            Deposit paid
          </h2>
          <ul className="mt-3 divide-y divide-line rounded-brand bg-paper px-5 text-sm shadow-soft">
            {paid.map((row) => (
              <li key={row.id} className="py-2.5" data-testid={`paid-event-${row.contactName}`}>
                <strong>{row.contactName}</strong>: {EVENT_TYPE_LABEL[row.type]} for {row.guests} on {dateOf(row)}. Quote {formatMoney(row.quoteCents ?? 0)}, deposit {formatMoney(row.depositCents ?? 0)} paid.{" "}
                <Link href={`/events/${row.id}`} className="text-forest underline">
                  Details
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {done.length > 0 ? (
        <section aria-labelledby="done" className="mt-10">
          <h2 id="done" className="text-2xl">
            Declined and closed
          </h2>
          <ul className="mt-3 divide-y divide-line rounded-brand bg-paper px-5 text-sm shadow-soft">
            {done.map((row) => (
              <li key={row.id} className="py-2.5">
                <strong>{row.contactName}</strong>: {EVENT_TYPE_LABEL[row.type]} for {row.guests} on {dateOf(row)}. {EVENT_STATUS_LABEL[row.status]}.
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
