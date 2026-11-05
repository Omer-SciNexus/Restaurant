import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { leaveWaitlist } from "@/lib/booking/service";

export const POST = handle(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await leaveWaitlist(id);
  return NextResponse.json({ status: "CANCELLED" });
});
