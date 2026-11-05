import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { ADMIN_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requirePageRole(ADMIN_ROLES, "/admin/settings");
  const settings = await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl">Settings</h1>
      <p className="mb-4 mt-1 rounded-brand bg-honey/20 p-3 text-sm">
        <strong>These are the owner&apos;s decisions.</strong> The plan leaves them open, so the values here are placeholders until the owner has confirmed each one. They apply to new orders and bookings as soon as they are saved.
      </p>
      <SettingsForm settings={settings} />
    </div>
  );
}
