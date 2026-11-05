import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, Section, ToConfirm } from "@/components/site/ContentPage";
import { getBranches } from "@/lib/menu";

export const metadata: Metadata = { title: "Contact", description: "Addresses and phone numbers for every Nature Food branch." };

export default async function ContactPage() {
  // Every address and number comes from the branch's own record. None is written in here.
  const branches = await getBranches();
  return (
    <div className="pb-10">
      <PageIntro title="Contact us" lead={<p>The quickest way to reach us is your branch. For an order, use the branch named on your order page.</p>} />
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Section title="Have an allergy?">
          <p>
            Please tell staff before you order. You can read how we handle allergens in our <Link href="/legal/allergens" className="text-forest underline">allergen policy</Link>.
          </p>
        </Section>

        <Section title="Private events and catering">
          <p>
            Send us the details through the <Link href="/events" className="text-forest underline">events and catering form</Link>, and we will reply with a quote.
          </p>
        </Section>

        <Section title="Our branches">
          <ul className="grid gap-3 sm:grid-cols-2">
            {branches.map((branch) => (
              <li key={branch.id} className="rounded-brand bg-paper p-4 shadow-soft" data-testid={`contact-${branch.slug}`}>
                <h3 className="text-lg">
                  <Link href={`/branches/${branch.slug}`} className="hover:underline">
                    {branch.name}
                  </Link>
                </h3>
                <p className="mt-1 text-sm text-stone">
                  {branch.address}, {branch.city}
                </p>
                <p className="mt-1 text-sm">
                  <a href={`tel:${branch.phone.replace(/\s/g, "")}`} className="text-forest underline">
                    {branch.phone}
                  </a>
                </p>
              </li>
            ))}
          </ul>
        </Section>

        <div className="mt-10">
          <ToConfirm>a general email address, and who to contact about press or becoming a supplier.</ToConfirm>
        </div>
      </div>
    </div>
  );
}
