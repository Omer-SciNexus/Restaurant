import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { sendToCourier } from "@/lib/delivery/dispatch";
import { requireStaffForOrder } from "@/lib/orders/guards";

export const POST = handle(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { order } = await requireStaffForOrder(id);
  await sendToCourier(id, order.branchId);
  return NextResponse.json({ ok: true });
});
