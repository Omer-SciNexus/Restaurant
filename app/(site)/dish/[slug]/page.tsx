import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DishOrderPanel } from "@/components/menu/DishOrderPanel";
import { getCurrentUser } from "@/lib/auth";
import { formatTime } from "@/lib/hours";
import { getDish } from "@/lib/menu";
import { getFallbackTimezone, getSelectedBranch } from "@/lib/selection";
import { formatMoney, type Allergen, type Diet } from "@/lib/domain";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const [selected, fallback] = await Promise.all([getSelectedBranch(), getFallbackTimezone()]);
  const dish = await getDish(slug, selected?.id ?? null, selected?.timezone ?? fallback);
  return { selected, dish };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { dish } = await load(slug);
  return dish
    ? { title: dish.name, description: dish.description, openGraph: { images: [dish.imageUrl] } }
    : { title: "Dish not found" };
}

export default async function DishPage({ params }: Props) {
  const { slug } = await params;
  const { selected, dish } = await load(slug);
  if (!dish) notFound();
  if (dish.isBuilder) redirect("/build-a-bowl");
  const user = await getCurrentUser();
  const suppliers = [...new Map(dish.ingredients.flatMap((i) => (i.supplier ? [[i.supplier.slug, i.supplier]] : []))).values()];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-stone">
        <Link href="/menu" className="hover:underline">
          Menu
        </Link>
        <span aria-hidden="true"> / </span>
        <Link href={`/menu/${dish.categorySlug}`} className="hover:underline">
          {dish.categoryName}
        </Link>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-brand bg-oat-deep lg:sticky lg:top-24">
            <Image src={dish.imageUrl} alt={dish.name} fill priority sizes="(min-width: 1024px) 50vw, 100vw" quality={80} className="object-cover" />
          </div>
        </div>

        <div>
          <h1 className="text-4xl leading-tight">{dish.name}</h1>
          <p className="mt-2 text-xl font-medium">{formatMoney(dish.priceCents)}</p>
          <p className="mt-3 text-stone">{dish.description}</p>

          {!dish.isServing && dish.servedFrom && dish.servedUntil ? (
            <p className="mt-4 rounded-brand bg-oat-deep p-3 text-sm">
              Served {formatTime(dish.servedFrom)} to {formatTime(dish.servedUntil)}. Come back then to order this one.
            </p>
          ) : null}

          <DishOrderPanel
            dish={dish}
            branchSelected={Boolean(selected)}
            profile={user ? { diets: user.diets as Diet[], allergies: user.allergies as Allergen[] } : null}
          />

          <section className="mt-8" aria-labelledby="ingredients">
            <h2 id="ingredients" className="text-2xl">
              What is in it
            </h2>
            <ul className="mt-3 divide-y divide-line">
              {dish.ingredients.map((ingredient) => (
                <li key={ingredient.name} className="flex justify-between gap-4 py-2 text-sm">
                  <span>{ingredient.name}</span>
                  <span className="text-stone">{ingredient.grams} g</span>
                </li>
              ))}
            </ul>
          </section>

          {suppliers.length > 0 ? (
            <section className="mt-8" aria-labelledby="sourcing">
              <h2 id="sourcing" className="text-2xl">
                Where it comes from
              </h2>
              <ul className="mt-3 space-y-1 text-sm">
                {suppliers.map((supplier) => (
                  <li key={supplier.slug}>
                    <Link href={`/farms/${supplier.slug}`} className="text-forest underline">
                      {supplier.name}
                    </Link>
                    , {supplier.region}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
