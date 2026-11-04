import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handle } from "@/lib/api";
import { nearestBranch } from "@/lib/delivery/zones";
import { getBranches } from "@/lib/menu";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const GET = handle(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const point = querySchema.parse({ lat: searchParams.get("lat"), lng: searchParams.get("lng") });
  const branches = await getBranches();
  const result = nearestBranch(
    branches.map((b) => ({ ...b, deliveryPolygon: b.deliveryPolygon as [number, number][] | null })),
    point,
  );
  if (!result) throw new ApiError(404, "NO_BRANCHES", "No branches found.");
  const { branch, distanceKm, deliverable } = result;
  return NextResponse.json({
    branch: { id: branch.id, slug: branch.slug, name: branch.name, address: branch.address },
    distanceKm,
    deliverable,
  });
});
