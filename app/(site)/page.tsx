import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { BranchPicker } from "@/components/menu/BranchPicker";
import { DishCard } from "@/components/menu/DishCard";
import { LinkButton } from "@/components/ui/Button";
import { getBranches, getMenu, getSeasonalDishes } from "@/lib/menu";
import { getFallbackTimezone, getSelectedBranch } from "@/lib/selection";

const RULES = [
  { image: "rule-made-in-house", title: "Made in our kitchens", text: "Cooked from whole ingredients, with no ready-made sauces." },
  { image: "rule-oven-baked", title: "No deep fryer", text: "Fries, wedges and tenders are oven-baked in olive oil." },
  { image: "rule-grass-fed", title: "Better meat and fish", text: "Grass-fed, free-range and responsibly caught, claimed only with proof from our suppliers." },
  { image: "rule-whole-grain", title: "Whole grains", text: "Buns, breads and pizza from whole grains or slow-fermented sourdough." },
  { image: "rule-nothing-artificial", title: "Nothing artificial", text: "No artificial colours, flavours or preservatives." },
  { image: "rule-natural-sweeteners", title: "Naturally sweet", text: "Sweetened with fruit, honey or maple. No high-fructose corn syrup." },
];

function HeroImage() {
  const common = { alt: "A table of grain bowls, salads and fresh juices, shared by friends", sizes: "(min-width: 1024px) 60vw, 100vw", quality: 80, priority: true };
  const { props: desktop } = getImageProps({ ...common, src: "/images/hero/hero-home-table-desktop.png", width: 1536, height: 1024 });
  const { props: mobile } = getImageProps({ ...common, src: "/images/hero/hero-home-mobile.png", width: 1024, height: 1536 });
  return (
    <picture>
      <source media="(min-width: 1024px)" srcSet={desktop.srcSet} sizes={desktop.sizes} />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt is included in the spread props */}
      <img {...mobile} style={undefined} className="h-full w-full object-cover object-[70%_center]" />
    </picture>
  );
}

export default async function HomePage() {
  const [branches, selected, seasonal, timezone] = await Promise.all([getBranches(), getSelectedBranch(), getSeasonalDishes(4), getFallbackTimezone()]);
  const menu = await getMenu(selected?.id ?? null, selected?.timezone ?? timezone);

  return (
    <>
      <section className="grid lg:min-h-[640px] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="order-2 flex flex-col justify-center px-4 py-10 sm:px-6 lg:order-1 lg:py-16 lg:pl-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] lg:pr-12">
          <h1 className="text-4xl leading-[1.08] sm:text-5xl xl:text-6xl">Natural food, nothing hidden.</h1>
          <p className="mt-5 max-w-lg text-lg text-stone">
            Every dish shows its ingredients, nutrition and allergens before you order, from a grain bowl to a stone-baked pizza. All cooked from whole ingredients in our own kitchens.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/menu" size="lg">
              See the menu
            </LinkButton>
            <LinkButton href="/build-a-bowl" size="lg" variant="secondary">
              Build a bowl
            </LinkButton>
          </div>
        </div>
        <div className="relative order-1 aspect-square overflow-hidden sm:aspect-[16/10] lg:order-2 lg:aspect-auto">
          <HeroImage />
        </div>
      </section>

      {seasonal.length > 0 ? (
        <section aria-labelledby="seasonal" className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="seasonal" className="text-3xl">
                In season now
              </h2>
              <p className="mt-1 text-stone">Dishes that follow the market.</p>
            </div>
            <Link href="/menu" className="whitespace-nowrap text-sm font-medium text-forest hover:underline">
              Full menu
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {seasonal.map((dish) => (
              <DishCard key={dish.id} dish={dish} />
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="rules" className="mt-20 bg-paper py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 id="rules" className="text-3xl">
            Our natural rules
          </h2>
          <p className="mt-2 max-w-2xl text-stone">The same six rules apply to everything we serve, including the burgers and the brownies.</p>
          <ul className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {RULES.map((rule) => (
              <li key={rule.title} className="flex gap-4">
                <Image src={`/images/illustrations/rules/${rule.image}.png`} alt="" width={80} height={80} className="h-20 w-20 shrink-0" />
                <div>
                  <h3 className="text-lg">{rule.title}</h3>
                  <p className="mt-1 text-sm text-stone">{rule.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <Link href="/our-food" className="mt-8 inline-block text-sm font-medium text-forest hover:underline">
            More about our food
          </Link>
        </div>
      </section>

      <section aria-labelledby="browse" className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
        <h2 id="browse" className="text-3xl">
          Something for everyone at the table
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {menu.map((category) => (
            <li key={category.slug}>
              <Link href={category.slug === "build-your-own" ? "/build-a-bowl" : `/menu/${category.slug}`} className="group block">
                <span className="relative block aspect-[3/2] overflow-hidden rounded-brand bg-oat-deep">
                  {category.imageUrl ? (
                    <Image src={category.imageUrl} alt="" fill sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  ) : null}
                </span>
                <span className="mt-2 block font-medium group-hover:underline">{category.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-20 grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-2">
        <Link href="/build-a-bowl" className="group relative flex min-h-80 items-end overflow-hidden rounded-brand">
          <Image src="/images/hero/hero-one-bowl-desktop.png" alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
          <span className="relative m-4 rounded-brand bg-paper p-5">
            <span className="block font-heading text-2xl">Build your own bowl</span>
            <span className="mt-1 block text-sm text-stone">Four steps, with live price, calories and macros.</span>
          </span>
        </Link>
        <Link href="/cook" className="group relative flex min-h-80 items-end overflow-hidden rounded-brand">
          <Image src="/images/cook/cook-hero-desktop.png" alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
          <span className="relative m-4 rounded-brand bg-paper p-5">
            <span className="block font-heading text-2xl">Cook at home</span>
            <span className="mt-1 block text-sm text-stone">Step-by-step videos of our dishes, for your own kitchen.</span>
          </span>
        </Link>
      </section>

      <section aria-labelledby="find" className="mx-auto mt-20 max-w-3xl px-4 text-center sm:px-6">
        <h2 id="find" className="text-3xl">
          Find your nearest branch
        </h2>
        <p className="mb-6 mt-2 text-stone">Pickup from any of our {branches.length} branches, or delivery to the area around them.</p>
        <BranchPicker branches={branches.map((b) => ({ id: b.id, slug: b.slug, name: b.name, address: b.address }))} selectedSlug={selected?.slug} next="/menu" />
      </section>
    </>
  );
}
