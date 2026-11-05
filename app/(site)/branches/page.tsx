import type { Metadata } from "next";
import Link from "next/link";
import { BranchMap } from "@/components/menu/BranchMap";
import { BranchPicker } from "@/components/menu/BranchPicker";
import { now } from "@/lib/env";
import { isOpenAt } from "@/lib/hours";
import { branchHours, getBranches } from "@/lib/menu";
import { getSelectedBranch } from "@/lib/selection";

export const metadata: Metadata = { title: "Branches", description: "Find your nearest Nature Food branch." };

export default async function BranchesPage() {
  const [branches, selected] = await Promise.all([getBranches(), getSelectedBranch()]);
  const at = now();
  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6">
      <h1 className="text-4xl">Our branches</h1>
      <p className="mb-6 mt-2 text-stone">Choose your branch to see its menu and order for pickup or delivery within 2 km.</p>
      <BranchPicker branches={branches.map((b) => ({ id: b.id, slug: b.slug, name: b.name, address: b.address }))} selectedSlug={selected?.slug} next="/menu" />
      <BranchMap branches={branches.map((b) => ({ slug: b.slug, name: b.name, lat: b.lat, lng: b.lng }))} />
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {branches.map((branch) => {
          const open = isOpenAt(branchHours(branch), at, branch.timezone);
          return (
            <li key={branch.id} className="rounded-brand bg-paper p-5 shadow-soft">
              <h2 className="text-xl">
                <Link href={`/branches/${branch.slug}`} className="hover:underline">
                  {branch.name}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-stone">
                {branch.address}, {branch.city}
              </p>
              <p className={`mt-2 text-sm font-medium ${open ? "text-forest" : "text-stone"}`}>{open ? "Open now" : "Closed now"}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
