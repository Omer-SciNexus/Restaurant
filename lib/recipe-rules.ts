// Cook at home rules as plain functions: servings scaling, US or metric display, library
// filters, chapters and step timers. This file is free of server imports so the recipe page's
// client components can use it too; lib/recipes.ts re-exports it alongside the database reads.

import { DIET_INFO, type Diet } from "./domain";
import type { DishFacts } from "./diet";
import type { Nutrition } from "./nutrition";

// ---- Servings

export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 6;

export function clampServings(value: number): number {
  if (!Number.isFinite(value)) return MIN_SERVINGS;
  return Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, Math.round(value)));
}

export function scaleFactor(baseServings: number, servings: number): number {
  if (!(baseServings > 0)) throw new RangeError(`Invalid recipe servings: ${baseServings}`);
  return clampServings(servings) / baseServings;
}

// ---- Reading a display text such as "1 1/2 cups cooked quinoa"

export type UnitSystem = "us" | "metric";

type UnitForms = { one: string; many: string; weightOrVolume?: boolean };

const CUP: UnitForms = { one: "cup", many: "cups" };
const TBSP: UnitForms = { one: "tbsp", many: "tbsp" };
const TSP: UnitForms = { one: "tsp", many: "tsp" };
const OUNCE: UnitForms = { one: "oz", many: "oz" };
const POUND: UnitForms = { one: "lb", many: "lb" };
const PINCH: UnitForms = { one: "pinch", many: "pinches" };
const HANDFUL: UnitForms = { one: "handful", many: "handfuls" };
const CLOVE: UnitForms = { one: "clove", many: "cloves" };
const SLICE: UnitForms = { one: "slice", many: "slices" };
const SPRIG: UnitForms = { one: "sprig", many: "sprigs" };
const CAN: UnitForms = { one: "can", many: "cans" };
const STALK: UnitForms = { one: "stalk", many: "stalks" };
const BUNCH: UnitForms = { one: "bunch", many: "bunches" };
const GRAM: UnitForms = { one: "g", many: "g", weightOrVolume: true };
const KILOGRAM: UnitForms = { one: "kg", many: "kg", weightOrVolume: true };
const MILLILITRE: UnitForms = { one: "ml", many: "ml", weightOrVolume: true };
const LITRE: UnitForms = { one: "l", many: "l", weightOrVolume: true };

const UNITS: Record<string, UnitForms> = {
  cup: CUP, cups: CUP,
  tbsp: TBSP, tablespoon: TBSP, tablespoons: TBSP,
  tsp: TSP, teaspoon: TSP, teaspoons: TSP,
  oz: OUNCE, ounce: OUNCE, ounces: OUNCE,
  lb: POUND, lbs: POUND, pound: POUND, pounds: POUND,
  pinch: PINCH, pinches: PINCH,
  handful: HANDFUL, handfuls: HANDFUL,
  clove: CLOVE, cloves: CLOVE,
  slice: SLICE, slices: SLICE,
  sprig: SPRIG, sprigs: SPRIG,
  can: CAN, cans: CAN,
  stalk: STALK, stalks: STALK,
  bunch: BUNCH, bunches: BUNCH,
  g: GRAM, gram: GRAM, grams: GRAM,
  kg: KILOGRAM,
  ml: MILLILITRE,
  l: LITRE,
};

/** Whole things counted without a unit, so "1 lemon" becomes "2 lemons" when scaled. */
const COUNT_NOUNS: [one: string, many: string][] = [
  ["avocado", "avocados"],
  ["banana", "bananas"],
  ["cucumber", "cucumbers"],
  ["date", "dates"],
  ["egg", "eggs"],
  ["fillet", "fillets"],
  ["lemon", "lemons"],
  ["lime", "limes"],
  ["onion", "onions"],
  ["orange", "oranges"],
  ["potato", "potatoes"],
  ["radish", "radishes"],
  ["slice", "slices"],
  ["tomato", "tomatoes"],
  ["tortilla", "tortillas"],
];

