import { handle } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { getCookbook } from "@/lib/cookbook";
import { buildCookbookPdf } from "@/lib/cookbook-pdf";

export const GET = handle(async () => {
  const user = await requireApiUser();
  const entries = await getCookbook(user.id);
  const bytes = await buildCookbookPdf(
    entries.map(({ note, recipe }) => ({
      title: recipe.title,
      description: recipe.description,
      prepMin: recipe.prepMin,
      cookMin: recipe.cookMin,
      servings: recipe.servings,
      note,
      verified: recipe.verified,
      nutrition: recipe.nutrition,
      allergens: recipe.facts.allergens,
      mayContain: recipe.facts.mayContain,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
    })),
    user.name,
  );
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="nature-food-cookbook.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
});
