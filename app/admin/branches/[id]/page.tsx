import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BranchForm } from "@/components/admin/BranchForm";
import { OrderingSwitch } from "@/components/admin/OrderingSwitch";
import { ADMIN_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { branchHours } from "@/lib/menu";

export const metadata: Metadata = { title: "Edit branch" };

export default async function AdminBranchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePageRole(ADMIN_ROLES, `/admin/branches/${id}`);
  const branch = await prisma.branch.findUnique({ where: { id } });
  if (!branch) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/branches" className="text-sm text-forest underline">
        All branches
      </Link>
      <h1 className="mt-2 text-3xl">{branch.name}</h1>
      <p className="mb-4 mt-1 text-sm text-stone">
        {branch.address}, {branch.city}. Times are in {branch.timezone}.
      </p>
      <div className="mb-4 rounded-brand bg-paper p-4 shadow-soft">
        <OrderingSwitch branchId={branch.id} branchName={branch.name} open={branch.onlineOrderingOpen} />
      </div>
      <BranchForm
        branch={{
          id: branch.id,
          openingHours: branchHours(branch),
          deliveryRadiusKm: branch.deliveryRadiusKm,
          deliveryPolygon: branch.deliveryPolygon,
          tableCapacityPerSlot: branch.tableCapacityPerSlot,
          deliveryFeeCents: branch.deliveryFeeCents,
          minOrderCents: branch.minOrderCents,
          taxRateBps: branch.taxRateBps,
        }}
      />
    </div>
  );
}
