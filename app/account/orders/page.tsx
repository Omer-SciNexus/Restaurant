import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { requirePageUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/domain";
import { STATUS_LABEL } from "@/lib/orders/status";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage() {
  const user = await requirePageUser("/account/orders");
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { branch: { select: { name: true, timezone: true } }, items: { select: { quantity: true, nameSnapshot: true } } },
  });

  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl">Orders</h1>
      {orders.length === 0 ? (
        <EmptyState image="/images/illustrations/empty-orders.png" title="No orders yet">
          <p>When you order while signed in, it shows up here with its receipt.</p>
          <LinkButton href="/menu" className="mt-4">
            See the menu
          </LinkButton>
        </EmptyState>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((order) => {
            const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
            const placed = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: order.branch.timezone }).format(order.createdAt);
            return (
              <li key={order.id} className="rounded-brand bg-paper p-4 shadow-soft" data-testid={`order-${order.reference}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 className="text-lg">{order.reference}</h2>
                  <p className="font-semibold">{formatMoney(order.totalCents)}</p>
                </div>
                <p className="mt-1 text-sm text-stone">
                  {placed} at {order.branch.name}. {order.type === "DELIVERY" ? "Delivery" : "Pickup"}.
                </p>
                <p className="mt-1 text-sm">
                  {count} {count === 1 ? "item" : "items"}: {order.items.map((item) => item.nameSnapshot).join(", ")}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-sage px-2.5 py-1 text-xs font-medium">{STATUS_LABEL[order.status]}</span>
                  <LinkButton href={`/order/${order.id}`} variant="secondary" size="sm" aria-label={`Receipt for order ${order.reference}`}>
                    View receipt
                  </LinkButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
