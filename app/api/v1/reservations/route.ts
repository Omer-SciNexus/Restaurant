import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { createReservation } from "@/lib/booking/service";
import { createReservationSchema } from "@/lib/validation/booking";

export const POST = handle(async (request: Request) => {
  const input = createReservationSchema.parse(await readJson(request));
  const user = await getCurrentUser();
  return NextResponse.json(await createReservation(input, user), { status: 201 });
});
