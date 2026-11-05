import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { profileSchema } from "@/lib/validation/account";

const fields = { id: true, name: true, email: true, phone: true, role: true, diets: true, allergies: true } as const;

export const GET = handle(async () => {
  const user = await requireApiUser();
  return NextResponse.json({ user: await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: fields }) });
});

/** Name and phone only. The schema drops anything else, so a role can never be set this way. */
export const PATCH = handle(async (request: Request) => {
  const user = await requireApiUser();
  const input = profileSchema.parse(await readJson(request));
  return NextResponse.json({ user: await prisma.user.update({ where: { id: user.id }, data: input, select: fields }) });
});
