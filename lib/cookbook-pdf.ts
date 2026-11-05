// The My cookbook PDF. pdf-lib's built-in fonts only cover Windows-1252, and they throw on
// anything else, so all text passes through pdfSafeText first: accented letters are kept or
// have their accent removed, and characters with no equivalent become "?" with a short note.

import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { ALLERGEN_INFO, type Allergen } from "./domain";
import type { Nutrition } from "./nutrition";
import { formatGrams, formatMinutes } from "./recipe-rules";

export type CookbookPdfRecipe = {
  title: string;
  description: string;
  prepMin: number;
  cookMin: number;
  servings: number;
  note: string | null;
  verified: boolean;
  nutrition: Nutrition;
  allergens: readonly Allergen[];
  mayContain: readonly Allergen[];
  ingredients: readonly { displayText: string; grams: number }[];
  steps: readonly { stepNo: number; text: string }[];
};

const PAGE_WIDTH = 612; // US Letter
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM = MARGIN + 18;

const FOREST = rgb(0.184, 0.365, 0.227);
const BARK = rgb(0.169, 0.149, 0.133);
const STONE = rgb(0.431, 0.404, 0.373);
const DANGER = rgb(0.612, 0.227, 0.133);

// Common characters outside Windows-1252 with a sensible plain spelling, by code point.
const SPELLINGS = new Map<number, string>([
  [0x00a0, " "], // no-break space
  [0x2009, " "], // thin space
  [0x200a, " "], // hair space
  [0x202f, " "], // narrow no-break space
  [0x2044, "/"], // fraction slash
  [0x2190, "<-"], // left arrow
  [0x2192, "->"], // right arrow
  [0x2212, "-"], // minus sign
  [0x2010, "-"], // hyphen
  [0x2011, "-"], // non-breaking hyphen
  [0x0131, "i"], // dotless i
  [0x0141, "L"], // L with stroke
  [0x0142, "l"], // l with stroke
  [0x0110, "D"], // D with stroke
  [0x0111, "d"], // d with stroke
  [0x0126, "H"], // H with stroke
  [0x0127, "h"], // h with stroke
]);

/** Control characters, zero-width marks and text-direction marks, which have nothing to draw. */
function isInvisible(code: number): boolean {
  return code <= 0x1f || (code >= 0x7f && code <= 0x9f) || code === 0xad || (code >= 0x200b && code <= 0x200f) || (code >= 0x2028 && code <= 0x202e) || (code >= 0x2060 && code <= 0x206f) || code === 0xfeff;
}

/** Makes text safe for a built-in font, whatever a guest typed into a note. Line breaks stay. */
export function pdfSafeText(text: string, supported: ReadonlySet<number>): string {
  let result = "";
  for (const char of text) {
    if (char === "\n" || char === "\t") {
      result += char === "\n" ? "\n" : " ";
      continue;
    }
    const code = char.codePointAt(0)!;
    if (isInvisible(code)) continue;
    if (supported.has(code)) {
      result += char;
      continue;
    }
    const spelling = SPELLINGS.get(code);
    if (spelling) {
      result += spelling;
      continue;
    }
    // A letter like a-breve splits into "a" plus an accent; the accent is dropped when only the letter exists.
    const parts = [...char.normalize("NFKD")].filter((part) => !/\p{M}/u.test(part));
    const spelled = parts.map((part) => {
      const partCode = part.codePointAt(0)!;
      return supported.has(partCode) ? part : (SPELLINGS.get(partCode) ?? null);
    });
    result += parts.length > 0 && spelled.every((part) => part !== null) ? spelled.join("") : "?";
  }
  return result;
}

/** True when a text would lose characters, so the PDF can say so instead of hiding it. */
export function losesCharacters(text: string, supported: ReadonlySet<number>): boolean {
  return pdfSafeText(text, supported).split("?").length > text.split("?").length;
}

type Measure = (text: string) => number;

/** Greedy word wrap. A single word wider than the line, such as a long link, is split. */
export function wrapText(text: string, maxWidth: number, measure: Measure): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      if (measure(word) <= maxWidth) {
        line = word;
        continue;
      }
      let chunk = "";
      for (const char of word) {
        if (measure(chunk + char) > maxWidth && chunk) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk += char;
        }
      }
      line = chunk;
    }
    lines.push(line);
  }
  return lines;
}

function allergenLabels(allergens: readonly Allergen[]): string {
  return allergens.map((allergen) => ALLERGEN_INFO[allergen].label).join(", ");
}

/** A cursor that moves down the page and starts a new one when the text runs out of room. */
class PageWriter {
  page: PDFPage;
  y = PAGE_HEIGHT - MARGIN;
  readonly supported: ReadonlySet<number>;

  constructor(
    private readonly doc: PDFDocument,
    readonly regular: PDFFont,
    readonly bold: PDFFont,
  ) {
    this.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.supported = new Set(regular.getCharacterSet());
  }

