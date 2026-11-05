import { PDFDocument, StandardFonts } from "pdf-lib";
import { beforeAll, describe, expect, it } from "vitest";
import { buildCookbookPdf, losesCharacters, pdfSafeText, wrapText, type CookbookPdfRecipe } from "@/lib/cookbook-pdf";

const recipe = (overrides: Partial<CookbookPdfRecipe> = {}): CookbookPdfRecipe => ({
  title: "Harvest Quinoa Bowl",
  description: "Warm quinoa with roasted sweet potato.",
  prepMin: 15,
  cookMin: 35,
  servings: 2,
  note: null,
  verified: false,
  nutrition: { kcal: 650, protein: 18, carbs: 70, fat: 30, fibre: 15, sugar: 9, salt: 1.2 },
  allergens: ["SESAME"],
  mayContain: [],
  ingredients: [{ displayText: "1 2/3 cups cooked quinoa", grams: 300 }],
  steps: [{ stepNo: 1, text: "Cook the quinoa." }],
  ...overrides,
});

const pageCount = async (bytes: Uint8Array) => (await PDFDocument.load(bytes)).getPageCount();
const startsAsPdf = (bytes: Uint8Array) => new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";

describe("pdfSafeText", () => {
  let supported: Set<number>;

  beforeAll(async () => {
    const doc = await PDFDocument.create();
    supported = new Set((await doc.embedFont(StandardFonts.Helvetica)).getCharacterSet());
  });

  it("keeps accented letters and punctuation the font has", () => {
    expect(pdfSafeText("Crème brûlée, jalapeño, Müsli", supported)).toBe("Crème brûlée, jalapeño, Müsli");
    expect(pdfSafeText("It’s “good” – really", supported)).toBe("It’s “good” – really");
  });

  it("removes the accent where the font only has the plain letter", () => {
    expect(pdfSafeText("Dvořák", supported)).toBe("Dvorák");
    expect(pdfSafeText("Łódź", supported)).toBe("Lódz");
    expect(pdfSafeText("şeker", supported)).toBe("seker");
  });

  it("replaces what has no equivalent, and removes what cannot be drawn", () => {
    expect(pdfSafeText("寿司", supported)).toBe("??");
    expect(pdfSafeText("Good 🥑", supported)).toBe("Good ?");
    expect(pdfSafeText("a​b﻿c", supported)).toBe("abc");
    expect(pdfSafeText("a\tb\r\nc", supported)).toBe("a b\nc");
  });

  it("notices when a note would lose characters", () => {
    expect(losesCharacters("Plain? Yes.", supported)).toBe(false);
    expect(losesCharacters("Dvořák", supported)).toBe(false);
    expect(losesCharacters("寿司", supported)).toBe(true);
  });
});

describe("wrapText", () => {
  const measure = (text: string) => text.length;

  it("wraps on spaces within the width", () => {
    expect(wrapText("one two three four", 9, measure)).toEqual(["one two", "three", "four"]);
  });

  it("splits one word wider than the line", () => {
    expect(wrapText("https://example.com/a", 10, measure)).toEqual(["https://ex", "ample.com/", "a"]);
    expect(wrapText("ab abcdefghijkl cd", 5, measure)).toEqual(["ab", "abcde", "fghij", "kl cd"]);
  });

  it("keeps line breaks and blank lines", () => {
    expect(wrapText("one\n\ntwo", 10, measure)).toEqual(["one", "", "two"]);
  });
});

describe("buildCookbookPdf", () => {
  it("makes a valid PDF, with a page for each recipe", async () => {
    const bytes = await buildCookbookPdf([recipe(), recipe({ title: "Miso Salmon Bowl", verified: true })], "Gale Guest");
    expect(startsAsPdf(bytes)).toBe(true);
    expect(await pageCount(bytes)).toBe(2);
  });

  it("still makes a valid PDF for an empty cookbook", async () => {
    const bytes = await buildCookbookPdf([]);
    expect(startsAsPdf(bytes)).toBe(true);
    expect(await pageCount(bytes)).toBe(1);
  });

  it("does not crash on accented letters, other scripts or emoji anywhere", async () => {
    const hostile = "Crème fraîche, Dvořák, Łódź, 寿司, Борщ, طعام, 🥑, a\tb​\r\nnext line";
    const bytes = await buildCookbookPdf(
      [
        recipe({
          title: hostile,
          description: hostile,
          note: hostile,
          ingredients: [{ displayText: hostile, grams: 12 }],
          steps: [{ stepNo: 1, text: hostile }],
        }),
      ],
      hostile,
    );
    expect(await pageCount(bytes)).toBe(1);
  });

  it("breaks onto new pages for a long recipe, and handles a very long note", async () => {
    const steps = Array.from({ length: 60 }, (_, index) => ({ stepNo: index + 1, text: "Stir gently and keep an eye on it, because this step takes a while and the wording goes on past the end of a line. ".repeat(2) }));
    const bytes = await buildCookbookPdf([recipe({ steps, note: "Long note that keeps going. ".repeat(400) })]);
    expect(await pageCount(bytes)).toBeGreaterThan(3);
  });

  it("handles one enormous unbroken word", async () => {
    const bytes = await buildCookbookPdf([recipe({ note: "x".repeat(20_000) })]);
    expect(await pageCount(bytes)).toBeGreaterThan(1);
  });
});
