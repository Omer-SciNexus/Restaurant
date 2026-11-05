import { NextResponse } from "next/server";
import { STAFF_ROLES } from "@/lib/access";
import { ApiError, handle } from "@/lib/api";
import { requireApiRole, requireBranchAccess } from "@/lib/auth";
import { listBranchWaitlist } from "@/lib/booking/staff";
import { prisma } from "@/lib/db";

export const GET = handle(async (request: Request) => {
  const user = await requireApiRole(STAFF_ROLES);
  const branchId = new URL(request.url).searchParams.get("branchId") ?? user.branchId;
  if (!branchId) throw new ApiError(422, "BRANCH_REQUIRED", "Choose a branch.");
  requireBranchAccess(user, branchId);
  const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { id: true, timezone: true } });
  if (!branch) throw new ApiError(404, "BRANCH_NOT_FOUND", "We could not find that branch.");
  return NextResponse.json({ entries: await listBranchWaitlist(branch) }, { headers: { "Cache-Control": "no-store" } });
});
