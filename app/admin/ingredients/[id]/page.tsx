import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IngredientForm } from "@/components/admin/IngredientForm";
import { ADMIN_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Allergen } from "@/lib/domain";

export const metadata: Metadata = { title: "Edit ingredient" };

export default async function IngredientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePageRole(ADMIN_ROLES, `/admin/ingredients/${id}`);
  const ingredient = await prisma.ingredient.findUnique({
    where: { id },
    include: {
      verifiedBy: { select: { name: true } },
      changes: { where: { status: "PENDING" }, select: { id: true } },
      _count: { select: { menuItems: true, options: true } },
    },
  });
  if (!ingredient) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/ingredients" className="text-sm text-forest underline">
        All ingredients
      </Link>
      <h1 className="mt-2 text-3xl">{ingredient.name}</h1>
      <p className="mt-1 text-sm text-stone">
        Used in {ingredient._count.menuItems} dishes and {ingredient._count.options} options.{" "}
        {ingredient.verifiedAt ? `Verified by ${ingredient.verifiedBy?.name ?? "a nutritionist"} on ${ingredient.verifiedAt.toISOString().slice(0, 10)}.` : "Not verified yet."}
      </p>
      {ingredient.changes.length > 0 ? (
        <p className="mt-4 rounded-brand bg-honey/20 p-3 text-sm">
          A change is <Link href="/admin/approvals" className="font-medium text-forest underline">waiting for approval</Link>. Review it before proposing another.
        </p>
      ) : (
        <IngredientForm
          ingredientId={ingredient.id}
          values={{
            kcal: ingredient.kcal,
            protein: ingredient.protein,
            carbs: ingredient.carbs,
            fat: ingredient.fat,
            fibre: ingredient.fibre,
            sugar: ingredient.sugar,
            salt: ingredient.salt,
            allergens: ingredient.allergens as Allergen[],
            mayContain: ingredient.mayContain as Allergen[],
            isVegan: ingredient.isVegan,
            isVegetarian: ingredient.isVegetarian,
            isGlutenFree: ingredient.isGlutenFree,
          }}
        />
      )}
    </div>
  );
}
