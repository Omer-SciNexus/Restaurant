import type { Metadata } from "next";
import { getImageProps } from "next/image";
import Link from "next/link";
import { RecipeCard } from "@/components/cook/RecipeCard";
import { DIET_INFO, DIETS } from "@/lib/domain";
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  filterHref,
  filterRecipes,
  getPublishedRecipes,
  hasFilters,
  NO_FILTERS,
  RECIPE_CATEGORIES,
  TIME_LIMITS,
  type RecipeFilters,
} from "@/lib/recipes";
import { parseRecipeFilters } from "@/lib/validation/recipes";

export const metadata: Metadata = {
  title: "Cook at home",
  description: "Our dishes, written for a home kitchen. Step-by-step recipes with a servings scaler, timers and the same nutrition and allergen data as the menu.",
};

const PATH = "/cook";

function HeroImage() {
  // The phone and desktop photos differ, so this describes what they have in common.
  const common = { alt: "A home cook preparing a grain bowl on a wooden counter", sizes: "100vw", quality: 80, priority: true };
  const { props: desktop } = getImageProps({ ...common, src: "/images/cook/cook-hero-desktop.png", width: 1536, height: 1024 });
  const { props: mobile } = getImageProps({ ...common, src: "/images/cook/cook-hero-mobile.png", width: 1024, height: 1536 });
  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={desktop.srcSet} sizes={desktop.sizes} />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt is included in the spread props */}
      <img {...mobile} style={undefined} className="h-full w-full object-cover" />
    </picture>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: string }) {
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        aria-current={active ? "true" : undefined}
        className={`inline-flex min-h-10 items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium ${active ? "border-forest bg-forest text-white" : "border-stone/40 hover:bg-sage/60"}`}
      >
        {children}
      </Link>
    </li>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-body text-sm font-semibold">{label}</h2>
      <ul className="mt-2 flex flex-wrap gap-2" aria-label={`Filter by ${label.toLowerCase()}`}>
        {children}
      </ul>
    </div>
  );
}

/** Filters and search are plain links and a plain form, so they work before any JavaScript loads. */
export default async function CookPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseRecipeFilters(await searchParams);
  const recipes = await getPublishedRecipes();
  const visible = filterRecipes(recipes, filters);
  const filtering = hasFilters(filters);
  const hrefWith = (change: Partial<RecipeFilters>) => filterHref(PATH, { ...filters, ...change });

  return (
    <>
      <section className="relative aspect-[4/3] overflow-hidden bg-oat-deep sm:aspect-[21/9]">
        <HeroImage />
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6">
        <h1 className="text-4xl">Cook at home</h1>
        <p className="mt-2 max-w-2xl text-stone">
          Our dishes, written for a home kitchen. Each recipe shows nutrition and allergens per serving, worked out from the same ingredient data as our menu. We are still filming the videos, so some recipes start with the written steps.
        </p>

        <form action={PATH} role="search" className="mt-6 flex max-w-xl gap-2">
          {filters.diets.map((diet) => (
            <input key={diet} type="hidden" name="diet" value={DIET_INFO[diet].slug} />
          ))}
          {filters.time !== null ? <input type="hidden" name="time" value={filters.time} /> : null}
          {filters.difficulty ? <input type="hidden" name="difficulty" value={filters.difficulty.toLowerCase()} /> : null}
          {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
          <label htmlFor="recipe-search" className="sr-only">
            Search recipes
          </label>
          <input
            id="recipe-search"
            name="q"
            type="search"
            defaultValue={filters.query}
            placeholder="Search recipes or ingredients"
            className="min-h-10 w-full rounded-brand border border-stone/50 bg-paper px-3 text-sm"
          />
          <button type="submit" className="min-h-10 rounded-brand border border-forest/40 px-4 text-sm font-medium text-forest hover:bg-sage/60">
            Search
          </button>
        </form>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <FilterGroup label="Category">
            {RECIPE_CATEGORIES.map((category) => {
              const active = filters.category === category.slug;
              return (
                <FilterChip key={category.slug} active={active} href={hrefWith({ category: active ? null : category.slug })}>
                  {category.label}
                </FilterChip>
              );
            })}
          </FilterGroup>
          <FilterGroup label="Diet">
            {DIETS.map((diet) => {
              const active = filters.diets.includes(diet);
              return (
                <FilterChip key={diet} active={active} href={hrefWith({ diets: active ? filters.diets.filter((d) => d !== diet) : [...filters.diets, diet] })}>
                  {DIET_INFO[diet].label}
                </FilterChip>
              );
            })}
          </FilterGroup>
          <FilterGroup label="Cooking time">
            {TIME_LIMITS.map((limit) => {
              const active = filters.time === limit;
              return (
                <FilterChip key={limit} active={active} href={hrefWith({ time: active ? null : limit })}>
                  {`Under ${limit} min`}
                </FilterChip>
              );
            })}
          </FilterGroup>
          <FilterGroup label="Difficulty">
            {DIFFICULTIES.map((difficulty) => {
              const active = filters.difficulty === difficulty;
              return (
                <FilterChip key={difficulty} active={active} href={hrefWith({ difficulty: active ? null : difficulty })}>
                  {DIFFICULTY_LABEL[difficulty]}
                </FilterChip>
              );
            })}
          </FilterGroup>
        </div>

        {filtering ? (
          <p role="status" className="mt-6 text-sm text-stone">
            {visible.length} {visible.length === 1 ? "recipe" : "recipes"} found.{" "}
            <Link href={filterHref(PATH, NO_FILTERS)} className="text-forest underline">
              Clear filters
            </Link>
          </p>
        ) : null}

        {visible.length > 0 ? (
          <section aria-labelledby="recipes-heading" className="mt-6">
            <h2 id="recipes-heading" className="sr-only">
              Recipes
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
              {visible.map((recipe, index) => (
                <RecipeCard key={recipe.id} recipe={recipe} priority={index < 2} />
              ))}
            </div>
          </section>
        ) : (
          <p className="mt-10 text-center text-stone">{filtering ? "No recipes match those filters. Try removing one." : "The first recipes are on their way."}</p>
        )}
      </div>
    </>
  );
}
