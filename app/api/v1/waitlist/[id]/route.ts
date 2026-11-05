import { NextResponse } from "next/server";
import { ApiError, handle } from "@/lib/api";
import { publicWaitlistEntry } from "@/lib/booking/access";
import { loadWaitlistEntry } from "@/lib/booking/service";

export const GET = handle(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const entry = await loadWaitlistEntry(id);
  if (!entry) throw new ApiError(404, "WAITLIST_NOT_FOUND", "We could not find that waitlist place.");
  return NextResponse.json({ entry: await publicWaitlistEntry(entry) }, { headers: { "Cache-Control": "no-store" } });
});
