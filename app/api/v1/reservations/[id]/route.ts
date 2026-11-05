import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { loadReservationForViewer, publicReservationView, requireReservationFound } from "@/lib/booking/access";
import { confirmStripeReturn } from "@/lib/booking/confirm-payment";
import { bookingSettings, changeReservation } from "@/lib/booking/service";
import { changeReservationSchema } from "@/lib/validation/booking";

type Context = { params: Promise<{ id: string }> };

export const GET = handle(async (_request: Request, { params }: Context) => {
  const { id } = await params;
  let reservation = requireReservationFound(await loadReservationForViewer(id));
  if (await confirmStripeReturn(reservation.payment)) reservation = requireReservationFound(await loadReservationForViewer(id));
  return NextResponse.json({ reservation: publicReservationView(reservation, await bookingSettings()) }, { headers: { "Cache-Control": "no-store" } });
});

export const PATCH = handle(async (request: Request, { params }: Context) => {
  const { id } = await params;
  const before = requireReservationFound(await loadReservationForViewer(id));
  await confirmStripeReturn(before.payment);
  const input = changeReservationSchema.parse(await readJson(request));
  await changeReservation(id, input);
  const reservation = requireReservationFound(await loadReservationForViewer(id));
  return NextResponse.json({ reservation: publicReservationView(reservation, await bookingSettings()) });
});
