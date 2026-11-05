import { NextResponse } from "next/server";
import { ApiError, handle } from "@/lib/api";
import { requireStaffForOrder } from "@/lib/orders/guards";
import { loadStaffOrder } from "@/lib/orders/staff";

export const GET = handle(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await requireStaffForOrder(id);
  const order = await loadStaffOrder(id);
  if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "We could not find that order.");
  return NextResponse.json({ order });
});
