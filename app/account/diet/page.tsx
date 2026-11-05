import type { Metadata } from "next";
import { DietForm } from "@/components/account/DietForm";
import { requirePageUser } from "@/lib/auth";
import type { Allergen, Diet } from "@/lib/domain";

export const metadata: Metadata = { title: "Diet and allergies" };

export default async function DietPage() {
  const user = await requirePageUser("/account/diet");
  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl">Diet and allergies</h1>
      <p className="mt-2 text-stone">Tell us what you eat and what you avoid. Menu cards then flag any dish that does not fit, before you reach checkout.</p>
      <DietForm diets={user.diets as Diet[]} allergies={user.allergies as Allergen[]} />
    </div>
  );
}
