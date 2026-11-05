import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/db";

type Props = { params: Promise<{ slug: string }> };

/** An unpublished supplier does not exist as far as guests are concerned. */
const loadSupplier = cache(async (slug: string) =>
  prisma.supplier.findFirst({
    where: { slug, isPublished: true },
    include: { ingredients: { orderBy: { name: "asc" }, select: { id: true, name: true } } },
  }),
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supplier = await loadSupplier(slug);
  return supplier ? { title: supplier.name, description: `${supplier.name}, ${supplier.region}: a Nature Food supplier.` } : { title: "Supplier not found" };
}

export default async function FarmPage({ params }: Props) {
  const { slug } = await params;
  const supplier = await loadSupplier(slug);
  if (!supplier) notFound();
  // A certification is only ever shown with the certificate that proves it.
  const certifications = supplier.certificateUrl ? supplier.certifications : [];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-stone">
        <Link href="/farms" className="hover:underline">
          Our farms
        </Link>
      </nav>
      <h1 className="mt-3 text-4xl leading-tight">{supplier.name}</h1>
      <p className="mt-1 text-lg text-stone">{supplier.region}</p>

      {supplier.photoUrl ? (
        <div className="relative mt-6 aspect-[3/2] overflow-hidden rounded-brand bg-oat-deep">
          <Image src={supplier.photoUrl} alt={supplier.name} fill priority sizes="(min-width: 768px) 48rem, 100vw" quality={80} className="object-cover" />
        </div>
      ) : null}

      <p className="mt-6 whitespace-pre-line text-[15px] leading-relaxed">{supplier.story}</p>

      {certifications.length > 0 ? (
        <section aria-labelledby="certificates" className="mt-8 rounded-brand bg-sage p-5">
          <h2 id="certificates" className="text-xl">
            Certified
          </h2>
          <ul className="mt-2 list-inside list-disc text-sm">
            {certifications.map((claim) => (
              <li key={claim}>{claim}</li>
            ))}
          </ul>
          <a href={supplier.certificateUrl!} rel="noopener noreferrer" target="_blank" className="mt-3 inline-block text-sm font-medium text-forest underline">
            See the certificate
          </a>
        </section>
      ) : null}

      {supplier.ingredients.length > 0 ? (
        <section aria-labelledby="supplies" className="mt-8">
          <h2 id="supplies" className="text-2xl">
            What they supply
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {supplier.ingredients.map((ingredient) => (
              <li key={ingredient.id} className="rounded-full bg-paper px-3 py-1 text-sm shadow-soft">
                {ingredient.name}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
