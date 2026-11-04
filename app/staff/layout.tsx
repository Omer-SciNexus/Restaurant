import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/site/DashboardShell";
import { STAFF_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Staff", robots: { index: false } };

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const user = await requirePageRole(STAFF_ROLES, "/staff/orders");
  return (
    <DashboardShell
      title="Staff"
      userName={user.name}
      nav={[
        { href: "/staff/orders", label: "Orders" },
        { href: "/staff/reservations", label: "Reservations" },
        { href: "/staff/waitlist", label: "Waitlist" },
        { href: "/staff/availability", label: "Sold out" },
        ...(user.role !== "STAFF" ? [{ href: "/manager/branch", label: "Branch settings" }] : []),
        ...(user.role === "ADMIN" ? [{ href: "/admin", label: "Admin" }] : []),
      ]}
    >
      {children}
    </DashboardShell>
  );
}
