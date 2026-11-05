import type { Metadata } from "next";
import Link from "next/link";
import { ReviewButtons } from "@/components/admin/ReviewButtons";
import { ADMIN_ROLES, canApproveNutritionChange } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { diffValues, type IngredientValues } from "@/lib/nutrition-review";

export const metadata: Metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  const user = await requirePageRole(ADMIN_ROLES, "/admin/approvals");
  const changes = await prisma.nutritionChange.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { ingredient: { select: { id: true, name: true } }, changedBy: { select: { name: true } } },
  });
  const history = await prisma.nutritionChange.findMany({
    where: { status: { not: "PENDING" } },
    orderBy: { reviewedAt: "desc" },
    take: 30,
    include: { ingredient: { select: { name: true } }, changedBy: { select: { name: true } }, approvedBy: { select: { name: true } } },
  });

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl">Nutrition approvals</h1>
      <p className="mt-1 text-sm text-stone">Every nutrition or allergen change needs a second person. Nobody can approve their own.</p>

      {changes.length === 0 ? <p className="mt-6 rounded-brand bg-paper p-5 text-sm shadow-soft">Nothing is waiting for review.</p> : null}

      <ul className="mt-6 space-y-4">
        {changes.map((change) => {
          const diffs = diffValues(change.oldValues as IngredientValues, change.newValues as IngredientValues);
          return (
            <li key={change.id} className="rounded-brand bg-paper p-5 shadow-soft" data-testid={`change-${change.ingredient.name}`}>
              <h2 className="text-xl">
                <Link href={`/admin/ingredients/${change.ingredient.id}`} className="hover:underline">
                  {change.ingredient.name}
                </Link>
              </h2>
              <p className="text-sm text-stone">Proposed by {change.changedBy.name}</p>
              {change.note ? <p className="mt-2 text-sm italic">{change.note}</p> : null}
              {diffs.length === 0 ? (
                <p className="mt-3 text-sm">No values changed. Approving records that these values have been verified.</p>
              ) : (
                <table className="mt-3 w-full text-left text-sm">
                  <thead className="text-xs text-stone">
                    <tr>
                      <th className="py-1 font-medium">Field</th>
                      <th className="py-1 font-medium">Now</th>
                      <th className="py-1 font-medium">Proposed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffs.map((diff) => (
                      <tr key={diff.field} className="border-t border-line">
                        <td className="py-1.5 capitalize">{diff.field}</td>
                        <td className="py-1.5 text-stone">{diff.before}</td>
                        <td className="py-1.5 font-semibold">{diff.after}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <ReviewButtons changeId={change.id} canApprove={canApproveNutritionChange(user, change.changedById)} />
            </li>
          );
        })}
      </ul>

      {history.length > 0 ? (
        <section aria-labelledby="log" className="mt-10">
          <h2 id="log" className="text-2xl">
            Review log
          </h2>
          <ul className="mt-3 divide-y divide-line rounded-brand bg-paper px-5 text-sm shadow-soft">
            {history.map((row) => (
              <li key={row.id} className="py-2.5">
                <strong>{row.ingredient.name}</strong>: {row.status === "APPROVED" ? "approved" : "rejected"} by {row.approvedBy?.name}, proposed by {row.changedBy.name}
                {row.reviewedAt ? ` on ${row.reviewedAt.toISOString().slice(0, 10)}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
