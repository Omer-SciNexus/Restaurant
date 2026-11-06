import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/site/DashboardShell";
import { MANAGER_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Branch", template: "%s · Manager" }, robots: { index: false } };

export default async function ManagerLayout({ children }: { children: ReactNode }) {
  const user = await requirePageRole(MANAGER_ROLES, "/manager/branch");
  return (
    <DashboardShell
      title="Manager"
      userName={user.name}
      nav={[
        { href: "/manager/branch", label: "Branch settings" },
        { href: "/staff/orders", label: "Orders" },
        { href: "/staff/reservations", label: "Reservations" },
        { href: "/staff/availability", label: "Sold out" },
        ...(user.role === "ADMIN" ? [{ href: "/admin", label: "Admin" }] : []),
      ]}
    >
      {children}
    </DashboardShell>
  );
}
