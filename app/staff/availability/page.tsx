import { AvailabilityList } from "@/components/staff/AvailabilityList";
import { BranchSwitcher } from "@/components/staff/BranchSwitcher";
import { hasRole, MANAGER_ROLES, STAFF_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";
import { resolveStaffBranch } from "@/lib/branch-scope";
import { prisma } from "@/lib/db";

export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<{ branch?: string }> }) {
  const user = await requirePageRole(STAFF_ROLES, "/staff/availability");
  const { branch: slug } = await searchParams;
  const { branch, branches } = await resolveStaffBranch(user, slug);
  const [categories, branchRows] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: { items: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } } },
    }),
    prisma.branchMenuItem.findMany({ where: { branchId: branch.id, OR: [{ isAvailable: false }, { isHidden: true }] }, select: { menuItemId: true, isAvailable: true, isHidden: true } }),
  ]);
  const canHide = hasRole(user, MANAGER_ROLES);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl">Sold out · {branch.name}</h1>
          <p className="mt-1 text-sm text-stone">
            Guests see a change straight away, and sold-out dishes cannot be ordered.
            {canHide ? " Hidden dishes leave this branch's menu until you turn them back on; other branches are not affected." : ""}
          </p>
        </div>
        <BranchSwitcher action="/staff/availability" branches={branches} current={branch.slug} />
      </div>
      <AvailabilityList
        branchId={branch.id}
        categories={categories.filter((c) => c.items.length > 0)}
        soldOutIds={branchRows.filter((row) => !row.isAvailable).map((row) => row.menuItemId)}
        hiddenIds={branchRows.filter((row) => row.isHidden).map((row) => row.menuItemId)}
        canHide={canHide}
      />
    </>
  );
}
