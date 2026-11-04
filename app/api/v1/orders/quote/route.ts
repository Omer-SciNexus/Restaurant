import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { quoteOrder } from "@/lib/orders/service";
import { quoteSchema } from "@/lib/validation/orders";

export const POST = handle(async (request: Request) => {
  const input = quoteSchema.parse(await readJson(request));
  return NextResponse.json({ quote: await quoteOrder(input) });
});
