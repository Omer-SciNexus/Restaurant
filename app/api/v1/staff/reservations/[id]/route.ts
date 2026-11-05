import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { moveReservation, requireStaffForReservation } from "@/lib/booking/staff";
import { staffReservationSchema } from "@/lib/validation/booking";

export const PATCH = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await requireStaffForReservation(id);
  const { status } = staffReservationSchema.parse(await readJson(request));
  return NextResponse.json({ status: await moveReservation(id, status) });
});
