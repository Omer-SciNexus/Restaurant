import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { loadOrderForViewer, requireOrderFound } from "@/lib/orders/access";
import { transitionOrder } from "@/lib/orders/service";

export const POST = handle(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  requireOrderFound(await loadOrderForViewer(id));
  const order = await transitionOrder(id, "CANCELLED", { actor: "guest" });
  return NextResponse.json({ status: order.status });
});
