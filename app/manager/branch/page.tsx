import type { Metadata } from "next";
import { BranchPeople } from "@/components/admin/BranchPeople";
import { ManagerBranchForm } from "@/components/admin/ManagerBranchForm";
import { BranchSwitcher } from "@/components/staff/BranchSwitcher";
import { MANAGER_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";
import { resolveStaffBranch } from "@/lib/branch-scope";
import { prisma } from "@/lib/db";
import { branchHours } from "@/lib/menu";

export const metadata: Metadata = { title: "Branch settings" };

export default async function ManagerBranchPage({ searchParams }: { searchParams: Promise<{ branch?: string }> }) {
  const user = await requirePageRole(MANAGER_ROLES, "/manager/branch");
  const { branch: slug } = await searchParams;
  // Managers are fixed to their own branch here, whatever the address asks for.
  const { branch, branches } = await resolveStaffBranch(user, slug);
  const people = await prisma.user.findMany({
    where: { branchId: branch.id, role: { in: ["STAFF", "DRIVER"] } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true },
  });

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl" data-testid="branch-name">
            {branch.name}
          </h1>
          <p className="mt-1 text-sm text-stone">
            {branch.address}, {branch.city}. Times are in {branch.timezone}.
          </p>
        </div>
        <BranchSwitcher action="/manager/branch" branches={branches} current={branch.slug} />
      </div>

      <p className="mt-4 rounded-brand bg-paper p-4 text-sm shadow-soft">
        {branch.onlineOrderingOpen ? "This branch is open for online orders." : "This branch is in-store only right now, and is not taking online orders."} An admin controls this switch, along with fees and tax.
      </p>

      <section aria-labelledby="settings" className="mt-6">
        <h2 id="settings" className="mb-3 text-2xl">
          Hours, delivery and tables
        </h2>
        <ManagerBranchForm
          branch={{
            id: branch.id,
            openingHours: branchHours(branch),
            deliveryRadiusKm: branch.deliveryRadiusKm,
            deliveryPolygon: branch.deliveryPolygon,
            tableCapacityPerSlot: branch.tableCapacityPerSlot,
          }}
        />
      </section>

      <section aria-labelledby="people" className="mt-8">
        <h2 id="people" className="mb-3 text-2xl">
          Staff and drivers
        </h2>
        <BranchPeople key={branch.id} branchId={branch.id} people={people.map((person) => ({ ...person, role: person.role as "STAFF" | "DRIVER" }))} />
      </section>
    </div>
  );
}
