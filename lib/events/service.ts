import { canAccessBranch } from "../access";
import { ApiError } from "../api";
import { getCurrentUser, type CurrentUser } from "../auth";
import { bookingSettings, voidPayment } from "../booking/service";
import { formatDay } from "../booking/slots";
import { prisma } from "../db";
import { formatMoney } from "../domain";
import { now, siteUrl } from "../env";
import { localTime, zonedToUtc } from "../hours";
import { sendEmail } from "../notify";
import { refundPayment, startPayment, type CheckoutPayment, type PaymentMethod } from "../payments";
import { DEFAULT_TIMEZONE } from "../selection";
import type { EventRequestInput } from "../validation/booking";
import { earliestEventDate, EVENT_TYPE_LABEL, quoteProblem } from "./rules";

const eventInclude = {
  branch: { select: { id: true, name: true, timezone: true } },
  payment: true,
};

function link(id: string): string {
  return `${siteUrl()}/events/${id}`;
}

async function timezoneFor(branchId: string | null | undefined): Promise<string> {
  if (branchId) {
    const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { timezone: true } });
    if (!branch) throw new ApiError(404, "BRANCH_NOT_FOUND", "We could not find that branch.");
    return branch.timezone;
  }
  const first = await prisma.branch.findFirst({ orderBy: { name: "asc" }, select: { timezone: true } });
  return first?.timezone ?? DEFAULT_TIMEZONE;
}

/** The first date a guest can ask for, by type, for the form and for the check below. */
export async function eventDateLimits(branchId?: string | null) {
  const settings = await bookingSettings();
  const today = localTime(now(), await timezoneFor(branchId)).isoDate;
  return {
    cateringLeadDays: settings.cateringLeadDays,
    cateringMinCents: settings.cateringMinCents,
    earliest: { PRIVATE_EVENT: earliestEventDate("PRIVATE_EVENT", today, settings.cateringLeadDays), CATERING: earliestEventDate("CATERING", today, settings.cateringLeadDays) },
  };
}

export async function createEventRequest(input: EventRequestInput, user: CurrentUser | null) {
  if (input.type === "PRIVATE_EVENT" && !input.branchId) throw new ApiError(422, "BRANCH_REQUIRED", "Please choose a branch for your private event.");
  const timezone = await timezoneFor(input.branchId);
  const limits = await eventDateLimits(input.branchId);
  if (input.date < limits.earliest[input.type]) {
    throw new ApiError(
      422,
      "TOO_SOON",
      input.type === "CATERING"
        ? `Catering needs at least ${limits.cateringLeadDays} days' notice. The first date we can do is ${formatDay(limits.earliest.CATERING)}.`
        : "Please choose a date in the future.",
    );
  }
  const request = await prisma.eventRequest.create({
    data: {
      type: input.type,
      branchId: input.branchId ?? null,
      userId: user?.id ?? null,
      // Stored at midday in branch time, so the date reads the same wherever it is shown.
      eventDate: zonedToUtc(input.date, "12:00", timezone),
      guests: input.guests,
      budgetCents: input.budgetCents ?? null,
      menuNotes: input.menuNotes || null,
      allergies: input.allergies || null,
      contactName: input.name,
      contactEmail: input.email.toLowerCase(),
      contactPhone: input.phone,
    },
  });
  await sendEmail(
    request.contactEmail,
    "We have your event request",
    `Thanks, ${request.contactName}. We have your ${EVENT_TYPE_LABEL[request.type].toLowerCase()} request for ${request.guests} guests on ${formatDay(input.date, true)}. We will reply with a quote, and you can see it here: ${link(request.id)}`,
  );
  return { id: request.id, status: request.status };
}

/** Same rule as a guest booking: a guest request is reached by its unguessable id. */
export async function loadEventForViewer(id: string) {
  const request = await prisma.eventRequest.findUnique({ where: { id }, include: eventInclude });
  if (!request) return null;
  if (request.userId === null) return request;
  const user = await getCurrentUser();
  if (user && (user.id === request.userId || user.role === "ADMIN" || (request.branchId !== null && canAccessBranch(user, request.branchId)))) return request;
  throw new ApiError(403, "FORBIDDEN", "Please sign in to see this request.");
}

export function publicEventView(request: NonNullable<Awaited<ReturnType<typeof loadEventForViewer>>>) {
  const timezone = request.branch?.timezone ?? DEFAULT_TIMEZONE;
  return {
    id: request.id,
    type: request.type,
    status: request.status,
    date: formatDay(localTime(request.eventDate, timezone).isoDate, true),
    guests: request.guests,
    budgetCents: request.budgetCents,
    menuNotes: request.menuNotes,
    allergies: request.allergies,
    contactName: request.contactName,
    branchName: request.branch?.name ?? null,
    quoteCents: request.quoteCents,
    depositCents: request.depositCents,
    quoteNotes: request.quoteNotes,
    canAccept: request.status === "QUOTED" && request.eventDate > now(),
  };
}

