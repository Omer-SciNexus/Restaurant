import { NextResponse } from "next/server";
import { DRIVER_ROLES } from "@/lib/access";
import { handle, readJson } from "@/lib/api";
import { requireApiRole } from "@/lib/auth";
import { updateDriverDelivery } from "@/lib/delivery/dispatch";
import { driverUpdateSchema } from "@/lib/validation/orders";

/** The id is the order id. Only the assigned driver can change a delivery. */
export const PATCH = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await requireApiRole(DRIVER_ROLES);
  const { status } = driverUpdateSchema.parse(await readJson(request));
  await updateDriverDelivery(id, user.id, status);
  return NextResponse.json({ ok: true });
});
