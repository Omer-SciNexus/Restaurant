import { BranchSwitcher } from "@/components/staff/BranchSwitcher";
import { OrderBoard } from "@/components/staff/OrderBoard";
import { STAFF_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";
import { resolveStaffBranch } from "@/lib/branch-scope";
import { isProduction } from "@/lib/env";
import { listBoardOrders, listBranchDrivers } from "@/lib/orders/staff";

export default async function StaffOrdersPage({ searchParams }: { searchParams: Promise<{ branch?: string }> }) {
  const user = await requirePageRole(STAFF_ROLES, "/staff/orders");
  const { branch: slug } = await searchParams;
  const { branch, branches } = await resolveStaffBranch(user, slug);
  const [orders, drivers] = await Promise.all([listBoardOrders(branch.id), listBranchDrivers(branch.id)]);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Orders · {branch.name}</h1>
        <BranchSwitcher action="/staff/orders" branches={branches} current={branch.slug} />
      </div>
      <OrderBoard key={branch.id} branchId={branch.id} initialOrders={orders} drivers={drivers} courierAvailable={!isProduction} />
    </>
  );
}
