import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecipeFactsPanel } from "@/components/cook/RecipeFactsPanel";
import { IngredientPanel, RecipeKitchen, RecipeVideo, StartCookingLink, StepList, VideoComingSoon } from "@/components/cook/RecipeKitchen";
import { SaveToCookbook } from "@/components/cook/SaveToCookbook";
import { ShareRecipe } from "@/components/cook/ShareRecipe";
import { LinkButton } from "@/components/ui/Button";
import { ADMIN_ROLES, hasRole } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { isInCookbook } from "@/lib/cookbook";
import type { Allergen, Diet } from "@/lib/domain";
import { DIFFICULTY_LABEL, formatMinutes, getPublishedRecipe, getRecipeForAdminPreview, recipeCategoryLabel } from "@/lib/recipes";

type Props = { params: Promise<{ slug: string }> };

/** Guests only ever see published recipes. Admins can also open a draft to check it. */
async function load(slug: string) {
  const published = await getPublishedRecipe(slug);
  if (published) return published;
  const user = await getCurrentUser();
  return user && hasRole(user, ADMIN_ROLES) ? getRecipeForAdminPreview(slug) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await load(slug);
  return recipe
    ? { title: recipe.title, description: recipe.description, openGraph: { images: recipe.thumbnailUrl ? [recipe.thumbnailUrl] : [] } }
    : { title: "Recipe not found" };
}

export default async function RecipePage({ params }: Props) {
  const { slug } = await params;
  const recipe = await load(slug);
  if (!recipe) notFound();
  const user = await getCurrentUser();
  const saved = user ? await isInCookbook(user.id, recipe.id) : false;
  const category = recipeCategoryLabel(recipe.category);
  const facts: [string, string][] = [
    ["Prep", formatMinutes(recipe.prepMin)],
    ["Cook", formatMinutes(recipe.cookMin)],
    ["Difficulty", DIFFICULTY_LABEL[recipe.difficulty]],
  ];

  return (
    <RecipeKitchen baseServings={recipe.servings} hasVideo={recipe.hasVideo}>
      <div className="mx-auto max-w-5xl px-4 pb-10 pt-6 sm:px-6">
        <nav aria-label="Breadcrumb" className="text-sm text-stone">
          <Link href="/cook" className="hover:underline">
            Cook at home
          </Link>
          {category && recipe.category ? (
            <>
              <span aria-hidden="true"> / </span>
              <Link href={`/cook?category=${recipe.category}`} className="hover:underline">
                {category}
              </Link>
            </>
          ) : null}
        </nav>

        {recipe.status === "DRAFT" ? (
          <p role="status" className="mt-3 rounded-brand bg-honey/20 p-3 text-sm">
            This recipe is a draft. Only admins can see it.
          </p>
        ) : null}

        <h1 className="mt-3 text-4xl leading-tight">{recipe.title}</h1>
        <p className="mt-3 max-w-3xl text-stone">{recipe.description}</p>
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {facts.map(([label, value]) => (
            <div key={label} className="flex gap-1.5">
              <dt className="text-stone">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5">
          {recipe.video ? (
            <RecipeVideo
              title={recipe.title}
              thumbnailUrl={recipe.thumbnailUrl}
              playbackId={recipe.video.playbackId}
              captionsUrl={recipe.video.captionsUrl}
              durationSec={recipe.video.durationSec}
              steps={recipe.steps}
            />
          ) : (
            <VideoComingSoon title={recipe.title} thumbnailUrl={recipe.thumbnailUrl} />
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <StartCookingLink slug={recipe.slug} />
          <SaveToCookbook recipeId={recipe.id} slug={recipe.slug} signedIn={Boolean(user)} initiallySaved={saved} />
          <ShareRecipe title={recipe.title} />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <IngredientPanel ingredients={recipe.ingredients} />
          </div>
          <StepList steps={recipe.steps} />
        </div>

        {recipe.transcript ? (
          <details className="mt-8 rounded-brand bg-paper p-4 shadow-soft">
            <summary className="cursor-pointer font-medium">Video transcript</summary>
            <p className="mt-3 whitespace-pre-line text-sm">{recipe.transcript}</p>
          </details>
        ) : null}

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <RecipeFactsPanel
            facts={recipe.facts}
            nutrition={recipe.nutrition}
            verified={recipe.verified}
            profile={user ? { diets: user.diets as Diet[], allergies: user.allergies as Allergen[] } : null}
          />
          {recipe.dish ? (
            <section aria-label="Order this dish" className="self-start rounded-brand bg-oat-deep p-5">
              <p className="text-sm">We make {recipe.dish.name} in our kitchens too. Have it ready for pickup or delivered from your branch.</p>
              <LinkButton href={`/dish/${recipe.dish.slug}`} className="mt-4">
                Too busy? Order it
              </LinkButton>
            </section>
          ) : null}
        </div>
      </div>
    </RecipeKitchen>
  );
}