export type ParsedAmount = {
  quantity: number | null;
  unit: UnitForms | null;
  /** Everything after the measure, for example "cooked quinoa". */
  rest: string;
};

function parseQuantity(raw: string): number {
  return raw
    .trim()
    .split(/\s+/)
    .reduce((sum, part) => {
      const [top, bottom] = part.split("/");
      return sum + (bottom ? Number(top) / Number(bottom) : Number(top));
    }, 0);
}

export function parseDisplayText(text: string): ParsedAmount {
  const trimmed = text.trim();
  const match = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s+(.+)$/.exec(trimmed);
  const [amount, afterAmount] = [match?.[1], match?.[2]];
  if (!amount || !afterAmount) return { quantity: null, unit: null, rest: trimmed };
  const quantity = parseQuantity(amount);
  if (!(quantity > 0)) return { quantity: null, unit: null, rest: trimmed };
  const [first = "", ...others] = afterAmount.split(/\s+/);
  const unit = UNITS[first.toLowerCase().replace(/\.$/, "")];
  if (!unit) return { quantity, unit: null, rest: afterAmount };
  return { quantity, unit, rest: others.join(" ").replace(/^of\s+/i, "") };
}

// ---- Showing an amount

const SMALLEST_FRACTION: [value: number, label: string] = [1 / 8, "1/8"];
const FRACTIONS: [value: number, label: string][] = [
  SMALLEST_FRACTION,
  [1 / 4, "1/4"],
  [1 / 3, "1/3"],
  [1 / 2, "1/2"],
  [2 / 3, "2/3"],
  [3 / 4, "3/4"],
];

/** Snaps to the fractions on a measuring cup. A real amount never rounds down to nothing. */
function snapQuantity(value: number): { whole: number; fraction: string | null; plural: boolean } {
  let whole = Math.floor(value + 1e-9);
  const remainder = value - whole;
  let best: [number, string | null] = [0, null];
  let bestGap = remainder;
  for (const [fractionValue, label] of FRACTIONS) {
    const gap = Math.abs(remainder - fractionValue);
    if (gap < bestGap) [best, bestGap] = [[fractionValue, label], gap];
  }
  if (1 - remainder < bestGap) {
    whole += 1;
    best = [0, null];
  }
  if (whole === 0 && best[1] === null) best = SMALLEST_FRACTION;
  return { whole, fraction: best[1], plural: whole + best[0] > 1 };
}

/** 1.5 becomes "1 1/2". */
export function formatQuantity(value: number): string {
  if (!(value > 0)) return "0";
  const { whole, fraction } = snapQuantity(value);
  if (whole === 0) return fraction!;
  return fraction ? `${whole} ${fraction}` : String(whole);
}

function withNoun(rest: string, plural: boolean): string {
  const comma = rest.indexOf(",");
  const head = comma === -1 ? rest : rest.slice(0, comma);
  const tail = comma === -1 ? "" : rest.slice(comma);
  for (const [one, many] of COUNT_NOUNS) {
    const pattern = new RegExp(`\\b(${one}|${many})\\b`, "i");
    if (pattern.test(head)) return head.replace(pattern, plural ? many : one) + tail;
  }
  return rest;
}

export function gramsToOunces(grams: number): number {
  return grams / 28.3495;
}

/** Metric weights, rounded as a kitchen scale would be read. */
export function formatGrams(grams: number): string {
  if (grams >= 1000) return `${Number((grams / 1000).toFixed(2))} kg`;
  if (grams >= 100) return `${Math.round(grams / 5) * 5} g`;
  return `${Math.max(1, Math.round(grams))} g`;
}

/** US weights for lines that have no cup or spoon measure. */
export function formatOunces(grams: number): string {
  const ounces = gramsToOunces(grams);
  return ounces >= 16 ? `${formatQuantity(ounces / 16)} lb` : `${formatQuantity(ounces)} oz`;
}

