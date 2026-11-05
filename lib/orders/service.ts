import { randomInt } from "node:crypto";
import type { CurrentUser } from "../auth";
import { ApiError } from "../api";
import { applyReservationDeposit } from "../booking/service";
import { prisma } from "../db";
import { type LatLng, isInDeliveryZone } from "../delivery/zones";
import { checkProfile, deriveFacts, hasConflict, type DietProfile, type DishFacts, type ProfileConflicts } from "../diet";
import { now } from "../env";
import { applyEventDeposit } from "../events/service";
import { geocode } from "../geocode";
import { type OpeningHours, isInSeason, isOpenAt, isServedAt, orderTimeSlots } from "../hours";
import { factsOf } from "../menu";
import { notifyOrderStatus } from "../notify";
import { roundNutrition, totalNutrition, type Nutrition } from "../nutrition";
import { refundPayment, startPayment, type CheckoutPayment } from "../payments";
import { PricingError, priceLine, priceOrder, type LinePrice, type OrderTotals } from "../pricing";
import { publishOrderUpdate } from "../realtime";
import type { CreateOrderInput, QuoteInput } from "../validation/orders";
import { canTransition, type Actor, type OrderStatus } from "./status";

const quoteInclude = {
  category: true,
  branches: true,
  ingredients: { include: { ingredient: true } },
  optionGroups: { orderBy: { sortOrder: "asc" as const }, include: { options: { where: { isActive: true }, include: { ingredient: true } } } },
};

type LineResult = LinePrice & {
  menuItemId: string;
  name: string;
  quantity: number;
  note?: string;
  nutrition: Nutrition;
  facts: DishFacts;
};

export type Quote = OrderTotals & {
  lines: {
    menuItemId: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    selected: LinePrice["selected"];
    /** Set only when a signed-in guest's saved profile conflicts with this line. */
    conflicts: ProfileConflicts | null;
  }[];
  deliverable: boolean;
};

function per100g(row: Nutrition): Nutrition {
  return { kcal: row.kcal, protein: row.protein, carbs: row.carbs, fat: row.fat, fibre: row.fibre, sugar: row.sugar, salt: row.salt };
}

async function priceLines(input: QuoteInput, branch: { id: string; timezone: string }, at: Date): Promise<LineResult[]> {
  const ids = [...new Set(input.lines.map((line) => line.menuItemId))];
  const items = await prisma.menuItem.findMany({ where: { id: { in: ids }, isActive: true }, include: quoteInclude });
  const byId = new Map(items.map((item) => [item.id, item]));

  return input.lines.map((line) => {
    const item = byId.get(line.menuItemId);
    if (!item) throw new PricingError("ITEM_UNAVAILABLE", "An item in your cart is no longer on the menu.");

    const branchRow = item.branches.find((row) => row.branchId === branch.id);
    const served = isServedAt(item.category.servedFrom, item.category.servedUntil, at, branch.timezone);
    const inSeason = isInSeason(item.availableFrom, item.availableTo, at);
    const price = priceLine(
      {
        id: item.id,
        name: item.name,
        priceCents: branchRow?.priceOverrideCents ?? item.basePriceCents,
        isAvailable: (branchRow?.isAvailable ?? true) && !branchRow?.isHidden && served && inSeason,
        groups: item.optionGroups,
      },
      line.optionIds,
    );

    const chosen = new Set(line.optionIds);
    const chosenOptions = item.optionGroups.flatMap((group) => group.options.filter((option) => chosen.has(option.id)));
    const nutritionLines = [
      ...item.ingredients.map((row) => ({ grams: row.grams, per100g: per100g(row.ingredient) })),
      ...chosenOptions.map((option) => ({ grams: option.grams, per100g: per100g(option.ingredient) })),
    ];
    return {
      ...price,
      menuItemId: item.id,
      name: item.name,
      quantity: line.quantity,
      note: line.note,
      nutrition: totalNutrition(nutritionLines),
      facts: deriveFacts([...item.ingredients, ...chosenOptions].map((row) => factsOf(row.ingredient))),
    };
  });
}

async function loadBranch(branchId: string) {
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) throw new ApiError(404, "BRANCH_NOT_FOUND", "We could not find that branch.");
  return branch;
}

/** Works out the delivery location: the address is always checked against the branch's zone. */
async function resolveDeliveryPoint(input: QuoteInput, branch: { lat: number; lng: number }): Promise<LatLng | null> {
  if (input.type !== "DELIVERY" || !input.address) return null;
  const { street, city, lat, lng } = input.address;
  const geocoded = await geocode(street, city);
  if (geocoded) return geocoded;
  // Local development with no maps key: use the shared location, or stand in the branch's own.
  return lat !== undefined && lng !== undefined ? { lat, lng } : { lat: branch.lat, lng: branch.lng };
}

