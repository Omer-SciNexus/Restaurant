import { NextResponse } from "next/server";
import { DRIVER_ROLES } from "@/lib/access";
import { handle } from "@/lib/api";
import { requireApiRole } from "@/lib/auth";
import { listDriverDeliveries } from "@/lib/delivery/dispatch";

export const GET = handle(async () => {
  const user = await requireApiRole(DRIVER_ROLES);
  return NextResponse.json({ deliveries: await listDriverDeliveries(user.id) });
});
