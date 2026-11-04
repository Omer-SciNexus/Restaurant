import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@/lib/domain";
import { checkProfile, hasConflict, type DietProfile } from "@/lib/diet";
import type { DishSummary } from "@/lib/menu";
import { DietTags, SeasonalBadge, allergenNames } from "../ui/Tags";

export function DishCard({ dish, profile, priority }: { dish: DishSummary; profile?: DietProfile | null; priority?: boolean }) {
  const conflicts = profile ? checkProfile(dish.facts, profile) : null;
  const href = dish.isBuilder ? "/build-a-bowl" : `/dish/${dish.slug}`;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-brand bg-paper shadow-soft">
      <div className="relative aspect-square overflow-hidden bg-oat-deep">
        <Image
          src={dish.imageUrl}
          alt=""
          fill
          priority={priority}
          sizes="(min-width: 1280px) 280px, (min-width: 768px) 33vw, 50vw"
          className={`object-cover transition-transform duration-300 group-hover:scale-[1.03] ${dish.soldOut ? "opacity-50 grayscale" : ""}`}
        />
        <div className="absolute left-2 top-2 flex gap-1.5">
          {dish.isSeasonal ? <SeasonalBadge /> : null}
          {dish.soldOut ? <span className="rounded-full bg-bark px-2.5 py-1 text-xs font-medium text-white">Sold out</span> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <h3 className="text-lg leading-snug">
          {/* The whole card is clickable through this link's stretched area. */}
          <Link href={href} className="after:absolute after:inset-0 hover:underline">
            {dish.name}
          </Link>
        </h3>
        <p className="line-clamp-2 hidden text-sm text-stone sm:block">{dish.description}</p>
        <DietTags diets={dish.facts.diets.filter((d) => d === "VEGAN" || d === "VEGETARIAN" || d === "GLUTEN_FREE")} limit={2} />
        {conflicts && hasConflict(conflicts) ? (
          <p className="rounded-md bg-danger-soft px-2 py-1 text-xs text-danger" data-testid="profile-flag">
            {conflicts.contains.length > 0
              ? `Contains ${allergenNames(conflicts.contains)}`
              : conflicts.mayContain.length > 0
                ? `May contain ${allergenNames(conflicts.mayContain)}`
                : "Does not fit your diet profile"}
          </p>
        ) : null}
        <p className="mt-auto flex items-baseline justify-between pt-1 text-sm">
          <span className="font-semibold">
            {dish.isBuilder ? "From " : ""}
            {formatMoney(dish.priceCents)}
          </span>
          {dish.isBuilder ? null : <span className="text-stone">{dish.nutrition.kcal} kcal</span>}
        </p>
      </div>
    </article>
  );
}
