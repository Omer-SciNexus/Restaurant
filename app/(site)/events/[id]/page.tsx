import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { EventQuote } from "@/components/events/EventQuote";
import { ApiError } from "@/lib/api";
import { confirmStripeReturn } from "@/lib/booking/confirm-payment";
import { services } from "@/lib/env";
import { loadEventForViewer, publicEventView } from "@/lib/events/service";

export const metadata: Metadata = { title: "Your event request", robots: { index: false } };

async function load(id: string) {
  try {
    return await loadEventForViewer(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) redirect(`/login?next=/events/${id}`);
    throw error;
  }
}

export default async function EventQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let request = await load(id);
  if (!request) notFound();

  // Returning from Stripe: confirm straight away instead of waiting for the webhook.
  if (await confirmStripeReturn(request.payment)) {
    request = await load(id);
    if (!request) notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-8 sm:px-6">
      <EventQuote initial={publicEventView(request)} testMode={!services.stripe && !services.paypal} />
    </div>
  );
}
