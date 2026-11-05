import type { Metadata } from "next";
import Image from "next/image";
import { BookingForm } from "@/components/booking/BookingForm";
import { getCurrentUser } from "@/lib/auth";
import { bookingWindow } from "@/lib/booking/slots";
import { now, services } from "@/lib/env";
import { getBranches, getBranchBySlug } from "@/lib/menu";
import { getSelectedBranch } from "@/lib/selection";

export const metadata: Metadata = {
  title: "Book a table",
  description: "Book a table at your nearest Nature Food branch. Choose a date, a time and your party size.",
};

export default async function BookPage({ searchParams }: { searchParams: Promise<{ branch?: string }> }) {
  const { branch: slug } = await searchParams;
  const [branches, user, selected, linked] = await Promise.all([getBranches(), getCurrentUser(), getSelectedBranch(), slug ? getBranchBySlug(slug) : null]);
  const initial = linked ?? selected ?? branches[0]!;
  const { today, lastDate } = bookingWindow(now(), initial.timezone);

  return (
    <div className="pb-10">
      <div className="relative h-48 w-full overflow-hidden sm:h-64">
        <Image src="/images/booking/booking-hero.png" alt="" fill priority sizes="100vw" quality={80} className="object-cover" />
      </div>
      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
        <h1 className="text-4xl">Book a table</h1>
        <p className="mt-2 max-w-2xl text-stone">Choose a branch, a date and your party size to see the free times. No account needed.</p>
        <BookingForm
          branches={branches.map((branch) => ({ id: branch.id, slug: branch.slug, name: branch.name, address: branch.address, capacity: branch.tableCapacityPerSlot }))}
          initialBranchId={initial.id}
          initialParty={Math.min(2, initial.tableCapacityPerSlot)}
          today={today}
          lastDate={lastDate}
          user={user ? { name: user.name ?? "", email: user.email ?? "", phone: user.phone ?? "" } : null}
          testMode={!services.stripe && !services.paypal}
        />
      </div>
    </div>
  );
}
