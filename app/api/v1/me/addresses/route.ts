import { NextResponse } from "next/server";
import { createAddress, listAddresses } from "@/lib/addresses";
import { handle, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";

export const GET = handle(async () => {
  const user = await requireApiUser();
  return NextResponse.json({ addresses: await listAddresses(user.id) });
});

export const POST = handle(async (request: Request) => {
  const user = await requireApiUser();
  return NextResponse.json({ address: await createAddress(user.id, await readJson(request)) }, { status: 201 });
});
