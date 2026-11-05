import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { requirePageUser } from "@/lib/auth";
import { listUserBookings } from "@/lib/booking/account";
import { RESERVATION_LABEL } from "@/lib/booking/status";
import { formatMoney } from "@/lib/domain";
import { EVENT_STATUS_LABEL, EVENT_TYPE_LABEL } from "@/lib/events/rules";

export const metadata: Metadata = { title: "Your bookings", robots: { index: false } };

export default async function AccountBookingsPage() {
  const user = await requirePageUser("/account/bookings");
  const { reservations, events } = await listUserBookings(user.id);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Your bookings</h1>
        <LinkButton href="/book" variant="secondary">
          Book a table
        </LinkButton>
      </div>

      {reservations.length === 0 && events.length === 0 ? (
        <EmptyState image="/images/illustrations/reservation-confirmed.png" title="No bookings yet">
          Book a table or ask us about an event, and it will appear here.
        </EmptyState>
      ) : null}

      {reservations.length > 0 ? (
        <section aria-labelledby="tables" className="mt-6">
          <h2 id="tables" className="text-2xl">
            Tables
          </h2>
          <ul className="mt-3 space-y-3">
            {reservations.map((row) => (
              <li key={row.id} className="rounded-brand bg-paper p-4 shadow-soft" data-testid="account-reservation">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={`/book/${row.id}`} className="font-medium text-forest underline">
                    {row.when}
                  </Link>
                  <span className="rounded-full bg-sage px-2 py-0.5 text-xs font-medium">{RESERVATION_LABEL[row.status]}</span>
                </div>
                <p className="mt-1 text-sm text-stone">
                  {row.partySize} {row.partySize === 1 ? "guest" : "guests"} at {row.branchName} · {row.depositLabel}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {events.length > 0 ? (
        <section aria-labelledby="event-requests" className="mt-8">
          <h2 id="event-requests" className="text-2xl">
            Events and catering
          </h2>
          <ul className="mt-3 space-y-3">
            {events.map((row) => (
              <li key={row.id} className="rounded-brand bg-paper p-4 shadow-soft" data-testid="account-event">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={`/events/${row.id}`} className="font-medium text-forest underline">
                    {EVENT_TYPE_LABEL[row.type]} on {row.date}
                  </Link>
                  <span className="rounded-full bg-sage px-2 py-0.5 text-xs font-medium">{EVENT_STATUS_LABEL[row.status]}</span>
                </div>
                <p className="mt-1 text-sm text-stone">
                  {row.guests} guests
                  {row.branchName ? ` · ${row.branchName}` : ""}
                  {row.quoteCents !== null ? ` · Quote ${formatMoney(row.quoteCents)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
