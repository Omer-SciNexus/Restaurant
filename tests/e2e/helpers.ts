import { expect, type APIRequestContext, type Browser, type BrowserContext, type Page } from "@playwright/test";

export const PASSWORD = "nature-food-dev";

export async function chooseBranch(context: BrowserContext, baseURL: string, slug = "downtown") {
  await context.addCookies([{ name: "nf_branch", value: slug, url: baseURL }]);
}

export async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

export async function signedInPage(browser: Browser, baseURL: string, email: string) {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await signIn(page, email);
  return { context, page };
}

export async function addDish(page: Page, slug: string) {
  await page.goto(`/dish/${slug}`);
  await page.getByRole("button", { name: /^Add to cart/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Added" })).toBeVisible();
}

export async function fillContact(page: Page) {
  await page.getByLabel("Name", { exact: true }).fill("Test Guest");
  await page.getByLabel("Email").fill("test.guest@example.com");
  await page.getByLabel("Phone").fill("+1 512 555 0199");
}

/** Goes from a filled cart to the tracking page, using the simulated payment. */
export async function payAndTrack(page: Page) {
  await page.getByRole("button", { name: /^Continue to pay \$/ }).click();
  await page.getByRole("button", { name: /^Simulate paying/ }).click();
  await page.waitForURL(/\/order\//);
  await expect(page.getByTestId("order-headline")).toHaveText("We have your order");
  const reference = (await page.getByText(/^Order NF-/).innerText()).replace("Order ", "");
  return { reference, orderId: new URL(page.url()).pathname.split("/").pop()! };
}

export async function menuItemId(request: APIRequestContext, slug: string): Promise<string> {
  const response = await request.get(`/api/v1/dishes/${slug}`);
  expect(response.ok()).toBeTruthy();
  return (await response.json()).dish.id;
}

export async function branchId(request: APIRequestContext, slug: string): Promise<string> {
  const response = await request.get("/api/v1/branches");
  const { branches } = (await response.json()) as { branches: { id: string; slug: string }[] };
  return branches.find((b) => b.slug === slug)!.id;
}
