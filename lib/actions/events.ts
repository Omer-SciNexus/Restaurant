"use server";

import { revalidatePath } from "next/cache";
import { ADMIN_ROLES } from "../access";
import { ApiError } from "../api";
import { requireApiRole } from "../auth";
import { dollarsToCents } from "../events/rules";
import { closeEventRequest, sendEventQuote } from "../events/service";
import { eventQuoteSchema } from "../validation/booking";
import { actionError, type ActionState } from "./helpers";

function moneyField(form: FormData, name: string, label: string): number {
  const cents = dollarsToCents(String(form.get(name) ?? ""));
  if (cents === null) throw new ApiError(422, "BAD_AMOUNT", `Enter the ${label} in dollars, for example 1250 or 1250.50.`);
  return cents;
}

export async function sendQuoteAction(requestId: string, _state: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireApiRole(ADMIN_ROLES);
    const { quoteNotes } = eventQuoteSchema.parse({ quoteNotes: form.get("quoteNotes") ?? undefined });
    await sendEventQuote(requestId, { quoteCents: moneyField(form, "quote", "quote"), depositCents: moneyField(form, "deposit", "deposit"), quoteNotes });
    revalidatePath("/admin/events");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function closeRequestAction(requestId: string): Promise<ActionState> {
  try {
    await requireApiRole(ADMIN_ROLES);
    await closeEventRequest(requestId);
    revalidatePath("/admin/events");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
