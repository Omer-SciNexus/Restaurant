import { NextResponse } from "next/server";
import { addressIdSchema, deleteAddress, getAddress, updateAddress } from "@/lib/addresses";
import { handle, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };

export const GET = handle(async (_request: Request, { params }: Context) => {
  const user = await requireApiUser();
  const id = addressIdSchema.parse((await params).id);
  return NextResponse.json({ address: await getAddress(user.id, id) });
});

export const PATCH = handle(async (request: Request, { params }: Context) => {
  const user = await requireApiUser();
  const id = addressIdSchema.parse((await params).id);
  return NextResponse.json({ address: await updateAddress(user.id, id, await readJson(request)) });
});

export const DELETE = handle(async (_request: Request, { params }: Context) => {
  const user = await requireApiUser();
  const id = addressIdSchema.parse((await params).id);
  await deleteAddress(user.id, id);
  return NextResponse.json({ removed: true });
});