  newPage() {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  ensureRoom(height: number) {
    if (this.y - height < BOTTOM) this.newPage();
  }

  gap(height: number) {
    this.y -= height;
  }

  /** Writes wrapped text. A continuation line stays aligned under the hanging indent. */
  text(
    raw: string,
    options: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; indent?: number; label?: string; leading?: number } = {},
  ) {
    const size = options.size ?? 10.5;
    const font = options.font ?? this.regular;
    const indent = options.indent ?? 0;
    const leading = options.leading ?? size * 1.4;
    const width = CONTENT_WIDTH - indent;
    const measure: Measure = (value) => font.widthOfTextAtSize(value, size);
    const lines = wrapText(pdfSafeText(raw, this.supported), width, measure);
    lines.forEach((line, index) => {
      this.ensureRoom(leading);
      this.y -= leading;
      if (index === 0 && options.label) {
        this.page.drawText(pdfSafeText(options.label, this.supported), { x: MARGIN, y: this.y, size, font: this.bold, color: options.color ?? BARK });
      }
      if (line) this.page.drawText(line, { x: MARGIN + indent, y: this.y, size, font, color: options.color ?? BARK });
    });
  }

  heading(raw: string, size: number, room = 60) {
    this.ensureRoom(size * 1.4 + room);
    this.text(raw, { size, font: this.bold, color: FOREST });
  }
}

function writeRecipe(writer: PageWriter, recipe: CookbookPdfRecipe) {
  writer.heading(recipe.title, 20);
  const time = `Prep ${formatMinutes(recipe.prepMin)}, cook ${formatMinutes(recipe.cookMin)}. Serves ${recipe.servings}.`;
  writer.text(time, { size: 10, color: STONE });
  writer.gap(4);
  writer.text(recipe.description);

  writer.gap(10);
  writer.heading("Ingredients", 12);
  for (const line of recipe.ingredients) {
    writer.text(`${line.displayText} (${formatGrams(line.grams)})`, { indent: 12, label: "-" });
  }

  writer.gap(10);
  writer.heading("Method", 12);
  for (const step of recipe.steps) {
    writer.text(step.text, { indent: 20, label: `${step.stepNo}.` });
    writer.gap(3);
  }

  writer.gap(8);
  writer.heading("Nutrition per serving", 12);
  const { kcal, protein, carbs, fat, fibre, sugar, salt } = recipe.nutrition;
  writer.text(`${kcal} kcal. Protein ${protein} g, carbs ${carbs} g, fat ${fat} g, fibre ${fibre} g, sugar ${sugar} g, salt ${salt} g.`);
  writer.gap(4);
  writer.text(recipe.allergens.length > 0 ? `Contains: ${allergenLabels(recipe.allergens)}.` : "None of the nine major allergens in the listed ingredients.", {
    font: recipe.allergens.length > 0 ? writer.bold : writer.regular,
  });
  if (recipe.mayContain.length > 0) writer.text(`May contain: ${allergenLabels(recipe.mayContain)}.`);
  if (!recipe.verified) {
    writer.gap(4);
    writer.text("Draft data. These values are waiting for our nutritionist's check. Check the labels on your own ingredients if you have an allergy.", { size: 9.5, color: DANGER });
  }

  if (recipe.note) {
    writer.gap(10);
    writer.heading("My notes", 12);
    writer.text(recipe.note);
    if (losesCharacters(recipe.note, writer.supported)) {
      writer.text("Some characters in this note cannot be shown in a PDF yet and appear as a question mark. Your note is unchanged in your account.", { size: 9, color: STONE });
    }
  }
}

export async function buildCookbookPdf(recipes: readonly CookbookPdfRecipe[], ownerName?: string | null): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("My cookbook");
  doc.setAuthor("Nature Food");
  doc.setCreator("Nature Food");
  const [regular, bold] = await Promise.all([doc.embedFont(StandardFonts.Helvetica), doc.embedFont(StandardFonts.HelveticaBold)]);
  const writer = new PageWriter(doc, regular, bold);

  writer.text(ownerName ? `${ownerName}'s cookbook` : "My cookbook", { size: 28, font: bold, color: FOREST });
  writer.gap(4);
  writer.text("Saved from Cook at home at Nature Food.", { color: STONE });
  writer.gap(18);

  if (recipes.length === 0) writer.text("No recipes saved yet.");

  recipes.forEach((recipe, index) => {
    // Each recipe starts on its own page, apart from the first, under the title.
    if (index > 0) writer.newPage();
    writeRecipe(writer, recipe);
  });

  const pages = doc.getPages();
  pages.forEach((page, index) => {
    const label = `Page ${index + 1} of ${pages.length}`;
    page.drawText(label, { x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(label, 9), y: MARGIN - 18, size: 9, font: regular, color: STONE });
  });
  return doc.save();
}
