import type { Metadata } from "next";
import Link from "next/link";
import { ADMIN_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ALLERGEN_INFO, type Allergen } from "@/lib/domain";

export const metadata: Metadata = { title: "Ingredients" };

export default async function IngredientsPage({ searchParams }: { searchParams: Promise<{ q?: string; show?: string }> }) {
  await requirePageRole(ADMIN_ROLES, "/admin/ingredients");
  const { q = "", show } = await searchParams;
  const rows = await prisma.ingredient.findMany({
    where: {
      name: q ? { contains: q, mode: "insensitive" } : undefined,
      verifiedAt: show === "unverified" ? null : undefined,
    },
    orderBy: { name: "asc" },
    include: { changes: { where: { status: "PENDING" }, select: { id: true } } },
  });
  const [total, verified] = await Promise.all([prisma.ingredient.count(), prisma.ingredient.count({ where: { verifiedAt: { not: null } } })]);

  return (
    <>
      <h1 className="text-3xl">Ingredients</h1>
      <p className="mt-1 text-sm text-stone">
        {verified} of {total} verified by a nutritionist. Dishes show a draft notice until all of their ingredients are verified.
      </p>
      <form action="/admin/ingredients" className="mt-4 flex flex-wrap items-center gap-2">
        <label htmlFor="q" className="sr-only">
          Search ingredients
        </label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="Search" className="min-h-10 rounded-brand border border-stone/50 bg-paper px-3 text-sm" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="show" value="unverified" defaultChecked={show === "unverified"} className="h-4 w-4 accent-forest" />
          Unverified only
        </label>
        <button type="submit" className="min-h-10 rounded-brand border border-forest/40 px-4 text-sm text-forest hover:bg-sage/60">
          Apply
        </button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-brand bg-paper shadow-soft">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line text-xs text-stone">
            <tr>
              <th className="px-4 py-3 font-medium">Ingredient</th>
              <th className="px-4 py-3 font-medium">kcal / 100 g</th>
              <th className="px-4 py-3 font-medium">Allergens</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-2.5">
                  <Link href={`/admin/ingredients/${row.id}`} className="font-medium text-forest hover:underline">
                    {row.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5">{row.kcal}</td>
                <td className="px-4 py-2.5">{row.allergens.map((a) => ALLERGEN_INFO[a as Allergen].label).join(", ") || "None"}</td>
                <td className="px-4 py-2.5">
                  {row.changes.length > 0 ? (
                    <span className="rounded-full bg-honey/30 px-2 py-0.5 text-xs font-medium">Change waiting</span>
                  ) : row.verifiedAt ? (
                    <span className="rounded-full bg-sage px-2 py-0.5 text-xs font-medium">Verified</span>
                  ) : (
                    <span className="rounded-full bg-oat-deep px-2 py-0.5 text-xs font-medium">Not verified</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
