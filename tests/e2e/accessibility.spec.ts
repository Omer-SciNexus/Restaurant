import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { addDish, chooseBranch, fillContact, payAndTrack, signedInPage } from "./helpers";

// Booking and account pages have their own checks in their journey specs. This covers the rest,
// so a WCAG 2.2 A or AA failure anywhere in the app fails the build.

/** Checks the page already open, and lists every problem so one run shows them all. */
async function problems(page: Page, label: string): Promise<string[]> {
  await page.waitForLoadState("networkidle");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  return results.violations.map((v) => `${label}: ${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`);
}

async function checkAll(page: Page, paths: string[]) {
  const found: string[] = [];
  for (const path of paths) {
    await page.goto(path);
    found.push(...(await problems(page, path)));
  }
  expect(found).toEqual([]);
}

const PUBLIC_PAGES = [
  "/",
  "/menu",
  "/dish/harvest-quinoa-bowl",
  "/build-a-bowl",
  "/cart",
  "/branches",
  "/branches/downtown",
  "/our-food",
  "/farms",
  "/about",
  "/sustainability",
  "/careers",
  "/contact",
  "/faq",
  "/legal/privacy",
  "/legal/terms",
  "/legal/allergens",
  "/login",
  "/signup",
  "/reset-password",
];

test("public pages", async ({ page, context, baseURL }) => {
  test.setTimeout(300_000);
  await chooseBranch(context, baseURL!);
  await checkAll(page, PUBLIC_PAGES);
});

test("checkout and order tracking", async ({ page, context, baseURL }) => {
  test.setTimeout(120_000);
  await chooseBranch(context, baseURL!);
  await addDish(page, "harvest-quinoa-bowl");
  await page.goto("/cart");
  const found = await problems(page, "/cart with a dish");
  await page.goto("/checkout");
  found.push(...(await problems(page, "/checkout")));
  await fillContact(page);
  await expect(page.getByTestId("total")).toBeVisible();
  await payAndTrack(page);
  found.push(...(await problems(page, "/order/[id]")));
  expect(found).toEqual([]);
});

const STAFF_AREAS: [string, string[]][] = [
  ["staff@nature.test", ["/staff/orders", "/staff/availability", "/staff/reservations", "/staff/waitlist"]],
  ["driver@nature.test", ["/driver"]],
  ["manager@nature.test", ["/manager/branch"]],
  [
    "admin@nature.test",
    [
      "/admin",
      "/admin/orders",
      "/admin/menu",
      "/admin/menu/categories",
      "/admin/menu/new",
      "/admin/ingredients",
      "/admin/approvals",
      "/admin/suppliers",
      "/admin/branches",
      "/admin/users",
      "/admin/recipes",
      "/admin/events",
      "/admin/settings",
    ],
  ],
];

for (const [email, paths] of STAFF_AREAS) {
  test(`pages for ${email}`, async ({ browser, baseURL }) => {
    test.setTimeout(300_000);
    const { page, context } = await signedInPage(browser, baseURL!, email);
    await checkAll(page, paths);
    await context.close();
  });
}
