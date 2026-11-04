import { NextResponse } from "next/server";
import { ApiError, handle } from "@/lib/api";
import { getBranchById, getMenu } from "@/lib/menu";

export const GET = handle(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const branch = await getBranchById(id);
  if (!branch) throw new ApiError(404, "BRANCH_NOT_FOUND", "We could not find that branch.");
  return NextResponse.json({ branch: { id: branch.id, name: branch.name }, categories: await getMenu(branch.id, branch.timezone) });
});
