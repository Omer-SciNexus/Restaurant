import Link from "next/link";
import { BranchSwitcher } from "@/components/staff/BranchSwitcher";
import { ReservationDay } from "@/components/staff/ReservationDay";
import { inputClass } from "@/components/ui/Form";
import { STAFF_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";
import { addDays, formatDay, isRealDate } from "@/lib/booking/slots";
import { listDayReservations } from "@/lib/booking/staff";
import { resolveStaffBranch } from "@/lib/branch-scope";
import { now } from "@/lib/env";
import { localTime } from "@/lib/hours";

export default async function StaffReservationsPage({ searchParams }: { searchParams: Promise<{ branch?: string; date?: string }> }) {
  const user = await requirePageRole(STAFF_ROLES, "/staff/reservations");
  const { branch: slug, date: requested } = await searchParams;
  const { branch, branches } = await resolveStaffBranch(user, slug);
  const today = localTime(now(), branch.timezone).isoDate;
  const date = requested && isRealDate(requested) ? requested : today;
  const reservations = await listDayReservations(branch, date);
  const dayLink = (isoDate: string) => `/staff/reservations?branch=${branch.slug}&date=${isoDate}`;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Reservations · {branch.name}</h1>
        <BranchSwitcher action="/staff/reservations" branches={branches} current={branch.slug} />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <p className="text-lg font-medium" data-testid="day-title">
          {formatDay(date)}
          {date === today ? " (today)" : ""}
        </p>
        <nav aria-label="Change day" className="flex gap-1">
          <Link href={dayLink(addDays(date, -1))} className="min-h-9 rounded-brand px-3 py-2 text-sm text-forest hover:bg-sage/60">
            Previous day
          </Link>
          {date === today ? null : (
            <Link href={dayLink(today)} className="min-h-9 rounded-brand px-3 py-2 text-sm text-forest hover:bg-sage/60">
              Today
            </Link>
          )}
          <Link href={dayLink(addDays(date, 1))} className="min-h-9 rounded-brand px-3 py-2 text-sm text-forest hover:bg-sage/60">
            Next day
          </Link>
        </nav>
        <form action="/staff/reservations" className="flex items-center gap-2">
          <input type="hidden" name="branch" value={branch.slug} />
          <label htmlFor="date" className="text-sm font-medium">
            Date
          </label>
          <input id="date" name="date" type="date" defaultValue={date} className={`${inputClass} w-auto`} />
          <button type="submit" className="min-h-11 rounded-brand border border-forest/40 px-3 text-sm text-forest hover:bg-sage/60">
            Show
          </button>
        </form>
      </div>

      <ReservationDay key={`${branch.id}-${date}`} branchId={branch.id} date={date} initial={reservations} />
    </>
  );
}
