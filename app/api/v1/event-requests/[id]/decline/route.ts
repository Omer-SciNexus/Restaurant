import { NextResponse } from "next/server";
import { ApiError, handle } from "@/lib/api";
import { declineEventQuote, loadEventForViewer } from "@/lib/events/service";

export const POST = handle(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!(await loadEventForViewer(id))) throw new ApiError(404, "EVENT_NOT_FOUND", "We could not find that request.");
  await declineEventQuote(id);
  return NextResponse.json({ status: "DECLINED" });
});
