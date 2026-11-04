import Pusher from "pusher";
import { services } from "./env";

// Channels from the plan: one per order for the guest, one per branch for staff, one per driver.
export const channels = {
  order: (id: string) => `order-${id}`,
  branchOrders: (branchId: string) => `branch-${branchId}-orders`,
  driver: (driverId: string) => `driver-${driverId}`,
};

export const ORDER_UPDATED_EVENT = "order-updated";

let client: Pusher | null = null;

function pusher(): Pusher | null {
  if (!services.pusher) return null;
  client ??= new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "us2",
    useTLS: true,
  });
  return client;
}

/**
 * Tells open screens to refresh. Carries no order details, so a public channel leaks nothing.
 * A failed push never fails the order: screens also poll as a fallback.
 */
export async function publishOrderUpdate(order: { id: string; branchId: string }, driverId?: string | null): Promise<void> {
  const target = pusher();
  if (!target) return;
  const names = [channels.order(order.id), channels.branchOrders(order.branchId)];
  if (driverId) names.push(channels.driver(driverId));
  try {
    await target.trigger(names, ORDER_UPDATED_EVENT, { orderId: order.id });
  } catch (error) {
    console.error("Real-time push failed", error);
  }
}
