import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { getCookbook, removeFromCookbook, saveToCookbook } from "@/lib/cookbook";
import { cookbookRemoveSchema, cookbookSaveSchema } from "@/lib/validation/account";

export const GET = handle(async () => {
  const user = await requireApiUser();
  return NextResponse.json({ entries: await getCookbook(user.id) });
});

/** Saves a recipe, or updates the note on one already saved. */
export const POST = handle(async (request: Request) => {
  const user = await requireApiUser();
  const { recipeId, note } = cookbookSaveSchema.parse(await readJson(request));
  return NextResponse.json({ entry: await saveToCookbook(user.id, recipeId, note) }, { status: 201 });
});

export const DELETE = handle(async (request: Request) => {
  const user = await requireApiUser();
  const { recipeId } = cookbookRemoveSchema.parse({ recipeId: new URL(request.url).searchParams.get("recipeId") });
  return NextResponse.json({ removed: await removeFromCookbook(user.id, recipeId) });
});
