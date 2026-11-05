import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const GET = handle(async () => {
  const user = await requireApiUser();
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      reference: true,
      status: true,
      type: true,
      totalCents: true,
      createdAt: true,
      branch: { select: { name: true } },
      items: { select: { nameSnapshot: true, quantity: true } },
    },
  });
  return NextResponse.json({ orders });
});
