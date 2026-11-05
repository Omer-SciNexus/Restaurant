import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageIntro } from "@/components/site/ContentPage";
import { EmptyState } from "@/components/ui/EmptyState";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Our farms", description: "The suppliers behind Nature Food, and what each of them has confirmed." };

export default async function FarmsPage() {
  // Only published suppliers. Nothing here is ever written in by hand or filled in with examples.
  const suppliers = await prisma.supplier.findMany({ where: { isPublished: true }, orderBy: { name: "asc" }, select: { slug: true, name: true, region: true, story: true, photoUrl: true } });

  return (
    <div className="pb-10">
      <PageIntro
        title="Our farms"
        image="/images/farms/farm-green-rows.png"
        lead={<p>Where our food comes from, told by supplier: who they are, where they are and what they can prove.</p>}
      />

      <div className="mx-auto mt-10 max-w-6xl px-4 sm:px-6">
        {suppliers.length === 0 ? (
          <EmptyState image="/images/illustrations/rules/rule-made-in-house.png" title="Supplier stories are coming">
            <p>We are still confirming who supplies our kitchens, and what each of them can show. We will add their stories here once we have, because we would rather show you nothing than a claim we cannot back up.</p>
            <p className="mt-3">
              In the meantime, <Link href="/our-food" className="text-forest underline">read our natural rules</Link>.
            </p>
          </EmptyState>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {suppliers.map((supplier) => (
              <li key={supplier.slug} className="overflow-hidden rounded-brand bg-paper shadow-soft">
                <Link href={`/farms/${supplier.slug}`} className="group block">
                  {supplier.photoUrl ? (
                    <span className="relative block aspect-[3/2] bg-oat-deep">
                      <Image src={supplier.photoUrl} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                    </span>
                  ) : null}
                  <span className="block p-5">
                    <span className="block font-heading text-xl group-hover:underline">{supplier.name}</span>
                    <span className="mt-0.5 block text-sm text-stone">{supplier.region}</span>
                    <span className="mt-2 line-clamp-3 block text-sm">{supplier.story}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
