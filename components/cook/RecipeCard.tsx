import Image from "next/image";
import Link from "next/link";
import { DIFFICULTY_LABEL, formatMinutes, type RecipeSummary } from "@/lib/recipe-rules";
import { DietTags } from "../ui/Tags";

export function RecipeCard({ recipe, priority }: { recipe: RecipeSummary; priority?: boolean }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-brand bg-paper shadow-soft">
      <div className="relative aspect-square overflow-hidden bg-oat-deep">
        {recipe.thumbnailUrl ? (
          <Image
            src={recipe.thumbnailUrl}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1280px) 280px, (min-width: 768px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <h3 className="text-lg leading-snug">
          {/* The whole card is clickable through this link's stretched area. */}
          <Link href={`/cook/${recipe.slug}`} className="after:absolute after:inset-0 hover:underline">
            {recipe.title}
          </Link>
        </h3>
        <p className="line-clamp-2 hidden text-sm text-stone sm:block">{recipe.description}</p>
        <DietTags diets={recipe.facts.diets.filter((d) => d === "VEGAN" || d === "VEGETARIAN" || d === "GLUTEN_FREE")} limit={2} />
        <p className="mt-auto flex items-baseline justify-between gap-2 pt-1 text-sm">
          <span className="font-semibold">{formatMinutes(recipe.totalMin)}</span>
          <span className="text-stone">{DIFFICULTY_LABEL[recipe.difficulty]}</span>
        </p>
      </div>
    </article>
  );
}
