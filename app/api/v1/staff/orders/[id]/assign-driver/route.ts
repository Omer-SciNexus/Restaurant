import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { assignDriver } from "@/lib/delivery/dispatch";
import { requireStaffForOrder } from "@/lib/orders/guards";
import { assignDriverSchema } from "@/lib/validation/orders";

export const POST = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { order } = await requireStaffForOrder(id);
  const { driverId } = assignDriverSchema.parse(await readJson(request));
  await assignDriver(id, driverId, order.branchId);
  return NextResponse.json({ ok: true });
});
