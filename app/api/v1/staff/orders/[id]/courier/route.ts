import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, readJson } from "@/lib/api";
import { advanceSimulatedCourier, sendToCourier } from "@/lib/delivery/dispatch";
import { requireStaffForOrder } from "@/lib/orders/guards";

export const POST = handle(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { order } = await requireStaffForOrder(id);
  await sendToCourier(id, order.branchId);
  return NextResponse.json({ ok: true });
});

const stepSchema = z.object({ status: z.enum(["PICKED_UP", "DELIVERED"]) });

/** Test mode only: staff press what the courier would report. Refused in production. */
export const PATCH = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { order } = await requireStaffForOrder(id);
  const { status } = stepSchema.parse(await readJson(request));
  await advanceSimulatedCourier(id, order.branchId, status);
  return NextResponse.json({ ok: true });
});
