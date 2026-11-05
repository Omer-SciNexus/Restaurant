import type { Metadata } from "next";
import Link from "next/link";
import { DishForm } from "@/components/admin/DishForm";
import { ADMIN_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Add a dish" };

export default async function NewDishPage() {
  await requirePageRole(ADMIN_ROLES, "/admin/menu/new");
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } });
  return (
    <div className="max-w-3xl">
      <Link href="/admin/menu" className="text-sm text-forest underline">
        Back to the menu
      </Link>
      <h1 className="mb-4 mt-2 text-3xl">Add a dish</h1>
      <DishForm categories={categories} />
    </div>
  );
}
