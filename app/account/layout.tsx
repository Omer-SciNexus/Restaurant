import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AccountNav } from "@/components/account/AccountNav";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { requirePageUser } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Your account", template: "%s · Your account" }, robots: { index: false } };

export default async function AccountLayout({ children }: { children: ReactNode }) {
  await requirePageUser("/account");
  return (
    <>
      <div className="contents print:hidden">
        <Header />
      </div>
      <main id="main" className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 print:p-0">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10 print:block">
          <div className="min-w-0 print:hidden">
            <AccountNav />
          </div>
          <div className="min-w-0">{children}</div>
        </div>
      </main>
      <div className="contents print:hidden">
        <Footer />
      </div>
    </>
  );
}
