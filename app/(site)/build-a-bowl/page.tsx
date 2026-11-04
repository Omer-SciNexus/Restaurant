import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BowlBuilder } from "@/components/builder/BowlBuilder";
import { getCurrentUser } from "@/lib/auth";
import type { Allergen, Diet } from "@/lib/domain";
import { getBuilderDish } from "@/lib/menu";
import { getFallbackTimezone, getSelectedBranch } from "@/lib/selection";

export const metadata: Metadata = {
  title: "Build a bowl",
  description: "Choose a base, a protein, toppings and a dressing, with live price, calories and macros.",
};

export default async function BuildABowlPage() {
  const [selected, fallback, user] = await Promise.all([getSelectedBranch(), getFallbackTimezone(), getCurrentUser()]);
  const dish = await getBuilderDish(selected?.id ?? null, selected?.timezone ?? fallback);
  if (!dish) notFound();
  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6">
      <h1 className="text-4xl">Build your own bowl</h1>
      <p className="mt-2 max-w-2xl text-stone">Four steps. The price, calories and macros update as you choose.</p>
      <BowlBuilder dish={dish} branchSelected={Boolean(selected)} profile={user ? { diets: user.diets as Diet[], allergies: user.allergies as Allergen[] } : null} />
    </div>
  );
}
