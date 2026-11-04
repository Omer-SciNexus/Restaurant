import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { MenuPage, type MenuSearch } from "../MenuPage";

type Props = { params: Promise<{ category: string }>; searchParams: Promise<MenuSearch> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const row = await prisma.category.findUnique({ where: { slug: category } });
  return { title: row?.name ?? "Menu", description: row?.description ?? undefined };
}

export default async function Page({ params, searchParams }: Props) {
  const { category } = await params;
  const row = await prisma.category.findUnique({ where: { slug: category } });
  if (!row || !row.isActive) notFound();
  return <MenuPage search={await searchParams} categorySlug={category} />;
}
