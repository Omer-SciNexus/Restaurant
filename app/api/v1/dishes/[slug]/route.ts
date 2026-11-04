import { NextResponse } from "next/server";
import { ApiError, handle } from "@/lib/api";
import { getBranchById, getDish } from "@/lib/menu";
import { DEFAULT_TIMEZONE } from "@/lib/selection";

export const GET = handle(async (request: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const branchId = new URL(request.url).searchParams.get("branchId");
  const branch = branchId ? await getBranchById(branchId) : null;
  const dish = await getDish(slug, branch?.id ?? null, branch?.timezone ?? DEFAULT_TIMEZONE);
  if (!dish) throw new ApiError(404, "DISH_NOT_FOUND", "We could not find that dish.");
  return NextResponse.json({ dish });
});
