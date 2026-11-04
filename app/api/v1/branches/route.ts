import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { getBranches } from "@/lib/menu";

export const GET = handle(async () => {
  const branches = await getBranches();
  return NextResponse.json({
    branches: branches.map((b) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
      address: b.address,
      city: b.city,
      lat: b.lat,
      lng: b.lng,
      phone: b.phone,
      openingHours: b.openingHours,
      deliveryRadiusKm: b.deliveryRadiusKm,
      onlineOrderingOpen: b.onlineOrderingOpen,
    })),
  });
});
