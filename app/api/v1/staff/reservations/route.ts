import { NextResponse } from "next/server";
import { STAFF_ROLES } from "@/lib/access";
import { ApiError, handle } from "@/lib/api";
import { requireApiRole, requireBranchAccess } from "@/lib/auth";
import { listDayReservations } from "@/lib/booking/staff";
import { prisma } from "@/lib/db";
import { now } from "@/lib/env";
import { localTime } from "@/lib/hours";
import { staffDaySchema } from "@/lib/validation/booking";

export const GET = handle(async (request: Request) => {
  const user = await requireApiRole(STAFF_ROLES);
  const { searchParams } = new URL(request.url);
  const query = staffDaySchema.parse({ date: searchParams.get("date") ?? undefined, branchId: searchParams.get("branchId") ?? undefined });
  const branchId = query.branchId ?? user.branchId;
  if (!branchId) throw new ApiError(422, "BRANCH_REQUIRED", "Choose a branch.");
  requireBranchAccess(user, branchId);
  const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { id: true, timezone: true } });
  if (!branch) throw new ApiError(404, "BRANCH_NOT_FOUND", "We could not find that branch.");
  const date = query.date ?? localTime(now(), branch.timezone).isoDate;
  return NextResponse.json({ date, reservations: await listDayReservations(branch, date) }, { headers: { "Cache-Control": "no-store" } });
});
