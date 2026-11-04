import { NextResponse } from "next/server";
import { STAFF_ROLES } from "@/lib/access";
import { ApiError, handle } from "@/lib/api";
import { requireApiRole, requireBranchAccess } from "@/lib/auth";
import { listBoardOrders, listBranchDrivers } from "@/lib/orders/staff";

export const GET = handle(async (request: Request) => {
  const user = await requireApiRole(STAFF_ROLES);
  const branchId = new URL(request.url).searchParams.get("branchId") ?? user.branchId;
  if (!branchId) throw new ApiError(422, "BRANCH_REQUIRED", "Choose a branch.");
  requireBranchAccess(user, branchId);
  const [orders, drivers] = await Promise.all([listBoardOrders(branchId), listBranchDrivers(branchId)]);
  return NextResponse.json({ orders, drivers });
});
