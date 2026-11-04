import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <main id="main" className="flex flex-col px-4 py-8 sm:px-10">
        <Link href="/" aria-label="Nature Food home" className="self-start">
          <Logo />
        </Link>
        <div className="mx-auto my-auto w-full max-w-sm py-10">{children}</div>
      </main>
      <div className="relative hidden lg:block">
        <Image src="/images/hero/hero-market-desktop.png" alt="" fill priority sizes="50vw" className="object-cover" />
      </div>
    </div>
  );
}