export async function quoteOrder(input: QuoteInput, profile?: DietProfile): Promise<Quote> {
  const branch = await loadBranch(input.branchId);
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const at = input.scheduledFor ? new Date(input.scheduledFor) : now();

  const lines = await priceLines(input, branch, at);
  const totals = priceOrder(lines.map((l) => ({ unitPriceCents: l.unitPriceCents, quantity: l.quantity })), input.type, {
    deliveryFeeCents: branch.deliveryFeeCents,
    minOrderCents: branch.minOrderCents,
    taxRateBps: branch.taxRateBps,
    freeDeliveryAboveCents: settings?.freeDeliveryAboveCents ?? null,
  });

  const point = await resolveDeliveryPoint(input, branch);
  return {
    ...totals,
    deliverable: point ? isInDeliveryZone({ ...branch, deliveryPolygon: branch.deliveryPolygon as [number, number][] | null }, point) : true,
    lines: lines.map((line) => {
      const conflicts = profile ? checkProfile(line.facts, profile) : null;
      return {
        menuItemId: line.menuItemId,
        name: line.name,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        lineTotalCents: line.unitPriceCents * line.quantity,
        selected: line.selected,
        conflicts: conflicts && hasConflict(conflicts) ? conflicts : null,
      };
    }),
  };
}

function assertCanOrderNow(
  branch: { onlineOrderingOpen: boolean; openingHours: unknown; timezone: string },
  scheduledFor: string | null | undefined,
): void {
  if (!branch.onlineOrderingOpen) {
    throw new ApiError(409, "ORDERING_PAUSED", "This branch is taking orders in store only right now.");
  }
  const hours = branch.openingHours as OpeningHours;
  const at = now();
  if (scheduledFor) {
    const offered = orderTimeSlots(hours, at, branch.timezone).some((slot) => slot.iso === new Date(scheduledFor).toISOString());
    if (!offered) throw new ApiError(422, "BAD_TIME", "That time is no longer available. Please pick another.");
  } else if (!isOpenAt(hours, at, branch.timezone)) {
    throw new ApiError(409, "BRANCH_CLOSED", "This branch is closed right now. Please choose a later time or another branch.");
  }
}

const REFERENCE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function newReference(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  return `NF-${code}`;
}

export async function createOrder(
  input: CreateOrderInput,
  user: CurrentUser | null,
): Promise<{ orderId: string; reference: string; totalCents: number; payment: CheckoutPayment }> {
  const branch = await loadBranch(input.branchId);
  assertCanOrderNow(branch, input.scheduledFor);

  if (input.type === "DELIVERY" && !input.address) {
    throw new ApiError(422, "ADDRESS_REQUIRED", "Please enter your delivery address.");
  }
  const at = input.scheduledFor ? new Date(input.scheduledFor) : now();
  const lines = await priceLines(input, branch, at);
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const totals = priceOrder(lines.map((l) => ({ unitPriceCents: l.unitPriceCents, quantity: l.quantity })), input.type, {
    deliveryFeeCents: branch.deliveryFeeCents,
    minOrderCents: branch.minOrderCents,
    taxRateBps: branch.taxRateBps,
    freeDeliveryAboveCents: settings?.freeDeliveryAboveCents ?? null,
  });

  const point = await resolveDeliveryPoint(input, branch);
  if (point && !isInDeliveryZone({ ...branch, deliveryPolygon: branch.deliveryPolygon as [number, number][] | null }, point)) {
    throw new ApiError(422, "OUT_OF_ZONE", `That address is outside ${branch.name}'s delivery zone. Try pickup or another branch.`);
  }

  const order = await prisma.order.create({
    data: {
      reference: newReference(),
      branchId: branch.id,
      userId: user?.id ?? null,
      type: input.type,
      customerName: input.customerName,
      customerEmail: input.customerEmail.toLowerCase(),
      customerPhone: input.customerPhone,
      deliveryStreet: input.address?.street,
      deliveryCity: input.address?.city,
      deliveryNotes: input.address?.notes,
      deliveryLat: point?.lat,
      deliveryLng: point?.lng,
      allergyNote: input.allergyNote,
      scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
      ...totals,
      items: {
        create: lines.map((line) => ({
          menuItemId: line.menuItemId,
          nameSnapshot: line.name,
          quantity: line.quantity,
          unitPriceCents: line.unitPriceCents,
          selectedOptions: line.selected,
          nutritionSnapshot: roundNutrition(line.nutrition),
          note: line.note,
        })),
      },
      events: { create: { status: "PENDING_PAYMENT", actorId: user?.id } },
      delivery: input.type === "DELIVERY" ? { create: {} } : undefined,
    },
  });

  const payment = await startPayment({
    method: input.paymentMethod,
    amountCents: totals.totalCents,
    purpose: "ORDER",
    orderId: order.id,
    receiptEmail: input.customerEmail,
  });

  return { orderId: order.id, reference: order.reference, totalCents: order.totalCents, payment };
}

