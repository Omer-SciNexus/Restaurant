import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ReservationManager } from "@/components/booking/ReservationManager";
import { ApiError } from "@/lib/api";
import { loadReservationForViewer, publicReservationView } from "@/lib/booking/access";
import { confirmStripeReturn } from "@/lib/booking/confirm-payment";
import { bookingSettings } from "@/lib/booking/service";
import { services } from "@/lib/env";

export const metadata: Metadata = { title: "Your booking", robots: { index: false } };

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  try {
    return await loadReservationForViewer(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) redirect(`/login?next=/book/${id}`);
    throw error;
  }
}

export default async function BookingPage({ params }: Props) {
  const { id } = await params;
  let reservation = await load(id);
  if (!reservation) notFound();

  // Returning from Stripe: confirm straight away instead of waiting for the webhook.
  if (await confirmStripeReturn(reservation.payment)) {
    reservation = await load(id);
    if (!reservation) notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-8 sm:px-6">
      <ReservationManager initial={publicReservationView(reservation, await bookingSettings())} testMode={!services.stripe && !services.paypal} />
    </div>
  );
}
