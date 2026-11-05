import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SupplierForm } from "@/components/admin/SupplierForm";
import { ADMIN_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Edit supplier" };

export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePageRole(ADMIN_ROLES, `/admin/suppliers/${id}`);
  const [supplier, ingredients] = await Promise.all([
    prisma.supplier.findUnique({ where: { id } }),
    prisma.ingredient.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, supplierId: true, supplier: { select: { name: true } } } }),
  ]);
  if (!supplier) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/suppliers" className="text-sm text-forest underline">
        All suppliers
      </Link>
      <h1 className="mt-2 text-3xl">{supplier.name}</h1>
      <p className="mb-4 mt-1 text-sm text-stone">
        Web address: <span className="font-mono text-xs">/farms/{supplier.slug}</span>.{" "}
        {supplier.isPublished ? (
          <Link href={`/farms/${supplier.slug}`} className="text-forest underline">
            See the guest page
          </Link>
        ) : (
          "Guests cannot see this until it is published."
        )}
      </p>
      <SupplierForm supplier={supplier} ingredients={ingredients.map((row) => ({ id: row.id, name: row.name, supplierName: row.supplier?.name ?? null, isHere: row.supplierId === supplier.id }))} />
    </div>
  );
}
