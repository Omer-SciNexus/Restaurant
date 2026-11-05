import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/site/DashboardShell";
import { ADMIN_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requirePageRole(ADMIN_ROLES, "/admin");
  return (
    <DashboardShell
      title="Admin"
      userName={user.name}
      nav={[
        { href: "/admin", label: "Today" },
        { href: "/admin/orders", label: "Orders" },
        { href: "/admin/menu", label: "Menu" },
        { href: "/admin/ingredients", label: "Ingredients" },
        { href: "/admin/approvals", label: "Approvals" },
        { href: "/admin/suppliers", label: "Suppliers" },
        { href: "/admin/recipes", label: "Recipes" },
        { href: "/admin/events", label: "Events" },
        { href: "/admin/branches", label: "Branches" },
        { href: "/admin/users", label: "People" },
        { href: "/admin/settings", label: "Settings" },
        { href: "/staff/orders", label: "Order board" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
