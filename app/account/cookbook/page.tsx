import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CookbookNote } from "@/components/account/CookbookNote";
import { buttonClass, LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { requirePageUser } from "@/lib/auth";
import { getCookbook } from "@/lib/cookbook";
import { formatMinutes } from "@/lib/recipes";

export const metadata: Metadata = { title: "My cookbook" };

export default async function CookbookPage() {
  const user = await requirePageUser("/account/cookbook");
  const entries = await getCookbook(user.id);

  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl">My cookbook</h1>
      {entries.length === 0 ? (
        <EmptyState image="/images/illustrations/cookbook-empty.png" title="Nothing saved yet">
          <p>Save a recipe from Cook at home and it stays here, ready to print or take with you as a PDF.</p>
          <LinkButton href="/cook" className="mt-4">
            Find a recipe
          </LinkButton>
        </EmptyState>
      ) : (
        <>
          <p className="mt-2 text-stone">Your saved recipes and notes. Only you can see them.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {/* A plain link: this downloads a file instead of opening a page in the app. */}
            <a href="/api/v1/me/cookbook.pdf" download className={buttonClass("primary", "md")}>
              Download PDF
            </a>
            <LinkButton href="/account/cookbook/print" variant="secondary">
              Print view
            </LinkButton>
          </div>
          <ul className="mt-6 space-y-4">
            {entries.map(({ recipe, note }) => (
              <li key={recipe.id} className="rounded-brand bg-paper p-4 shadow-soft" data-testid="cookbook-entry">
                <div className="flex gap-4">
                  {recipe.thumbnailUrl ? (
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-brand bg-oat-deep sm:h-24 sm:w-24">
                      <Image src={recipe.thumbnailUrl} alt="" fill sizes="96px" className="object-cover" />
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    <h2 className="text-xl leading-snug">
                      <Link href={`/cook/${recipe.slug}`} className="hover:underline">
                        {recipe.title}
                      </Link>
                    </h2>
                    <p className="mt-1 text-sm text-stone">
                      {formatMinutes(recipe.totalMin)}. Serves {recipe.servings}.
                    </p>
                  </div>
                </div>
                <CookbookNote recipeId={recipe.id} title={recipe.title} note={note} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