export type PublicEvent = ReturnType<typeof publicEventView>;

/** Sends or replaces a quote. Once a deposit is paid the quote is final, so money always matches it. */
export async function sendEventQuote(id: string, input: { quoteCents: number; depositCents: number; quoteNotes?: string }) {
  const problem = quoteProblem(input.quoteCents, input.depositCents);
  if (problem) throw new ApiError(422, "BAD_QUOTE", problem);
  const request = await prisma.eventRequest.findUnique({ where: { id }, include: { payment: true } });
  if (!request) throw new ApiError(404, "EVENT_NOT_FOUND", "We could not find that request.");

  const updated = await prisma.eventRequest.updateMany({
    where: { id, status: { in: ["NEW", "QUOTED"] } },
    // An old payment link is dropped, so nobody can pay the previous deposit by accident.
    data: { status: "QUOTED", quoteCents: input.quoteCents, depositCents: input.depositCents, quoteNotes: input.quoteNotes || null, paymentId: null },
  });
  if (updated.count === 0) throw new ApiError(409, "CANNOT_QUOTE", "This request can no longer be quoted.");
  if (request.payment) await voidPayment(request.payment);

  await sendEmail(
    request.contactEmail,
    "Your Nature Food quote",
    `Your quote is ${formatMoney(input.quoteCents)}, with a deposit of ${formatMoney(input.depositCents)}.${input.quoteNotes ? `\n\n${input.quoteNotes}` : ""}\n\nSee it, accept it and pay the deposit here: ${link(id)}`,
  );
}

export async function closeEventRequest(id: string): Promise<void> {
  const request = await prisma.eventRequest.findUnique({ where: { id }, include: { payment: true } });
  if (!request) throw new ApiError(404, "EVENT_NOT_FOUND", "We could not find that request.");
  const updated = await prisma.eventRequest.updateMany({ where: { id, status: { in: ["NEW", "QUOTED"] } }, data: { status: "CLOSED", paymentId: null } });
  if (updated.count === 0) throw new ApiError(409, "CANNOT_CLOSE", "This request has already moved on. Please refresh.");
  if (request.payment) await voidPayment(request.payment);
}

/** The guest accepts: the deposit comes from the stored quote, never from the browser. */
export async function acceptEventQuote(id: string, method: PaymentMethod): Promise<{ id: string; depositCents: number; payment: CheckoutPayment }> {
  const request = await prisma.eventRequest.findUnique({ where: { id }, include: { payment: true } });
  if (!request) throw new ApiError(404, "EVENT_NOT_FOUND", "We could not find that request.");
  if (request.status !== "QUOTED" || !request.depositCents) throw new ApiError(409, "CANNOT_ACCEPT", "This quote can no longer be accepted.");
  if (request.eventDate <= now()) throw new ApiError(409, "CANNOT_ACCEPT", "The date of this event has passed, so the quote has ended.");

  const payment = await startPayment({ method, amountCents: request.depositCents, purpose: "EVENT_DEPOSIT", receiptEmail: request.contactEmail });
  const linked = await prisma.eventRequest.updateMany({ where: { id, status: "QUOTED", depositCents: request.depositCents }, data: { paymentId: payment.paymentId } });
  if (linked.count === 0) throw new ApiError(409, "CANNOT_ACCEPT", "This quote has just changed. Please refresh.");
  if (request.payment) await voidPayment(request.payment);
  return { id, depositCents: request.depositCents, payment };
}

export async function declineEventQuote(id: string): Promise<void> {
  const request = await prisma.eventRequest.findUnique({ where: { id }, include: { payment: true } });
  if (!request) throw new ApiError(404, "EVENT_NOT_FOUND", "We could not find that request.");
  const updated = await prisma.eventRequest.updateMany({ where: { id, status: "QUOTED" }, data: { status: "DECLINED", paymentId: null } });
  if (updated.count === 0) throw new ApiError(409, "CANNOT_DECLINE", "This quote can no longer be declined.");
  if (request.payment) await voidPayment(request.payment);
}

/**
 * Called by markPaymentSucceeded, once per payment. Money for a quote that was replaced,
 * declined or closed in the meantime goes straight back.
 */
export async function applyEventDeposit(paymentId: string): Promise<void> {
  const request = await prisma.eventRequest.findUnique({ where: { paymentId } });
  // An earlier attempt recorded the deposit before failing, so this retry has nothing to do.
  if (request?.status === "DEPOSIT_PAID") return;
  const paid = request ? await prisma.eventRequest.updateMany({ where: { id: request.id, status: "QUOTED" }, data: { status: "DEPOSIT_PAID" } }) : { count: 0 };
  if (paid.count === 0) {
    await refundPayment(paymentId);
    return;
  }
  await sendEmail(
    request!.contactEmail,
    "Your deposit is paid",
    `Thanks. We have your deposit of ${formatMoney(request!.depositCents ?? 0)} and your date is confirmed. See the details here: ${link(request!.id)}`,
  );
}
