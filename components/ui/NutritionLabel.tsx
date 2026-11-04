import type { Nutrition } from "@/lib/nutrition";

/** Calories large, then the macros, as the brand kit describes. */
export function NutritionLabel({ nutrition, title = "Nutrition per serving" }: { nutrition: Nutrition; title?: string }) {
  const rows: [string, number, string][] = [
    ["Protein", nutrition.protein, "g"],
    ["Carbs", nutrition.carbs, "g"],
    ["Fat", nutrition.fat, "g"],
    ["Fibre", nutrition.fibre, "g"],
    ["Sugar", nutrition.sugar, "g"],
    ["Salt", nutrition.salt, "g"],
  ];
  return (
    <section aria-label={title} className="rounded-brand bg-sage p-5">
      <h2 className="font-body text-sm font-semibold">{title}</h2>
      <p className="mt-2 font-heading text-4xl" data-testid="kcal">
        {nutrition.kcal} <span className="font-body text-base font-normal">kcal</span>
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 sm:grid-cols-3">
        {rows.map(([label, value, unit]) => (
          <div key={label} className="flex justify-between border-t border-bark/15 py-1.5 text-sm">
            <dt>{label}</dt>
            <dd className="font-medium">
              {value} {unit}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Shown while any ingredient in a dish is still waiting for the nutritionist. */
export function UnverifiedNotice() {
  return (
    <p className="rounded-brand border border-honey bg-honey/15 p-3 text-sm">
      <strong>Draft data.</strong> These values are waiting for our nutritionist&apos;s check. If you have an allergy, please ask a member of staff before ordering.
    </p>
  );
}
