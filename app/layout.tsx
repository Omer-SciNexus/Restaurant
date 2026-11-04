import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/domain";
import { siteUrl } from "@/lib/env";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${BRAND.name}: natural, healthy food`, template: `%s · ${BRAND.name}` },
  description: "Natural, healthy food with every ingredient, nutrition value and allergen shown. Order for pickup or delivery, or book a table.",
  manifest: "/manifest.webmanifest",
  openGraph: { images: ["/images/marketing/og-share.png"], siteName: BRAND.name, type: "website" },
};

export const viewport: Viewport = { themeColor: "#2f5d3a" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
