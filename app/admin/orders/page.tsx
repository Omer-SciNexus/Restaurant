import type { Metadata } from "next";
import Link from "next/link";
import { ADMIN_ROLES } from "@/lib/access";
import { searchOrders } from "@/lib/admin/order-search";
import { requirePageRole } from "@/lib/auth";
import { formatMoney } from "@/lib/domain";
import { STATUS_LABEL, type OrderStatus } from "@/lib/orders/status";

export const metadata: Metadata = { title: "Orders" };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePageRole(ADMIN_ROLES, "/admin/orders");
  const { q = "" } = await searchParams;
  const orders = await searchOrders(q);

  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl">Orders</h1>
      <p className="mt-1 text-sm text-stone">Search across all branches by reference, email or phone. Open an order to refund it.</p>
      <form action="/admin/orders" className="mt-4 flex flex-wrap items-center gap-2">
        <label htmlFor="q" className="sr-only">
          Search orders
        </label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="NF-4F7K2Q, an email or a phone number" className="min-h-11 w-full max-w-md rounded-brand border border-stone/50 bg-paper px-3 text-sm" />
        <button type="submit" className="min-h-11 rounded-brand border border-forest/40 px-4 text-sm text-forest hover:bg-sage/60">
          Search
        </button>
      </form>

      {q && orders.length === 0 ? (
        <p role="status" className="mt-4 rounded-brand bg-paper p-4 text-sm shadow-soft">
          No orders match &quot;{q}&quot;.
        </p>
      ) : null}

      {orders.length > 0 ? (
        <div tabIndex={0} role="region" aria-label="Orders" className="mt-4 overflow-x-auto rounded-brand bg-paper shadow-soft">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">{q ? `Orders matching ${q}` : "Latest paid orders"}</caption>
            <thead className="border-b border-line text-xs text-stone">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Guest</th>
                <th className="px-4 py-3 font-medium">Placed</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((order) => (
                <tr key={order.id} data-testid={`order-${order.reference}`}>
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/orders/${order.id}`} className="font-medium text-forest hover:underline">
                      {order.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">{order.branch.name}</td>
                  <td className="px-4 py-2.5">
                    {order.customerName}
                    <span className="block text-xs text-stone">{order.customerEmail}</span>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{order.createdAt.toISOString().slice(0, 10)}</td>
                  <td className="px-4 py-2.5">{STATUS_LABEL[order.status as OrderStatus]}</td>
                  <td className="px-4 py-2.5">{formatMoney(order.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
