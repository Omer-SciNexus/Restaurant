import { checkProfile, hasConflict, type DietProfile, type DishFacts } from "@/lib/diet";
import type { Nutrition } from "@/lib/nutrition";
import { NutritionLabel, UnverifiedNotice } from "../ui/NutritionLabel";
import { AllergenList, DietTags, allergenNames } from "../ui/Tags";

/** Nutrition, allergens and the profile warning, shared by the dish page and the bowl builder. */
export function DishFactsPanel({
  facts,
  nutrition,
  verified,
  profile,
}: {
  facts: DishFacts;
  nutrition: Nutrition;
  verified: boolean;
  profile: DietProfile | null;
}) {
  const conflicts = profile ? checkProfile(facts, profile) : null;
  return (
    <div className="space-y-4">
      <DietTags diets={facts.diets} />
      {conflicts && hasConflict(conflicts) ? (
        <div role="alert" className="rounded-brand border border-danger/40 bg-danger-soft p-3 text-sm text-danger" data-testid="profile-warning">
          <strong>Check before ordering.</strong>
          {conflicts.contains.length > 0 ? <span> Contains {allergenNames(conflicts.contains)}, which is in your allergy profile.</span> : null}
          {conflicts.mayContain.length > 0 ? <span> May contain {allergenNames(conflicts.mayContain)}.</span> : null}
          {conflicts.unmetDiets.length > 0 ? <span> Does not fit your saved diet.</span> : null}
        </div>
      ) : null}
      <NutritionLabel nutrition={nutrition} />
      <section aria-label="Allergens">
        <h2 className="font-body text-sm font-semibold">Allergens</h2>
        <div className="mt-2">{facts.allergens.length > 0 ? <AllergenList allergens={facts.allergens} /> : <p className="text-sm text-stone">None of the nine major allergens in the recipe.</p>}</div>
        {facts.mayContain.length > 0 ? <p className="mt-2 text-sm">May contain: {allergenNames(facts.mayContain)}.</p> : null}
        <p className="mt-2 text-xs text-stone">Our kitchens share equipment, so traces of any allergen are possible. Please tell staff about allergies.</p>
      </section>
      {verified ? null : <UnverifiedNotice />}
    </div>
  );
}
