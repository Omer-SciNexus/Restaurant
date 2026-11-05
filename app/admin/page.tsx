import type { Metadata } from "next";
import Link from "next/link";
import { ADMIN_ROLES } from "@/lib/access";
import { loadDashboard } from "@/lib/admin/dashboard";
import { requirePageRole } from "@/lib/auth";
import { formatMoney } from "@/lib/domain";

export const metadata: Metadata = { title: "Today" };

function Stat({ label, value, note, href }: { label: string; value: number; note?: string; href: string }) {
  return (
    <Link href={href} className="block rounded-brand bg-paper p-4 shadow-soft hover:bg-sage/30">
      <span className="block text-sm text-stone">{label}</span>
      <span className="mt-1 block font-heading text-3xl">{value}</span>
      {note ? <span className="mt-1 block text-xs text-stone">{note}</span> : null}
    </Link>
  );
}

export default async function AdminDashboardPage() {
  await requirePageRole(ADMIN_ROLES, "/admin");
  const { rows, totals, alerts } = await loadDashboard();

  return (
    <>
      <h1 className="text-3xl">Today</h1>
      <p className="mt-1 text-sm text-stone">Across all {rows.length} branches, each on its own clock. Unpaid orders are not counted.</p>

      <ul className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <li>
          <Stat label="Orders today" value={totals.orders} note={`${totals.activeOrders} still in progress`} href="/admin/orders" />
        </li>
        <li>
          <Stat label="Bookings today" value={totals.bookings} href="/staff/reservations" />
        </li>
        <li>
          <Stat label="Unverified ingredients" value={totals.unverifiedIngredients} note={`of ${totals.ingredients}`} href="/admin/ingredients?show=unverified" />
        </li>
        <li>
          <Stat label="Waiting for approval" value={totals.pendingApprovals} note="Nutrition changes" href="/admin/approvals" />
        </li>
      </ul>

      <section aria-labelledby="alerts" className="mt-8 max-w-4xl">
        <h2 id="alerts" className="text-2xl">
          Alerts
        </h2>
        {alerts.length === 0 ? (
          <p className="mt-3 rounded-brand bg-paper p-4 text-sm shadow-soft">Nothing needs attention right now.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-brand bg-paper px-4 text-sm shadow-soft" data-testid="alerts">
            {alerts.map((alert) => (
              <li key={alert.key} className="flex flex-wrap items-baseline gap-x-2 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${alert.level === "urgent" ? "bg-danger-soft text-danger" : "bg-honey/30"}`}>{alert.level === "urgent" ? "Urgent" : "Notice"}</span>
                <Link href={alert.href} className="text-forest underline underline-offset-2">
                  {alert.text}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="by-branch" className="mt-8">
        <h2 id="by-branch" className="text-2xl">
          By branch
        </h2>
        <div tabIndex={0} role="region" aria-labelledby="by-branch" className="mt-3 overflow-x-auto rounded-brand bg-paper shadow-soft">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-xs text-stone">
              <tr>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Orders</th>
                <th className="px-4 py-3 font-medium">In progress</th>
                <th className="px-4 py-3 font-medium">Order value</th>
                <th className="px-4 py-3 font-medium">Bookings</th>
                <th className="px-4 py-3 font-medium">Online orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-2.5">
                    <Link href={`/staff/orders?branch=${row.slug}`} className="font-medium text-forest hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">{row.orders}</td>
                  <td className="px-4 py-2.5">{row.activeOrders}</td>
                  <td className="px-4 py-2.5">{formatMoney(row.takenCents)}</td>
                  <td className="px-4 py-2.5">
                    {row.bookings}
                    {row.guests > 0 ? <span className="text-stone"> ({row.guests} guests)</span> : null}
                  </td>
                  <td className="px-4 py-2.5">
                    {row.onlineOrderingOpen ? <span className="rounded-full bg-sage px-2 py-0.5 text-xs font-medium">Open</span> : <span className="rounded-full bg-terracotta px-2 py-0.5 text-xs font-medium text-white">In-store only</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
