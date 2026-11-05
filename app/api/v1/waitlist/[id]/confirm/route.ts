import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { confirmWaitlistOffer } from "@/lib/booking/service";
import { confirmOfferSchema } from "@/lib/validation/booking";

export const POST = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { paymentMethod } = confirmOfferSchema.parse(await readJson(request));
  const user = await getCurrentUser();
  return NextResponse.json(await confirmWaitlistOffer(id, paymentMethod, user), { status: 201 });
});
