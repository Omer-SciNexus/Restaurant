import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handle, readJson } from "@/lib/api";
import { getBranchBySlug } from "@/lib/menu";
import { BRANCH_COOKIE } from "@/lib/selection";

const schema = z.object({ slug: z.string().min(1).max(100) });

/** Remembers the guest's branch in a cookie, so server pages can show that branch's menu. */
export const POST = handle(async (request: Request) => {
  const { slug } = schema.parse(await readJson(request));
  const branch = await getBranchBySlug(slug);
  if (!branch) throw new ApiError(404, "BRANCH_NOT_FOUND", "We could not find that branch.");
  const response = NextResponse.json({ branch: { id: branch.id, slug: branch.slug, name: branch.name } });
  response.cookies.set(BRANCH_COOKIE, branch.slug, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
});
