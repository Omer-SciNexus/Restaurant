import Link from "next/link";
import { homeForRole } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { getSelectedBranch } from "@/lib/selection";
import { Logo } from "../ui/Logo";
import { CartLink } from "./CartLink";

const NAV = [
  { href: "/menu", label: "Menu" },
  { href: "/build-a-bowl", label: "Build a bowl" },
  { href: "/cook", label: "Cook at home" },
  { href: "/book", label: "Book a table" },
  { href: "/our-food", label: "Our food" },
];

export async function Header() {
  const [user, branch] = await Promise.all([getCurrentUser(), getSelectedBranch()]);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-oat/95 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-brand focus:bg-forest focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Nature Food home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="ml-6 hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-brand px-3 py-2 text-[15px] hover:bg-sage/60">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Link href="/branches" className="hidden min-h-11 items-center rounded-brand px-3 text-sm text-stone hover:bg-sage/60 sm:inline-flex">
            {branch ? (
              <>
                <span className="sr-only">Your branch: </span>
                {branch.name}
              </>
            ) : (
              "Choose a branch"
            )}
          </Link>
          <Link href={user ? homeForRole(user.role) : "/login"} className="hidden min-h-11 items-center rounded-brand px-3 text-[15px] hover:bg-sage/60 md:inline-flex">
            {user ? "Account" : "Sign in"}
          </Link>
          <CartLink />
        </div>
      </div>
      {/* On phones the same links scroll sideways under the logo, always one tap away. */}
      <nav aria-label="Main, small screens" className="flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden">
        {[...NAV, { href: "/branches", label: branch ? branch.name : "Branches" }, { href: user ? homeForRole(user.role) : "/login", label: user ? "Account" : "Sign in" }].map((item) => (
          <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-full px-3 py-2 text-sm hover:bg-sage/60">
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
