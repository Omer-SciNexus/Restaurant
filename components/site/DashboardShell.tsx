import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/lib/auth";
import { Logo } from "../ui/Logo";

export type NavItem = { href: string; label: string };

/** Shared frame for staff, driver, manager and admin screens. */
export function DashboardShell({ title, nav, userName, children }: { title: string; nav: NavItem[]; userName?: string | null; children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex min-h-16 max-w-[96rem] flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2">
          <Link href="/" aria-label="Back to the Nature Food site">
            <Logo />
          </Link>
          <span className="text-sm font-medium text-stone">{title}</span>
          <nav aria-label={title} className="flex flex-wrap gap-1">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-brand px-3 py-2 text-sm hover:bg-sage/60">
                {item.label}
              </Link>
            ))}
          </nav>
          <form
            className="ml-auto flex items-center gap-3"
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <span className="text-sm text-stone">{userName}</span>
            <button type="submit" className="min-h-9 rounded-brand px-3 text-sm text-forest hover:bg-sage/60">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[96rem] px-4 py-6">
        {children}
      </main>
    </div>
  );
}