type TransitionContext = { actor: Actor; actorId?: string | null; rejectionReason?: string };

/**
 * The single path for every status change. The update is conditional on the status we read,
 * so two people pressing a button at once, or a webhook retry, cannot apply it twice.
 */
export async function transitionOrder(orderId: string, to: OrderStatus, context: TransitionContext) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { delivery: true } });
  if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "We could not find that order.");
  if (!canTransition(order.status, to, context.actor, order.type)) {
    throw new ApiError(409, "BAD_TRANSITION", "This order has already moved on. Please refresh.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { status: to, rejectionReason: context.rejectionReason },
    });
    if (result.count === 0) throw new ApiError(409, "BAD_TRANSITION", "This order has already moved on. Please refresh.");
    await tx.orderEvent.create({ data: { orderId, status: to, actorId: context.actorId } });
    return tx.order.findUniqueOrThrow({ where: { id: orderId } });
  });

  if (to === "REJECTED" || to === "CANCELLED") await refundOrderPayments(orderId);

  await Promise.all([publishOrderUpdate(updated, order.delivery?.driverId), notifyOrderStatus(updated, to)]);
  return updated;
}

async function refundOrderPayments(orderId: string): Promise<void> {
  const payments = await prisma.payment.findMany({ where: { orderId, status: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED"] } } });
  for (const payment of payments) await refundPayment(payment.id);
}

/**
 * Called once a provider confirms payment. Safe to call twice: the second call does nothing.
 * A FAILED payment can still succeed, because a guest can retry after a declined card.
 * Each purpose has one job here: move its order, table or event on, exactly once.
 *
 * If that job fails, the claim is released and the error rethrown, so the provider's retry can
 * finish it. Otherwise the retry would find the payment already claimed and leave the guest's
 * money unapplied.
 */
export async function markPaymentSucceeded(paymentId: string, captureRef?: string | null): Promise<void> {
  const claimed = await prisma.payment.updateMany({
    where: { id: paymentId, status: { in: ["PENDING", "FAILED"] } },
    data: { status: "SUCCEEDED", captureRef: captureRef ?? undefined },
  });
  if (claimed.count === 0) return;

  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  try {
    if (payment.purpose === "ORDER" && payment.orderId) await applyOrderPayment(payment.orderId, payment.id);
    if (payment.purpose === "RESERVATION_DEPOSIT") await applyReservationDeposit(payment.id);
    if (payment.purpose === "EVENT_DEPOSIT") await applyEventDeposit(payment.id);
  } catch (error) {
    // A refund already made leaves the status changed, so this only releases untouched money.
    await prisma.payment.updateMany({ where: { id: paymentId, status: "SUCCEEDED", refundedAmountCents: 0 }, data: { status: "PENDING" } });
    throw error;
  }
}

/** Money for an order that was cancelled while the guest was paying goes straight back. */
async function applyOrderPayment(orderId: string, paymentId: string): Promise<void> {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { status: true } });
  if (order.status === "PENDING_PAYMENT") await transitionOrder(orderId, "RECEIVED", { actor: "system" });
  else if (order.status === "CANCELLED" || order.status === "REJECTED") await refundPayment(paymentId);
  // Any other status means an earlier attempt moved the order on before it failed.
}

export async function markPaymentFailed(paymentId: string): Promise<void> {
  await prisma.payment.updateMany({ where: { id: paymentId, status: "PENDING" }, data: { status: "FAILED" } });
}

export const orderViewInclude = {
  branch: { select: { id: true, name: true, slug: true, address: true, city: true, phone: true, lat: true, lng: true, timezone: true } },
  items: true,
  payments: { orderBy: { createdAt: "desc" as const } },
  delivery: { include: { driver: { select: { id: true, name: true, phone: true } } } },
  events: { orderBy: { createdAt: "asc" as const } },
};