function joinAmount(amount: string, rest: string): string {
  return rest ? `${amount} ${rest}` : amount;
}

export type IngredientLine = { displayText: string; grams: number };

/**
 * One line of the ingredient list. US units scale the measure in the display text; metric
 * uses the weighed grams, the same figure the nutrition is calculated from.
 */
export function formatIngredient(line: IngredientLine, factor: number, units: UnitSystem): string {
  const { quantity, unit, rest } = parseDisplayText(line.displayText);
  const grams = line.grams * factor;

  if (units === "metric") {
    if (!(grams > 0)) return line.displayText;
    const name = quantity !== null && !unit ? withNoun(rest, false) : rest;
    return joinAmount(formatGrams(grams), name);
  }

  // Typed in grams or millilitres, or with no amount at all: show the weight in US units.
  if (quantity === null || unit?.weightOrVolume) return grams > 0 ? joinAmount(formatOunces(grams), rest) : line.displayText;

  const scaled = quantity * factor;
  const { plural } = snapQuantity(scaled);
  if (unit) return joinAmount(`${formatQuantity(scaled)} ${plural ? unit.many : unit.one}`, rest);
  return joinAmount(formatQuantity(scaled), withNoun(rest, plural));
}

// ---- Time and difficulty

export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { EASY: "Easy", MEDIUM: "Medium", HARD: "Hard" };

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

// ---- Library categories. The plan's five groups are worked out from the linked dish.

export const RECIPE_CATEGORIES = [
  { slug: "bowls-salads", label: "Bowls and salads" },
  { slug: "breakfast", label: "Breakfast" },
  { slug: "natural-classics", label: "Natural classics" },
  { slug: "drinks", label: "Drinks" },
  { slug: "treats", label: "Treats" },
] as const;
export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number]["slug"];

const CATEGORY_BY_MENU_SECTION: Record<string, RecipeCategory> = {
  bowls: "bowls-salads",
  "build-your-own": "bowls-salads",
  salads: "bowls-salads",
  breakfast: "breakfast",
  "juices-smoothies": "drinks",
  "coffee-tea": "drinks",
  drinks: "drinks",
  sweets: "treats",
  treats: "treats",
};

/** Every other menu section is a natural classic. A recipe with no linked dish has no group. */
export function recipeCategory(menuCategorySlug: string | null | undefined): RecipeCategory | null {
  if (!menuCategorySlug) return null;
  return CATEGORY_BY_MENU_SECTION[menuCategorySlug] ?? "natural-classics";
}

export function recipeCategoryLabel(category: RecipeCategory | null): string | null {
  return RECIPE_CATEGORIES.find((entry) => entry.slug === category)?.label ?? null;
}

// ---- Library filters

export type RecipeSummary = {
  id: string;
  slug: string;
  title: string;
  description: string;
  prepMin: number;
  cookMin: number;
  totalMin: number;
  difficulty: Difficulty;
  servings: number;
  thumbnailUrl: string | null;
  hasVideo: boolean;
  category: RecipeCategory | null;
  ingredientNames: string[];
  facts: DishFacts;
  /** Per serving, calculated from the same ingredient data as the menu. */
  nutrition: Nutrition;
  /** False until a nutritionist has approved every ingredient in the recipe. */
  verified: boolean;
};

export const TIME_LIMITS = [15, 30, 60] as const;
export type TimeLimit = (typeof TIME_LIMITS)[number];

export type RecipeFilters = {
  diets: Diet[];
  time: TimeLimit | null;
  difficulty: Difficulty | null;
  category: RecipeCategory | null;
  query: string;
};

export const NO_FILTERS: RecipeFilters = { diets: [], time: null, difficulty: null, category: null, query: "" };

