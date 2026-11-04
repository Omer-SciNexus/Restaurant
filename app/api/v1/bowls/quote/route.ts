import { NextResponse } from "next/server";
import { ApiError, handle, readJson } from "@/lib/api";
import { deriveFacts } from "@/lib/diet";
import { getBranchById, getBuilderDish } from "@/lib/menu";
import { roundNutrition, totalNutrition } from "@/lib/nutrition";
import { priceLine } from "@/lib/pricing";
import { DEFAULT_TIMEZONE } from "@/lib/selection";
import { bowlQuoteSchema } from "@/lib/validation/orders";

export const POST = handle(async (request: Request) => {
  const { branchId, optionIds } = bowlQuoteSchema.parse(await readJson(request));
  const branch = branchId ? await getBranchById(branchId) : null;
  const dish = await getBuilderDish(branch?.id ?? null, branch?.timezone ?? DEFAULT_TIMEZONE);
  if (!dish) throw new ApiError(404, "BUILDER_NOT_FOUND", "The bowl builder is not available.");

  const line = priceLine({ id: dish.id, name: dish.name, priceCents: dish.priceCents, isAvailable: !dish.soldOut, groups: dish.groups }, optionIds);
  const chosen = dish.groups.flatMap((group) => group.options).filter((option) => optionIds.includes(option.id));
  return NextResponse.json({
    priceCents: line.unitPriceCents,
    nutrition: roundNutrition(totalNutrition(chosen.map((option) => ({ grams: option.grams, per100g: option.per100g })))),
    facts: deriveFacts(chosen.map((option) => option.facts)),
  });
});
