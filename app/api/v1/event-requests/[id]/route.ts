import { NextResponse } from "next/server";
import { ApiError, handle } from "@/lib/api";
import { confirmStripeReturn } from "@/lib/booking/confirm-payment";
import { loadEventForViewer, publicEventView } from "@/lib/events/service";

export const GET = handle(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  let request = await loadEventForViewer(id);
  if (!request) throw new ApiError(404, "EVENT_NOT_FOUND", "We could not find that request.");
  if (await confirmStripeReturn(request.payment)) request = await loadEventForViewer(id);
  return NextResponse.json({ request: publicEventView(request!) }, { headers: { "Cache-Control": "no-store" } });
});
