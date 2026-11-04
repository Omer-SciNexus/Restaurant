import Link from "next/link";
import { BranchPicker } from "@/components/menu/BranchPicker";
import { DishCard } from "@/components/menu/DishCard";
import { getCurrentUser } from "@/lib/auth";
import { DIET_INFO, DIETS, dietFromSlug, type Allergen, type Diet } from "@/lib/domain";
import { formatTime } from "@/lib/hours";
import { getBranches, getMenu, type DishSummary } from "@/lib/menu";
import { getFallbackTimezone, getSelectedBranch } from "@/lib/selection";

export type MenuSearch = { diet?: string | string[]; q?: string };

function parseDiets(raw: MenuSearch["diet"]): Diet[] {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list.map(dietFromSlug).filter((diet): diet is Diet => Boolean(diet));
}

function matches(dish: DishSummary, diets: Diet[], query: string): boolean {
  if (!diets.every((diet) => dish.facts.diets.includes(diet))) return false;
  if (!query) return true;
  const haystack = `${dish.name} ${dish.description}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}

function filterHref(path: string, diets: Diet[], toggle: Diet, query: string): string {
  const next = diets.includes(toggle) ? diets.filter((d) => d !== toggle) : [...diets, toggle];
  const params = new URLSearchParams();
  next.forEach((diet) => params.append("diet", DIET_INFO[diet].slug));
  if (query) params.set("q", query);
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

/** Filters and search are plain links and a plain form, so they work before any JavaScript loads. */
export async function MenuPage({ search, categorySlug }: { search: MenuSearch; categorySlug?: string }) {
  const [user, selected, branches, fallbackTimezone] = await Promise.all([getCurrentUser(), getSelectedBranch(), getBranches(), getFallbackTimezone()]);
  const menu = await getMenu(selected?.id ?? null, selected?.timezone ?? fallbackTimezone);
  const diets = parseDiets(search.diet);
  const query = (search.q ?? "").trim().slice(0, 80);
  const path = categorySlug ? `/menu/${categorySlug}` : "/menu";
  const profile = user && (user.diets.length > 0 || user.allergies.length > 0) ? { diets: user.diets as Diet[], allergies: user.allergies as Allergen[] } : null;

  const visible = menu
    .filter((category) => !categorySlug || category.slug === categorySlug)
    .map((category) => ({ ...category, items: category.items.filter((dish) => matches(dish, diets, query)) }));
  const total = visible.reduce((sum, category) => sum + category.items.length, 0);
  const filtering = diets.length > 0 || query.length > 0;
  const current = categorySlug ? menu.find((category) => category.slug === categorySlug) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6">
      <h1 className="text-4xl">{current?.name ?? "Menu"}</h1>
      <p className="mt-2 max-w-2xl text-stone">{current?.description ?? "One menu, shared across every branch. Every dish shows what is in it."}</p>

      {selected ? (
        <p className="mt-4 text-sm">
          Showing <strong>{selected.name}</strong>.{" "}
          <Link href="/branches" className="text-forest underline">
            Change branch
          </Link>
        </p>
      ) : (
        <div className="mt-6 rounded-brand bg-paper p-5 shadow-soft">
          <p className="mb-3 font-medium">Choose a branch to see what is available and to order.</p>
          <BranchPicker branches={branches.map((b) => ({ id: b.id, slug: b.slug, name: b.name, address: b.address }))} />
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <ul className="flex flex-wrap gap-2" aria-label="Filter by diet">
          {DIETS.map((diet) => {
            const active = diets.includes(diet);
            return (
              <li key={diet}>
                <Link
                  href={filterHref(path, diets, diet, query)}
                  aria-pressed={active}
                  scroll={false}
                  className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium ${active ? "border-forest bg-forest text-white" : "border-stone/40 hover:bg-sage/60"}`}
                >
                  {DIET_INFO[diet].label}
                </Link>
              </li>
            );
          })}
        </ul>
        <form action={path} role="search" className="flex gap-2">
          {diets.map((diet) => (
            <input key={diet} type="hidden" name="diet" value={DIET_INFO[diet].slug} />
          ))}
          <label htmlFor="menu-search" className="sr-only">
            Search the menu
          </label>
          <input
            id="menu-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search dishes or ingredients"
            className="min-h-10 w-full rounded-brand border border-stone/50 bg-paper px-3 text-sm lg:w-72"
          />
          <button type="submit" className="min-h-10 rounded-brand border border-forest/40 px-4 text-sm font-medium text-forest hover:bg-sage/60">
            Search
          </button>
        </form>
      </div>

      {!categorySlug ? (
        <nav aria-label="Menu sections" className="mt-5 flex gap-2 overflow-x-auto pb-2">
          {menu
            .filter((category) => category.isServing)
            .map((category) => (
              <a key={category.slug} href={`#${category.slug}`} className="whitespace-nowrap rounded-full bg-oat-deep px-3 py-1.5 text-sm hover:bg-sage">
                {category.name}
              </a>
            ))}
        </nav>
      ) : null}

      {filtering ? (
        <p role="status" className="mt-5 text-sm text-stone">
          {total} {total === 1 ? "dish" : "dishes"} found.{" "}
          <Link href={path} className="text-forest underline">
            Clear filters
          </Link>
        </p>
      ) : null}

      {visible.map((category) => {
        if (!category.isServing) {
          return filtering ? null : (
            <section key={category.slug} id={category.slug} className="mt-12 scroll-mt-32 rounded-brand bg-oat-deep p-5">
              <h2 className="text-2xl">{category.name}</h2>
              <p className="mt-1 text-sm text-stone">
                Served {formatTime(category.servedFrom!)} to {formatTime(category.servedUntil!)}. Back tomorrow morning.
              </p>
            </section>
          );
        }
        if (category.items.length === 0) return null;
        return (
          <section key={category.slug} id={category.slug} aria-labelledby={`h-${category.slug}`} className="mt-12 scroll-mt-32">
            {!categorySlug ? (
              <>
                <h2 id={`h-${category.slug}`} className="text-2xl">
                  {category.name}
                </h2>
                <p className="mt-1 text-sm text-stone">{category.description}</p>
              </>
            ) : (
              <h2 id={`h-${category.slug}`} className="sr-only">
                {category.name}
              </h2>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
              {category.items.map((dish) => (
                <DishCard key={dish.id} dish={dish} profile={profile} />
              ))}
            </div>
          </section>
        );
      })}

      {filtering && total === 0 ? (
        <p className="mt-10 text-center text-stone">No dishes match those filters. Try removing one.</p>
      ) : null}
    </div>
  );
}
