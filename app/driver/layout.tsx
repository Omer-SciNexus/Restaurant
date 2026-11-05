import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/site/DashboardShell";
import { DRIVER_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Driver", robots: { index: false } };

export default async function DriverLayout({ children }: { children: ReactNode }) {
  const user = await requirePageRole(DRIVER_ROLES, "/driver");
  return (
    <DashboardShell title="Driver" userName={user.name} nav={[{ href: "/driver", label: "My deliveries" }]}>
      {children}
    </DashboardShell>
  );
}
