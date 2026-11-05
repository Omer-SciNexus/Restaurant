import type { Metadata } from "next";
import Link from "next/link";
import { AllBranchesSwitch, OrderingSwitch } from "@/components/admin/OrderingSwitch";
import { ADMIN_ROLES } from "@/lib/access";
import { bpsToPercent } from "@/lib/admin/money";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/domain";

export const metadata: Metadata = { title: "Branches" };

export default async function AdminBranchesPage() {
  await requirePageRole(ADMIN_ROLES, "/admin/branches");
  // Read directly rather than through the cached list, so the switches always show the truth.
  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl">Branches</h1>
      <p className="mt-1 text-sm text-stone">If ordering fails, switch a branch to in-store only here. It applies to the next order, and guests see a clear message at checkout.</p>

      <div className="mt-4">
        <AllBranchesSwitch branchCount={branches.length} />
      </div>

      <ul className="mt-4 space-y-3">
        {branches.map((branch) => (
          <li key={branch.id} className="rounded-brand bg-paper p-4 shadow-soft" data-testid={`branch-${branch.slug}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl">
                  <Link href={`/admin/branches/${branch.id}`} className="hover:underline">
                    {branch.name}
                  </Link>
                </h2>
                <p className="text-xs text-stone">
                  {branch.deliveryPolygon ? "Drawn delivery zone" : `${branch.deliveryRadiusKm} km delivery`}, {formatMoney(branch.deliveryFeeCents)} fee, {formatMoney(branch.minOrderCents)} minimum, {bpsToPercent(branch.taxRateBps)}% tax, {branch.tableCapacityPerSlot} seats per slot
                </p>
              </div>
              <OrderingSwitch branchId={branch.id} branchName={branch.name} open={branch.onlineOrderingOpen} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
