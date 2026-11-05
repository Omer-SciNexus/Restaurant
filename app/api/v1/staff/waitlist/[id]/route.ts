import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { leaveWaitlist } from "@/lib/booking/service";
import { offerToEntry, requireStaffForWaitlistEntry } from "@/lib/booking/staff";
import { staffWaitlistSchema } from "@/lib/validation/booking";

export const PATCH = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await requireStaffForWaitlistEntry(id);
  const { action } = staffWaitlistSchema.parse(await readJson(request));
  if (action === "OFFER") await offerToEntry(id);
  else await leaveWaitlist(id);
  return NextResponse.json({ ok: true });
});
