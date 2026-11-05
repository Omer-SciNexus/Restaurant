import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WaitlistPlace } from "@/components/booking/WaitlistPlace";
import { publicWaitlistEntry } from "@/lib/booking/access";
import { loadWaitlistEntry } from "@/lib/booking/service";
import { services } from "@/lib/env";

export const metadata: Metadata = { title: "Your waitlist place", robots: { index: false } };

export default async function WaitlistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = await loadWaitlistEntry(id);
  if (!entry) notFound();
  return (
    <div className="mx-auto max-w-2xl px-4 pb-10 pt-8 sm:px-6">
      <WaitlistPlace initial={await publicWaitlistEntry(entry)} testMode={!services.stripe && !services.paypal} />
    </div>
  );
}
