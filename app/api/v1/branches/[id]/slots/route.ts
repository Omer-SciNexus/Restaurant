import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { listDaySlots } from "@/lib/booking/service";
import { slotsQuerySchema } from "@/lib/validation/booking";

export const GET = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const { date, party, reservationId } = slotsQuerySchema.parse({
    date: searchParams.get("date") ?? undefined,
    party: searchParams.get("party") ?? undefined,
    reservationId: searchParams.get("reservationId") ?? undefined,
  });
  return NextResponse.json(await listDaySlots(id, date, party, reservationId), { headers: { "Cache-Control": "no-store" } });
});
