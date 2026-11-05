import type { Metadata } from "next";
import Image from "next/image";
import { EventRequestForm } from "@/components/events/EventRequestForm";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/domain";
import { eventDateLimits } from "@/lib/events/service";
import { getBranches } from "@/lib/menu";
import { getSelectedBranch } from "@/lib/selection";

export const metadata: Metadata = {
  title: "Private events and catering",
  description: "Ask Nature Food about a private event at one of our branches, or catering brought to you. We reply with a quote.",
};

const PICTURES = [
  { src: "/images/booking/events-private-dining.png", caption: "Private events at a branch" },
  { src: "/images/booking/events-catering-spread.png", caption: "Catering for your table" },
  { src: "/images/booking/events-catering-delivery.png", caption: "Brought to your door" },
];

export default async function EventsPage() {
  const [branches, user, selected, limits] = await Promise.all([getBranches(), getCurrentUser(), getSelectedBranch(), eventDateLimits()]);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 pt-8 sm:px-6">
      <h1 className="text-4xl">Private events and catering</h1>
      <p className="mt-2 max-w-2xl text-stone">Tell us about your day and what you would like to eat. We reply with a quote and a menu. If it suits you, accept online and pay a deposit to hold the date.</p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-3">
        {PICTURES.map((picture) => (
          <li key={picture.src} className="overflow-hidden rounded-brand bg-paper shadow-soft">
            <div className="relative aspect-[3/2]">
              <Image src={picture.src} alt="" fill sizes="(min-width: 640px) 33vw, 100vw" quality={70} className="object-cover" />
            </div>
            <p className="p-3 text-sm font-medium">{picture.caption}</p>
          </li>
        ))}
      </ul>

      <div className="mt-8 max-w-2xl">
        <EventRequestForm
          branches={branches.map((branch) => ({ id: branch.id, name: branch.name }))}
          initialBranchId={selected?.id ?? branches[0]!.id}
          earliest={limits.earliest}
          cateringLeadDays={limits.cateringLeadDays}
          cateringMinLabel={limits.cateringMinCents ? formatMoney(limits.cateringMinCents) : null}
          user={user ? { name: user.name ?? "", email: user.email ?? "", phone: user.phone ?? "" } : null}
        />
      </div>
    </div>
  );
}
