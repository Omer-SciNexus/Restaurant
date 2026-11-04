import type { Metadata } from "next";
import { MenuPage, type MenuSearch } from "./MenuPage";

export const metadata: Metadata = { title: "Menu" };

export default async function Page({ searchParams }: { searchParams: Promise<MenuSearch> }) {
  return <MenuPage search={await searchParams} />;
}
