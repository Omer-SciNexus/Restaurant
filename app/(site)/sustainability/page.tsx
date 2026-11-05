import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, Section, ToConfirm } from "@/components/site/ContentPage";

// Draft copy for the owner to approve. No figures and no green claims: the plan establishes
// none, and "only claim what a supplier can show" applies here as much as to a menu.

export const metadata: Metadata = { title: "Sustainability", description: "What Nature Food can honestly say about how it sources and cooks, and what it has not measured yet." };

export default function SustainabilityPage() {
  return (
    <div className="pb-10">
      <PageIntro
        title="Sustainability"
        image="/images/pages/sustainability.png"
        imageAlt="Fresh vegetables in a cloth bag on a kitchen counter, beside stacked ceramic bowls and a jar of stock"
        lead={<p>We have not measured our footprint yet, so we are not going to quote you any numbers. Here is what we can say today.</p>}
      />
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Section title="What we do now">
          <ul className="list-outside list-disc space-y-2 pl-5">
            <li>
              <strong>We cook from whole ingredients</strong> in our own kitchens, rather than buying in ready-made sauces.
            </li>
            <li>
              <strong>The menu follows the seasons.</strong> Seasonal dishes come and go with set dates, and soups are there for the colder months.
            </li>
            <li>
              <strong>Dishes share base ingredients.</strong> Across the menu we reuse the same grilled chicken, sourdough dough, roasted vegetables and house sauces, which keeps every kitchen consistent.
            </li>
            <li>
              <strong>Sourcing claims need proof.</strong> A supplier appears on <Link href="/farms" className="text-forest underline">Our farms</Link> only once they have confirmed what we say about them, and a certification only with its certificate.
            </li>
          </ul>
        </Section>

        <Section title="What we have planned">
          <p>A reusable packaging option is planned for a later phase, after launch. We will describe it here once it is real.</p>
        </Section>

        <div className="mt-10">
          <ToConfirm>our packaging materials, how we handle food waste, and any energy or transport figures. None of these has been measured or decided yet, so we make no claim about them.</ToConfirm>
        </div>
      </div>
    </div>
  );
}
