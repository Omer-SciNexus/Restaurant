import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton } from "@/components/ui/Button";
import { ADMIN_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recipeCategory, recipeCategoryLabel } from "@/lib/recipes";

export const metadata: Metadata = { title: "Recipes" };

export default async function AdminRecipesPage() {
  await requirePageRole(ADMIN_ROLES, "/admin/recipes");
  const rows = await prisma.recipe.findMany({
    orderBy: { title: "asc" },
    include: {
      video: { select: { playbackId: true, uploadId: true } },
      menuItem: { select: { category: { select: { slug: true } } } },
      ingredients: { select: { ingredient: { select: { verifiedAt: true } } } },
      _count: { select: { steps: true, cookbook: true } },
    },
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl">Recipes</h1>
          <p className="mt-1 text-sm text-stone">Nutrition is calculated from the ingredient table. A recipe shows a draft notice until all of its ingredients are verified.</p>
        </div>
        <LinkButton href="/admin/recipes/new">New recipe</LinkButton>
      </div>

      <div className="mt-4 overflow-x-auto rounded-brand bg-paper shadow-soft">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line text-xs text-stone">
            <tr>
              <th className="px-4 py-3 font-medium">Recipe</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Video</th>
              <th className="px-4 py-3 font-medium">Nutrition</th>
              <th className="px-4 py-3 font-medium">Steps</th>
              <th className="px-4 py-3 font-medium">Saved by</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => {
              const verified = row.ingredients.length > 0 && row.ingredients.every((line) => line.ingredient.verifiedAt !== null);
              return (
                <tr key={row.id}>
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/recipes/${row.id}`} className="font-medium text-forest hover:underline">
                      {row.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">{recipeCategoryLabel(recipeCategory(row.menuItem?.category.slug)) ?? "None"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.status === "PUBLISHED" ? "bg-sage" : "bg-oat-deep"}`}>{row.status === "PUBLISHED" ? "Published" : "Draft"}</span>
                  </td>
                  <td className="px-4 py-2.5">{row.video?.playbackId ? "Ready" : row.video?.uploadId ? "Processing" : "None yet"}</td>
                  <td className="px-4 py-2.5">{verified ? "Verified" : "Draft data"}</td>
                  <td className="px-4 py-2.5">{row._count.steps}</td>
                  <td className="px-4 py-2.5">{row._count.cookbook}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
