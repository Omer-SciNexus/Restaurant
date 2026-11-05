import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderDetail } from "@/components/staff/OrderDetail";
import { canAccessBranch, STAFF_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";
import { isProduction } from "@/lib/env";
import { listBranchDrivers, loadStaffOrder } from "@/lib/orders/staff";

export const metadata: Metadata = { title: "Order" };

export default async function StaffOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageRole(STAFF_ROLES, `/staff/orders/${id}`);
  const order = await loadStaffOrder(id);
  // Another branch's order looks exactly like one that does not exist.
  if (!order || !canAccessBranch(user, order.board.branchId)) notFound();
  const drivers = await listBranchDrivers(order.board.branchId);

  return (
    <div className="max-w-4xl">
      <Link href="/staff/orders" className="text-sm text-forest underline">
        Back to the board
      </Link>
      <OrderDetail initialOrder={order} drivers={drivers} courierAvailable={!isProduction} />
    </div>
  );
}
