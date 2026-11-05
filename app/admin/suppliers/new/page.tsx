import type { Metadata } from "next";
import Link from "next/link";
import { SupplierForm } from "@/components/admin/SupplierForm";
import { ADMIN_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Add a supplier" };

export default async function NewSupplierPage() {
  await requirePageRole(ADMIN_ROLES, "/admin/suppliers/new");
  const ingredients = await prisma.ingredient.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, supplier: { select: { name: true } } } });
  return (
    <div className="max-w-3xl">
      <Link href="/admin/suppliers" className="text-sm text-forest underline">
        All suppliers
      </Link>
      <h1 className="mb-4 mt-2 text-3xl">Add a supplier</h1>
      <SupplierForm ingredients={ingredients.map((row) => ({ id: row.id, name: row.name, supplierName: row.supplier?.name ?? null, isHere: false }))} />
    </div>
  );
}
