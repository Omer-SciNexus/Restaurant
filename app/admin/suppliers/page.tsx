import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton } from "@/components/ui/Button";
import { ADMIN_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Suppliers" };

export default async function SuppliersPage() {
  await requirePageRole(ADMIN_ROLES, "/admin/suppliers");
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { ingredients: true } } } });

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl">Suppliers</h1>
          <p className="mt-1 text-sm text-stone">Guests only see a supplier once it is published, and a certification only with its certificate.</p>
        </div>
        <LinkButton href="/admin/suppliers/new">Add a supplier</LinkButton>
      </div>

      {suppliers.length === 0 ? (
        <p className="mt-6 rounded-brand bg-paper p-5 text-sm shadow-soft">No suppliers yet. Until there are, the Our farms page says supplier stories are coming, and dish pages name no one.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-brand bg-paper px-5 shadow-soft">
          {suppliers.map((supplier) => (
            <li key={supplier.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-sm" data-testid={`supplier-${supplier.slug}`}>
              <Link href={`/admin/suppliers/${supplier.id}`} className="font-medium text-forest hover:underline">
                {supplier.name}
              </Link>
              {supplier.region ? <span className="text-stone">{supplier.region}</span> : null}
              <span className="text-stone">
                {supplier._count.ingredients} {supplier._count.ingredients === 1 ? "ingredient" : "ingredients"}
              </span>
              {supplier.isPublished ? <span className="rounded-full bg-sage px-2 py-0.5 text-xs font-medium">Published</span> : <span className="rounded-full bg-oat-deep px-2 py-0.5 text-xs font-medium">Not published</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