export function filterRecipes<T extends RecipeSummary>(recipes: readonly T[], filters: RecipeFilters): T[] {
  const words = filters.query.toLowerCase().split(/\s+/).filter(Boolean);
  return recipes.filter((recipe) => {
    if (!filters.diets.every((diet) => recipe.facts.diets.includes(diet))) return false;
    if (filters.time !== null && recipe.totalMin > filters.time) return false;
    if (filters.difficulty && recipe.difficulty !== filters.difficulty) return false;
    if (filters.category && recipe.category !== filters.category) return false;
    const haystack = `${recipe.title} ${recipe.description} ${recipe.ingredientNames.join(" ")}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

export function hasFilters(filters: RecipeFilters): boolean {
  return filters.diets.length > 0 || filters.time !== null || filters.difficulty !== null || filters.category !== null || filters.query.length > 0;
}

/** The query string for a set of filters, so every filter works as a plain link. */
export function filterHref(path: string, filters: RecipeFilters): string {
  const params = new URLSearchParams();
  filters.diets.forEach((diet) => params.append("diet", DIET_INFO[diet].slug));
  if (filters.time !== null) params.set("time", String(filters.time));
  if (filters.difficulty) params.set("difficulty", filters.difficulty.toLowerCase());
  if (filters.category) params.set("category", filters.category);
  if (filters.query) params.set("q", filters.query);
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

// ---- Video chapters

export type ChapterStep = { stepNo: number; text: string; videoStartSec: number | null };
export type RecipeChapter = { startTime: number; endTime?: number; value: string };

function chapterTitle(step: ChapterStep): string {
  const firstSentence = step.text.split(/(?<=[.!?])\s/)[0] ?? step.text;
  const short = firstSentence.length > 60 ? `${firstSentence.slice(0, 57).trimEnd()}...` : firstSentence;
  return `Step ${step.stepNo}: ${short}`;
}

/** Steps with a start time become chapters; a recipe with none simply has no chapters. */
export function chaptersFromSteps(steps: readonly ChapterStep[], durationSec?: number | null): RecipeChapter[] {
  const timed = steps
    .filter((step): step is ChapterStep & { videoStartSec: number } => step.videoStartSec !== null && step.videoStartSec >= 0)
    .sort((a, b) => a.videoStartSec - b.videoStartSec);
  return timed.map((step, index) => {
    const endTime = timed[index + 1]?.videoStartSec ?? durationSec ?? undefined;
    return { startTime: step.videoStartSec, ...(endTime === undefined ? {} : { endTime }), value: chapterTitle(step) };
  });
}

// ---- Step timers. They count towards a fixed end time, so a throttled tab stays accurate.

export type StepTimer = {
  totalSec: number;
  remainingSec: number;
  status: "idle" | "running" | "paused" | "done";
  endsAt: number | null;
};

export function newTimer(totalSec: number): StepTimer {
  return { totalSec, remainingSec: totalSec, status: "idle", endsAt: null };
}

export function startTimer(timer: StepTimer, nowMs: number): StepTimer {
  if (timer.status === "running") return timer;
  const remainingSec = timer.status === "done" ? timer.totalSec : timer.remainingSec;
  return { ...timer, remainingSec, status: "running", endsAt: nowMs + remainingSec * 1000 };
}

export function tickTimer(timer: StepTimer, nowMs: number): StepTimer {
  if (timer.status !== "running" || timer.endsAt === null) return timer;
  const remainingSec = Math.max(0, Math.ceil((timer.endsAt - nowMs) / 1000));
  if (remainingSec === 0) return { ...timer, remainingSec: 0, status: "done", endsAt: null };
  return remainingSec === timer.remainingSec ? timer : { ...timer, remainingSec };
}

export function pauseTimer(timer: StepTimer, nowMs: number): StepTimer {
  if (timer.status !== "running") return timer;
  const ticked = tickTimer(timer, nowMs);
  return ticked.status === "done" ? ticked : { ...ticked, status: "paused", endsAt: null };
}

export function resetTimer(timer: StepTimer): StepTimer {
  return newTimer(timer.totalSec);
}

export function formatTimer(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}
