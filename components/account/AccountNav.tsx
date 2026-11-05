"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/account", label: "Profile" },
  { href: "/account/diet", label: "Diet and allergies" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/bookings", label: "Bookings" },
  { href: "/account/cookbook", label: "My cookbook" },
];

/** Tabs that scroll sideways on a phone, and a sidebar from large screens up. */
export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Your account">
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
        {LINKS.map((link) => {
          const current = link.href === "/account" ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-11 items-center whitespace-nowrap rounded-brand px-3 text-[15px] ${current ? "bg-forest font-medium text-white" : "hover:bg-sage/60"}`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
