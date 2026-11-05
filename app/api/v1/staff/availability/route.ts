import { NextResponse } from "next/server";
import { z } from "zod";
import { hasRole, MANAGER_ROLES, STAFF_ROLES } from "@/lib/access";
import { ApiError, handle, readJson } from "@/lib/api";
import { requireApiRole, requireBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { availabilitySchema } from "@/lib/validation/orders";

const schema = availabilitySchema.extend({ branchId: z.string().min(1).optional() });

export const PATCH = handle(async (request: Request) => {
  const user = await requireApiRole(STAFF_ROLES);
  const { menuItemId, isAvailable, isHidden, branchId: requested } = schema.parse(await readJson(request));
  const branchId = requested ?? user.branchId;
  if (!branchId) throw new ApiError(422, "BRANCH_REQUIRED", "Choose a branch.");
  requireBranchAccess(user, branchId);
  // Sold out is a shift-by-shift call. Taking a dish off a branch's menu is the manager's.
  if (isHidden !== undefined && !hasRole(user, MANAGER_ROLES)) {
    throw new ApiError(403, "FORBIDDEN", "Only a manager can change this branch's menu.");
  }
  await prisma.branchMenuItem.upsert({
    where: { branchId_menuItemId: { branchId, menuItemId } },
    update: { isAvailable, isHidden },
    create: { branchId, menuItemId, isAvailable, isHidden },
  });
  return NextResponse.json({ ok: true });
});
