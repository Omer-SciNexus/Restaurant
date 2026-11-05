import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dietProfileSchema } from "@/lib/validation/account";

export const PUT = handle(async (request: Request) => {
  const user = await requireApiUser();
  const input = dietProfileSchema.parse(await readJson(request));
  const saved = await prisma.user.update({ where: { id: user.id }, data: input, select: { diets: true, allergies: true } });
  return NextResponse.json(saved);
});
