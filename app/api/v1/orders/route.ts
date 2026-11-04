import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { createOrder } from "@/lib/orders/service";
import { createOrderSchema } from "@/lib/validation/orders";

export const POST = handle(async (request: Request) => {
  const input = createOrderSchema.parse(await readJson(request));
  const user = await getCurrentUser();
  return NextResponse.json(await createOrder(input, user), { status: 201 });
});
