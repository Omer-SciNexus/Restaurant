import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { loadOrderForViewer, publicOrderView, requireOrderFound } from "@/lib/orders/access";

export const GET = handle(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const order = requireOrderFound(await loadOrderForViewer(id));
  return NextResponse.json({ order: publicOrderView(order) });
});
