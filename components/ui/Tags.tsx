import Image from "next/image";
import { ALLERGEN_INFO, DIET_INFO, type Allergen, type Diet } from "@/lib/domain";

export function DietTag({ diet }: { diet: Diet }) {
  const info = DIET_INFO[diet];
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sage px-2.5 py-1 text-xs font-medium text-bark">
      <Image src={info.icon} alt="" width={16} height={16} className="h-4 w-4" />
      {info.label}
    </span>
  );
}

export function DietTags({ diets, limit }: { diets: readonly Diet[]; limit?: number }) {
  const shown = limit ? diets.slice(0, limit) : diets;
  if (shown.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {shown.map((diet) => (
        <li key={diet}>
          <DietTag diet={diet} />
        </li>
      ))}
      {limit && diets.length > limit ? <li className="self-center text-xs text-stone">+{diets.length - limit}</li> : null}
    </ul>
  );
}

export function AllergenList({ allergens }: { allergens: readonly Allergen[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2">
      {allergens.map((allergen) => (
        <li key={allergen} className="flex items-center gap-1.5 text-sm font-semibold">
          <Image src={ALLERGEN_INFO[allergen].icon} alt="" width={20} height={20} className="h-5 w-5" />
          {ALLERGEN_INFO[allergen].label}
        </li>
      ))}
    </ul>
  );
}

export function SeasonalBadge() {
  return <span className="rounded-full bg-terracotta px-2.5 py-1 text-xs font-medium text-white">Seasonal</span>;
}

export function allergenNames(allergens: readonly Allergen[]): string {
  return allergens.map((allergen) => ALLERGEN_INFO[allergen].label.toLowerCase()).join(", ");
}
