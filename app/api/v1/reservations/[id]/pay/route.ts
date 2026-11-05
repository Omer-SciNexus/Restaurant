import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { loadReservationForViewer, requireReservationFound } from "@/lib/booking/access";
import { confirmStripeReturn } from "@/lib/booking/confirm-payment";
import { startReservationPayment } from "@/lib/booking/service";
import { startDepositSchema } from "@/lib/validation/booking";

export const POST = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const reservation = requireReservationFound(await loadReservationForViewer(id));
  await confirmStripeReturn(reservation.payment);
  const { paymentMethod } = startDepositSchema.parse(await readJson(request));
  return NextResponse.json(await startReservationPayment(id, paymentMethod), { status: 201 });
});
