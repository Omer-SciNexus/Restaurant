"use server";

import { revalidatePath } from "next/cache";
import { ADMIN_ROLES } from "../access";
import { refundOrderPayment } from "../admin/refund-service";
import { requireApiRole } from "../auth";
import { formatMoney } from "../domain";
import { actionError, type ActionState } from "./helpers";

export type RefundState = ActionState & { message?: string };

export async function refundOrderAction(orderId: string, paymentId: string, _state: RefundState, form: FormData): Promise<RefundState> {
  try {
    const user = await requireApiRole(ADMIN_ROLES);
    const result = await refundOrderPayment(orderId, paymentId, String(form.get("amount") ?? ""), user.id);
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath(`/order/${orderId}`);
    return { ok: true, message: `Refunded ${formatMoney(result.amountCents)}. We have emailed ${result.email}.` };
  } catch (error) {
    return actionError(error);
  }
}
