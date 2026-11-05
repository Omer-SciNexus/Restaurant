import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, Section, ToConfirm } from "@/components/site/ContentPage";

// Draft copy for the owner to approve. No pay, benefits or open roles: none is established yet.

export const metadata: Metadata = { title: "Careers", description: "The kinds of work behind a Nature Food branch." };

export default function CareersPage() {
  return (
    <div className="pb-10">
      <PageIntro
        title="Work with us"
        image="/images/pages/join-our-team.png"
        imageAlt="A team in green aprons preparing salads and serving drinks in a bright restaurant"
        lead={<p>Every branch has its own staff, drivers and manager, cooking from whole ingredients and showing guests exactly what is in each dish.</p>}
      />
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Section title="The work">
          <dl className="space-y-4">
            <div>
              <dt className="font-semibold">Branch staff</dt>
              <dd>Look after guests and orders: taking in new orders, preparing them, and getting them out to the counter or the driver.</dd>
            </div>
            <div>
              <dt className="font-semibold">Drivers</dt>
              <dd>Take deliveries close to the branch, from a simple phone page with the directions and the guest&apos;s details.</dd>
            </div>
            <div>
              <dt className="font-semibold">Branch managers</dt>
              <dd>Run a branch: its hours, delivery area, tables, staff and drivers.</dd>
            </div>
          </dl>
        </Section>

        <Section title="What matters here">
          <p>Allergies are taken seriously, and everyone on the team needs to treat them that way. We would like people who care about food and are straight with guests when they do not know something and need to check.</p>
        </Section>

        <div className="mt-10 space-y-3">
          <ToConfirm>current openings, pay and benefits, and how to apply.</ToConfirm>
          <p className="text-sm">
            You can find every branch on our <Link href="/branches" className="text-forest underline">branches page</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
