import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { listUserBookings } from "@/lib/booking/account";

export const GET = handle(async () => {
  const user = await requireApiUser();
  return NextResponse.json(await listUserBookings(user.id), { headers: { "Cache-Control": "no-store" } });
});
