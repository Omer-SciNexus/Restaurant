import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { loadReservationForViewer, requireReservationFound } from "@/lib/booking/access";
import { confirmStripeReturn } from "@/lib/booking/confirm-payment";
import { cancelReservation } from "@/lib/booking/service";

export const POST = handle(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const reservation = requireReservationFound(await loadReservationForViewer(id));
  // A card payment still on its way must count, or a refund could be missed.
  await confirmStripeReturn(reservation.payment);
  return NextResponse.json(await cancelReservation(id));
});
