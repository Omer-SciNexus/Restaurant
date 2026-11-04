import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BranchPicker } from "@/components/menu/BranchPicker";
import { LinkButton } from "@/components/ui/Button";
import { now } from "@/lib/env";
import { formatTime, isOpenAt, WEEKDAYS } from "@/lib/hours";
import { branchHours, getBranchBySlug } from "@/lib/menu";

type Props = { params: Promise<{ slug: string }> };

const DAY_NAMES = { sun: "Sunday", mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday" };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const branch = await getBranchBySlug(slug);
  return { title: branch ? `${branch.name} branch` : "Branch not found" };
}

export default async function BranchPage({ params }: Props) {
  const { slug } = await params;
  const branch = await getBranchBySlug(slug);
  if (!branch) notFound();
  const hours = branchHours(branch);
  const open = isOpenAt(hours, now(), branch.timezone);
  const week = [...WEEKDAYS.slice(1), WEEKDAYS[0]];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-8 sm:px-6">
      <h1 className="text-4xl">{branch.name}</h1>
      <p className="mt-2 text-stone">
        {branch.address}, {branch.city}
      </p>
      <p className={`mt-1 font-medium ${open ? "text-forest" : "text-stone"}`}>{open ? "Open now" : "Closed now"}</p>
      <p className="mt-1 text-sm">
        <a href={`tel:${branch.phone.replace(/\s/g, "")}`} className="text-forest underline">
          {branch.phone}
        </a>
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <LinkButton href={`/book?branch=${branch.slug}`}>Book a table</LinkButton>
        <LinkButton href="/menu" variant="secondary">
          See the menu
        </LinkButton>
      </div>

      <section aria-labelledby="hours" className="mt-8 rounded-brand bg-paper p-5 shadow-soft">
        <h2 id="hours" className="text-xl">
          Opening hours
        </h2>
        <dl className="mt-3 divide-y divide-line text-sm">
          {week.map((day) => (
            <div key={day} className="flex justify-between py-2">
              <dt>{DAY_NAMES[day]}</dt>
              <dd>
                {hours[day]?.length
                  ? hours[day]!.map((range) => `${formatTime(range.open)} to ${formatTime(range.close)}`).join(", ")
                  : "Closed"}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl">Order from this branch</h2>
        <BranchPicker branches={[{ id: branch.id, slug: branch.slug, name: branch.name, address: branch.address }]} next="/menu" />
      </section>
    </div>
  );
}
