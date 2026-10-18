// The order state machine. Every status change in the app goes through canTransition,
// so an order can never skip a step or move backwards.

export const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "RECEIVED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type Actor = "system" | "guest" | "staff" | "driver" | "courier";

type Rule = { to: OrderStatus; by: readonly Actor[]; type?: "PICKUP" | "DELIVERY" };

const RULES: Record<OrderStatus, readonly Rule[]> = {
  PENDING_PAYMENT: [
    { to: "RECEIVED", by: ["system"] },
    { to: "CANCELLED", by: ["system", "guest"] },
  ],
  RECEIVED: [
    { to: "ACCEPTED", by: ["staff"] },
    { to: "REJECTED", by: ["staff"] },
    { to: "CANCELLED", by: ["guest"] },
  ],
  ACCEPTED: [{ to: "PREPARING", by: ["staff"] }],
  PREPARING: [{ to: "READY", by: ["staff"] }],
  READY: [
    { to: "COMPLETED", by: ["staff"], type: "PICKUP" },
    { to: "OUT_FOR_DELIVERY", by: ["driver", "courier"], type: "DELIVERY" },
  ],
  OUT_FOR_DELIVERY: [{ to: "COMPLETED", by: ["driver", "courier"] }],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus, actor: Actor, type: "PICKUP" | "DELIVERY"): boolean {
  return RULES[from].some((rule) => rule.to === to && rule.by.includes(actor) && (!rule.type || rule.type === type));
}

/** The action a staff member can take next, in board order. */
export function staffActions(status: OrderStatus, type: "PICKUP" | "DELIVERY"): OrderStatus[] {
  return RULES[status].filter((rule) => rule.by.includes("staff") && (!rule.type || rule.type === type)).map((rule) => rule.to);
}

export type TrackingStep = { key: string; label: string; done: boolean; current: boolean };

/** The guest's view: Received, Preparing, Ready or On the way, Done. */
export function trackingSteps(status: OrderStatus, type: "PICKUP" | "DELIVERY"): TrackingStep[] {
  const steps =
    type === "DELIVERY"
      ? [
          { key: "received", label: "Received", statuses: ["RECEIVED", "ACCEPTED"] },
          { key: "preparing", label: "Preparing", statuses: ["PREPARING", "READY"] },
          { key: "on-the-way", label: "On the way", statuses: ["OUT_FOR_DELIVERY"] },
          { key: "done", label: "Delivered", statuses: ["COMPLETED"] },
        ]
      : [
          { key: "received", label: "Received", statuses: ["RECEIVED", "ACCEPTED"] },
          { key: "preparing", label: "Preparing", statuses: ["PREPARING"] },
          { key: "ready", label: "Ready for pickup", statuses: ["READY"] },
          { key: "done", label: "Collected", statuses: ["COMPLETED"] },
        ];
  const currentIndex = steps.findIndex((step) => step.statuses.includes(status));
  return steps.map((step, index) => ({
    key: step.key,
    label: step.label,
    done: currentIndex >= 0 && index < currentIndex,
    current: index === currentIndex,
  }));
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Waiting for payment",
  RECEIVED: "Received",
  ACCEPTED: "Accepted",
  PREPARING: "Preparing",
  READY: "Ready",
  OUT_FOR_DELIVERY: "On the way",
  COMPLETED: "Done",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};
