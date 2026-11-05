import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { Allergen, Diet } from "@/lib/domain";
import { quoteOrder } from "@/lib/orders/service";
import { quoteSchema } from "@/lib/validation/orders";

export const POST = handle(async (request: Request) => {
  const input = quoteSchema.parse(await readJson(request));
  const user = await getCurrentUser();
  const profile = user ? { diets: user.diets as Diet[], allergies: user.allergies as Allergen[] } : undefined;
  return NextResponse.json({ quote: await quoteOrder(input, profile) });
});
