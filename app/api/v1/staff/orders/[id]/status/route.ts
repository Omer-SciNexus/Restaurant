import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { requireStaffForOrder } from "@/lib/orders/guards";
import { transitionOrder } from "@/lib/orders/service";
import { staffStatusSchema } from "@/lib/validation/orders";

export const PATCH = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { user } = await requireStaffForOrder(id);
  const { status, reason } = staffStatusSchema.parse(await readJson(request));
  const order = await transitionOrder(id, status, { actor: "staff", actorId: user.id, rejectionReason: status === "REJECTED" ? reason : undefined });
  return NextResponse.json({ status: order.status });
});
