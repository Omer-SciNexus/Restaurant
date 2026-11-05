import { NextResponse } from "next/server";
import { ApiError, handle, readJson } from "@/lib/api";
import { acceptEventQuote, loadEventForViewer } from "@/lib/events/service";
import { startDepositSchema } from "@/lib/validation/booking";

export const POST = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!(await loadEventForViewer(id))) throw new ApiError(404, "EVENT_NOT_FOUND", "We could not find that request.");
  const { paymentMethod } = startDepositSchema.parse(await readJson(request));
  return NextResponse.json(await acceptEventQuote(id, paymentMethod), { status: 201 });
});
