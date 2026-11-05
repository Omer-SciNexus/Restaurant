import type { Metadata } from "next";
import Link from "next/link";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { ADMIN_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Menu categories" };

export default async function CategoriesPage() {
  await requirePageRole(ADMIN_ROLES, "/admin/menu/categories");
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  const nextSort = (categories.at(-1)?.sortOrder ?? -1) + 1;

  return (
    <div className="max-w-4xl">
      <Link href="/admin/menu" className="text-sm text-forest underline">
        Back to the menu
      </Link>
      <h1 className="mt-2 text-3xl">Categories</h1>
      <p className="mt-1 text-sm text-stone">Lower sort numbers come first. A serving window hides the category outside those times, in each branch&apos;s own timezone.</p>
      <h2 className="mt-6 text-xl">Add a category</h2>
      <div className="mt-2">
        <CategoryForm key={nextSort} nextSort={nextSort} />
      </div>
      <h2 className="mt-8 text-xl">All categories</h2>
      <ul className="mt-2 space-y-3">
        {categories.map((category) => (
          <li key={category.id}>
            <CategoryForm category={category} />
          </li>
        ))}
      </ul>
    </div>
  );
}
