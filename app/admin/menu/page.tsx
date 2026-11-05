import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton } from "@/components/ui/Button";
import { ADMIN_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/domain";

export const metadata: Metadata = { title: "Menu" };

export default async function AdminMenuPage() {
  await requirePageRole(ADMIN_ROLES, "/admin/menu");
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, basePriceCents: true, isActive: true, isSeasonal: true, isBuilder: true, _count: { select: { ingredients: true } } },
      },
    },
  });

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl">Menu</h1>
          <p className="mt-1 text-sm text-stone">One shared menu for all branches. Branches mark dishes sold out from their own screen.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/admin/menu/categories" variant="secondary">
            Categories
          </LinkButton>
          <LinkButton href="/admin/menu/new">Add a dish</LinkButton>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {categories.map((category) => (
          <section key={category.id} aria-labelledby={`category-${category.id}`} className="rounded-brand bg-paper p-5 shadow-soft">
            <h2 id={`category-${category.id}`} className="text-xl">
              {category.name}
            </h2>
            <p className="text-xs text-stone">{category.servedFrom && category.servedUntil ? `Served ${category.servedFrom} to ${category.servedUntil}` : "Served all day"}</p>
            {category.items.length === 0 ? <p className="mt-2 text-sm text-stone">No dishes yet.</p> : null}
            <ul className="mt-2 divide-y divide-line">
              {category.items.map((dish) => (
                <li key={dish.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                  <Link href={`/admin/menu/${dish.id}`} className="font-medium text-forest hover:underline">
                    {dish.name}
                  </Link>
                  <span className="text-stone">{formatMoney(dish.basePriceCents)}</span>
                  {dish.isSeasonal ? <span className="rounded-full bg-terracotta px-2 py-0.5 text-xs font-medium text-white">Seasonal</span> : null}
                  {dish.isActive ? null : <span className="rounded-full bg-oat-deep px-2 py-0.5 text-xs font-medium">Hidden</span>}
                  {dish._count.ingredients === 0 && !dish.isBuilder ? <span className="rounded-full bg-honey/30 px-2 py-0.5 text-xs font-medium">No ingredients</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
