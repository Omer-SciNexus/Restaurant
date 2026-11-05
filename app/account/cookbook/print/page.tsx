import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "@/components/account/PrintButton";
import { UnverifiedNotice } from "@/components/ui/NutritionLabel";
import { allergenNames } from "@/components/ui/Tags";
import { requirePageUser } from "@/lib/auth";
import { getCookbook } from "@/lib/cookbook";
import { formatGrams, formatMinutes } from "@/lib/recipes";

export const metadata: Metadata = { title: "Print my cookbook" };

/** Plain text on white. The account layout hides the site header, nav and footer when printing. */
export default async function CookbookPrintPage() {
  const user = await requirePageUser("/account/cookbook/print");
  const entries = await getCookbook(user.id);

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <PrintButton />
        <Link href="/account/cookbook" className="text-sm text-forest underline">
          Back to my cookbook
        </Link>
      </div>
      <h1 className="mt-6 text-4xl print:mt-0">My cookbook</h1>
      {entries.length === 0 ? <p className="mt-4 text-stone">Nothing saved yet.</p> : null}
      {entries.map(({ recipe, note }) => (
        <article key={recipe.id} className="mt-8 break-inside-avoid-page border-t border-line pt-6 print:break-before-page print:border-0 print:first-of-type:break-before-auto" data-testid="print-recipe">
          <h2 className="text-3xl">{recipe.title}</h2>
          <p className="mt-1 text-sm text-stone">
            Prep {formatMinutes(recipe.prepMin)}, cook {formatMinutes(recipe.cookMin)}. Serves {recipe.servings}.
          </p>
          <h3 className="mt-4 text-xl">Ingredients</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {recipe.ingredients.map((line) => (
              <li key={line.ingredientId}>
                {line.displayText} ({formatGrams(line.grams)})
              </li>
            ))}
          </ul>
          <h3 className="mt-4 text-xl">Method</h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            {recipe.steps.map((step) => (
              <li key={step.stepNo}>{step.text}</li>
            ))}
          </ol>
          <h3 className="mt-4 text-xl">Per serving</h3>
          <p className="mt-2 text-sm">
            {recipe.nutrition.kcal} kcal. Protein {recipe.nutrition.protein} g, carbs {recipe.nutrition.carbs} g, fat {recipe.nutrition.fat} g, fibre {recipe.nutrition.fibre} g, sugar {recipe.nutrition.sugar} g, salt {recipe.nutrition.salt} g.
          </p>
          <p className="mt-1 text-sm font-medium">{recipe.facts.allergens.length > 0 ? `Contains ${allergenNames(recipe.facts.allergens)}.` : "None of the nine major allergens in the listed ingredients."}</p>
          {recipe.facts.mayContain.length > 0 ? <p className="mt-1 text-sm">May contain {allergenNames(recipe.facts.mayContain)}.</p> : null}
          {recipe.verified ? null : (
            <div className="mt-3">
              <UnverifiedNotice />
            </div>
          )}
          {note ? (
            <>
              <h3 className="mt-4 text-xl">My notes</h3>
              <p className="mt-2 whitespace-pre-line">{note}</p>
            </>
          ) : null}
        </article>
      ))}
    </div>
  );
}
