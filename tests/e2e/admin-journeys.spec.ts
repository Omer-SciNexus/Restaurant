import "dotenv/config";
import { expect, test, type APIRequestContext, type Browser } from "@playwright/test";
import { Client } from "pg";
import { branchId, chooseBranch, menuItemId, signedInPage } from "./helpers";

// These journeys change real rows, and other suites share the database. So the rollback test
// uses a branch nobody else orders from, and everything is put back through the app. Approving
// a change also marks its ingredient as verified, and there is rightly no way to undo that in
// the app, so that one flag is reset directly at the end.

const ROLLBACK_BRANCH = "hyde-park";
const NUTRITION_DISH = "ginger-shot";
const NUTRITION_INGREDIENT = "Fresh turmeric";

const ORDER = { type: "PICKUP", customerName: "Refund Guest", customerPhone: "+1 512 555 0177", paymentMethod: "card" };

/** Local Postgres can drop a statement when several connections overlap, so this tries again. */
async function database<T>(work: (client: Client) => Promise<T>, attempts = 5): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    // A dropped connection is reported here as well as to the query, and must not stop the run.
    client.on("error", () => {});
    try {
      await client.connect();
      return await work(client);
    } catch (error) {
      if (attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } finally {
      await client.end().catch(() => {});
    }
  }
}

// What the app rightly cannot undo. Connecting directly can drop the dev server's own database
// connections on the local Postgres, so this happens once, after every test in this file.
const leftovers = { dishSlugs: [] as string[], emails: [] as string[], nutrition: null as null | { ingredientId: string; kcal: number; wasVerified: boolean; since: string } };

test.afterAll(async () => {
  const { dishSlugs, emails, nutrition } = leftovers;
  if (dishSlugs.length + emails.length === 0 && !nutrition) return;
  leftovers.dishSlugs = [];
  leftovers.emails = [];
  leftovers.nutrition = null;
  await database(async (client) => {
    await client.query(`DELETE FROM menu_items WHERE slug = ANY($1)`, [dishSlugs]);
    await client.query(`DELETE FROM users WHERE email = ANY($1)`, [emails]);
    if (nutrition) {
      // Timestamps are stored as UTC with no zone, so the comparison has to say so.
      await client.query(`DELETE FROM nutrition_changes WHERE "ingredientId" = $1 AND "createdAt" >= ($2::timestamptz AT TIME ZONE 'UTC')`, [nutrition.ingredientId, nutrition.since]);
      await client.query(`UPDATE ingredients SET kcal = $2 WHERE id = $1`, [nutrition.ingredientId, nutrition.kcal]);
      if (!nutrition.wasVerified) await client.query(`UPDATE ingredients SET "verifiedAt" = NULL, "verifiedById" = NULL WHERE id = $1`, [nutrition.ingredientId]);
    }
  });
});

async function paidOrder(request: APIRequestContext, email: string) {
  const [branch, item] = await Promise.all([branchId(request, "downtown"), menuItemId(request, "harvest-quinoa-bowl")]);
  const created = await request.post("/api/v1/orders", { data: { ...ORDER, customerEmail: email, branchId: branch, lines: [{ menuItemId: item, quantity: 1 }] } });
  expect(created.status()).toBe(201);
  const body = await created.json();
  const paid = await request.post("/api/v1/payments/simulate", { data: { paymentId: body.payment.paymentId, outcome: "succeed" } });
  expect(paid.ok()).toBeTruthy();
  return body as { orderId: string; reference: string; totalCents: number };
}

test("Admin refunds an order and the guest is notified", async ({ browser, baseURL, request }) => {
  test.slow();
  const email = `refund.${Date.now()}@example.com`;
  const { orderId, reference, totalCents } = await paidOrder(request, email);
  // $14.95 + 8.25% tax.
  expect(totalCents).toBe(1618);

  const admin = await signedInPage(browser, baseURL!, "admin@nature.test");
  const { page } = admin;

  // Found by reference, by email and by phone, however the phone number is typed.
  for (const search of [reference, reference.toLowerCase(), email, "(512) 555-0177"]) {
    await page.goto(`/admin/orders?q=${encodeURIComponent(search)}`);
    await expect(page.getByTestId(`order-${reference}`)).toBeVisible();
  }
  await page.getByRole("link", { name: reference }).click();
  await page.waitForURL(`**/admin/orders/${orderId}`);
  await expect(page.getByTestId("payment-left")).toHaveText("$16.18");

  const amount = page.getByLabel("Refund amount (USD)");

  // Partial refund, in dollars. The button states what will happen before it is pressed.
  await expect(async () => {
    await amount.fill("2.50");
    await expect(page.getByRole("button", { name: "Refund $2.50" })).toBeVisible({ timeout: 1000 });
  }).toPass();
  await page.getByRole("button", { name: "Refund $2.50" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Refunded $2.50" })).toContainText(`We have emailed ${email}`);
  await expect(page.getByTestId("payment-status")).toHaveText("Partly refunded");
  await expect(page.getByTestId("payment-left")).toHaveText("$13.68");

  // The guest's own view of the order agrees.
  let view = await (await request.get(`/api/v1/orders/${orderId}`)).json();
  expect(view.order.refundedCents).toBe(250);
  expect(view.order.payment.status).toBe("PARTIALLY_REFUNDED");

  // More than what is left is refused, nothing moves, and nobody gets an email saying it did.
  await amount.fill("13.69");
  await page.getByRole("button", { name: "Refund $13.69" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "more than what is left" })).toContainText("$13.68");
  await expect(page.getByTestId("payment-left")).toHaveText("$13.68");

  // Nonsense is refused, not rounded.
  await amount.fill("1.999");
  await page.getByRole("button", { name: /^Refund/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: "in dollars" })).toBeVisible();

  // The rest, as a full refund. The form then goes away, because nothing is left.
  await page.getByRole("button", { name: "Fill in all that is left" }).click();
  await page.getByRole("button", { name: "Refund $13.68" }).click();
  await expect(page.getByTestId("payment-status")).toHaveText("Refunded");
  await expect(page.getByTestId("payment-left")).toHaveText("$0.00");
  await expect(amount).toHaveCount(0);

  view = await (await request.get(`/api/v1/orders/${orderId}`)).json();
  expect(view.order.refundedCents).toBe(1618);
  expect(view.order.payment.status).toBe("REFUNDED");

  // Off the Downtown board, so this test leaves nothing for the kitchen.
  expect((await page.request.patch(`/api/v1/staff/orders/${orderId}/status`, { data: { status: "REJECTED", reason: "Automated test." } })).ok()).toBeTruthy();

  await admin.context.close();
});

test.describe("two-person nutrition approval", () => {
  async function propose(browser: Browser, baseURL: string, kcal: number) {
    const author = await signedInPage(browser, baseURL, "admin@nature.test");
    await author.page.goto(`/admin/ingredients?q=${encodeURIComponent(NUTRITION_INGREDIENT)}`);
    await author.page.getByRole("link", { name: NUTRITION_INGREDIENT, exact: true }).click();
    await author.page.getByLabel("Calories (kcal)").fill(String(kcal));
    await author.page.getByLabel("Note for the reviewer").fill("Automated test of the approval flow.");
    await author.page.getByRole("button", { name: "Send for approval" }).click();
    // The page refreshes straight away to say a change is waiting, which replaces the form.
    await expect(author.page.getByRole("link", { name: "waiting for approval" })).toBeVisible();
    return author;
  }

  async function approve(browser: Browser, baseURL: string) {
    const reviewer = await signedInPage(browser, baseURL, "nutrition@nature.test");
    await reviewer.page.goto("/admin/approvals");
    const change = reviewer.page.getByTestId(`change-${NUTRITION_INGREDIENT}`);
    // The first click can land before the page is interactive, so retry until it registers.
    await expect(async () => {
      const button = change.getByRole("button", { name: "Approve" });
      if (await button.count()) await button.click();
      await expect(change).toHaveCount(0, { timeout: 5000 });
    }).toPass({ timeout: 60_000 });
    await reviewer.context.close();
  }

  test("the author cannot approve their own change, a second admin can, and the dish follows", async ({ browser, baseURL, page }) => {
    test.slow();
    // What it is now, read as an admin sees it.
    const reader = await signedInPage(browser, baseURL!, "admin@nature.test");
    await reader.page.goto(`/admin/ingredients?q=${encodeURIComponent(NUTRITION_INGREDIENT)}`);
    await reader.page.getByRole("link", { name: NUTRITION_INGREDIENT, exact: true }).click();
    await reader.page.waitForURL(/\/admin\/ingredients\/.+/);
    const kcalBefore = Number(await reader.page.getByLabel("Calories (kcal)").inputValue());
    leftovers.nutrition = {
      ingredientId: new URL(reader.page.url()).pathname.split("/").pop()!,
      kcal: kcalBefore,
      wasVerified: (await reader.page.getByText("Not verified yet.").count()) === 0,
      since: new Date().toISOString(),
    };
    await reader.context.close();

    await page.goto(`/dish/${NUTRITION_DISH}`);
    const dishKcal = page.getByTestId("kcal");
    const before = parseInt(await dishKcal.innerText(), 10);

    const author = await propose(browser, baseURL!, kcalBefore + 100);

    // Nothing guests see moves until it is approved.
    await page.goto(`/dish/${NUTRITION_DISH}`);
    expect(parseInt(await dishKcal.innerText(), 10)).toBe(before);

    // The same person cannot approve it.
    await author.page.goto("/admin/approvals");
    const own = author.page.getByTestId(`change-${NUTRITION_INGREDIENT}`);
    await expect(own.getByRole("button", { name: "Approve" })).toBeDisabled();
    await expect(own.getByText("You proposed this, so someone else has to approve it.")).toBeVisible();
    await author.context.close();

    await approve(browser, baseURL!);

    // Turmeric is 10 g of the dish, so 100 kcal per 100 g more is 10 kcal more on the dish.
    await page.goto(`/dish/${NUTRITION_DISH}`);
    expect(parseInt(await dishKcal.innerText(), 10)).toBe(before + 10);

    // Back to where it was, by the same flow.
    const restorer = await propose(browser, baseURL!, kcalBefore);
    await restorer.context.close();
    await approve(browser, baseURL!);
    await page.goto(`/dish/${NUTRITION_DISH}`);
    expect(parseInt(await dishKcal.innerText(), 10)).toBe(before);
  });
});

test.describe("rollback switch", () => {
  // Whatever happens in the test, the branch goes back to taking orders.
  test.afterAll(async ({ browser, baseURL }) => {
    const admin = await signedInPage(browser, baseURL!, "admin@nature.test");
    await admin.page.goto("/admin/branches");
    const reopen = admin.page.getByTestId(`branch-${ROLLBACK_BRANCH}`).getByRole("button", { name: "Open for online orders: Hyde Park" });
    if (await reopen.count()) {
      await reopen.click();
      await expect(reopen).toHaveCount(0);
    }
    await admin.context.close();
  });

  test("stops new orders with a clear message, and can be switched back on", async ({ browser, baseURL, context, page, request }) => {
    test.slow();
    const [branch, item] = await Promise.all([branchId(request, ROLLBACK_BRANCH), menuItemId(request, "green-juice")]);
    const data = { ...ORDER, customerEmail: "rollback@example.com", branchId: branch, lines: [{ menuItemId: item, quantity: 1 }] };

    const admin = await signedInPage(browser, baseURL!, "admin@nature.test");
    await admin.page.goto("/admin/branches");
    const row = admin.page.getByTestId(`branch-${ROLLBACK_BRANCH}`);
    await expect(row.getByText("Open for online orders", { exact: true }).first()).toBeVisible();

    await row.getByRole("button", { name: "Switch to in-store only: Hyde Park" }).click();
    await expect(row.getByRole("status")).toHaveText("In-store only");

    // The API refuses, however the request is made.
    const refused = await request.post("/api/v1/orders", { data });
    expect(refused.status()).toBe(409);
    const error = (await refused.json()).error;
    expect(error.code).toBe("ORDERING_PAUSED");
    expect(error.message).toBe("This branch is taking orders in store only right now.");

    // A guest at checkout is told, and cannot go on to pay.
    await chooseBranch(context, baseURL!, ROLLBACK_BRANCH);
    await page.goto("/dish/green-juice");
    await page.getByRole("button", { name: /^Add to cart/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "Added" })).toBeVisible();
    await page.goto("/checkout");
    await expect(page.getByRole("alert").filter({ hasText: "This branch is taking orders in store only right now." })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Continue to pay/ })).toBeDisabled();

    // The dashboard calls it out.
    await admin.page.goto("/admin");
    await expect(admin.page.getByTestId("alerts")).toContainText("Hyde Park is in-store only");

    // Switched back on, orders are taken again.
    await admin.page.goto("/admin/branches");
    await row.getByRole("button", { name: "Open for online orders: Hyde Park" }).click();
    await expect(row.getByRole("status")).toHaveText("Open for online orders");

    const accepted = await request.post("/api/v1/orders", { data });
    expect(accepted.status()).toBe(201);
    // Nobody is going to pay for this one, so it does not stay on the books as a live order.
    const { orderId } = await accepted.json();
    expect((await request.post(`/api/v1/orders/${orderId}/cancel`)).ok()).toBeTruthy();

    await page.goto("/checkout");
    await expect(page.getByRole("button", { name: /^Continue to pay \$/ })).toBeEnabled();
    await admin.context.close();
  });
});

test("a manager is kept to their own branch", async ({ browser, baseURL, request }) => {
  test.slow();
  const manager = await signedInPage(browser, baseURL!, "manager@nature.test");
  const { page } = manager;
  const riverside = await branchId(request, "riverside");
  const reader = await signedInPage(browser, baseURL!, "admin@nature.test");
  const capacityAtRiverside = async () => {
    await reader.page.goto("/admin/branches");
    const line = await reader.page.getByTestId("branch-riverside").getByText("seats per slot").innerText();
    return Number(/(\d+) seats per slot/.exec(line)![1]);
  };
  const before = await capacityAtRiverside();

  await page.goto("/manager/branch");
  await expect(page.getByTestId("branch-name")).toHaveText("Downtown");

  // Asking for another branch in the address shows their own, with no way to switch.
  await page.goto("/manager/branch?branch=riverside");
  await expect(page.getByTestId("branch-name")).toHaveText("Downtown");
  await expect(page.getByRole("button", { name: "Show" })).toHaveCount(0);

  // Pointing the form at another branch is refused by the server, and nothing changes there.
  const form = page.getByTestId("branch-form");
  await expect(async () => {
    await form.locator('input[name="branchId"]').evaluate((input: HTMLInputElement, id) => {
      input.value = id;
    }, riverside);
    await form.getByLabel("Seats per booking slot").fill(String(before + 7));
    await form.getByRole("button", { name: "Save branch" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "This belongs to another branch." })).toBeVisible({ timeout: 5000 });
  }).toPass();
  expect(await capacityAtRiverside()).toBe(before);
  await reader.context.close();

  // Bad hours on their own branch are refused with the day named, and not saved.
  await page.goto("/manager/branch");
  await form.getByLabel("Monday closes", { exact: true }).fill("05:00");
  await form.getByRole("button", { name: "Save branch" }).click();
  await expect(page.getByText("Monday: The opening time must be before the closing time.")).toBeVisible();

  // Only staff and driver are on offer when adding someone.
  await expect(page.getByLabel("Role").locator("option")).toHaveText(["Staff", "Driver"]);

  // Managers have no way into the admin area, including branch fees and the rollback switch.
  await page.goto("/admin/branches");
  await expect(page).toHaveURL(/denied=1/);
  await manager.context.close();
});

test("staff cannot reach admin or manager pages", async ({ browser, baseURL }) => {
  const staff = await signedInPage(browser, baseURL!, "staff@nature.test");
  for (const path of ["/admin", "/admin/orders", "/admin/menu", "/admin/suppliers", "/admin/branches", "/admin/users", "/admin/settings", "/manager/branch"]) {
    await staff.page.goto(path);
    await expect(staff.page, `${path} should turn staff away`).toHaveURL(/denied=1/);
  }
  await staff.context.close();
});

test("an admin cannot remove their own admin role", async ({ browser, baseURL }) => {
  const admin = await signedInPage(browser, baseURL!, "admin@nature.test");
  await admin.page.goto("/admin/users");
  const self = admin.page.getByTestId("person-admin@nature.test");
  await expect(self.getByText("This is you.")).toBeVisible();
  await expect(self.getByRole("combobox")).toHaveCount(0);
  // The second admin can be changed, so the page is not simply read-only.
  await expect(admin.page.getByTestId("person-nutrition@nature.test").getByLabel("Role")).toHaveValue("ADMIN");
  await admin.context.close();
});

test("a supplier needs a certificate for its claims, and is only public once published", async ({ browser, baseURL, page }) => {
  const name = `Test Farm ${Date.now()}`;
  const slug = name.toLowerCase().replace(/ /g, "-");
  const admin = await signedInPage(browser, baseURL!, "admin@nature.test");

  try {
    await admin.page.goto("/admin/suppliers/new");
    await admin.page.getByLabel("Name").fill(name);
    await admin.page.getByLabel("Region", { exact: true }).fill("A test region");
    await admin.page.getByLabel("Story").fill("A supplier that only exists for this test.");
    await admin.page.getByLabel("Certification claims").fill("Test Certified");

    // A claim with no certificate is refused, and what was typed is still there.
    await admin.page.getByRole("button", { name: "Create supplier" }).click();
    await expect(admin.page.getByText("A certification needs its certificate.")).toBeVisible();
    await expect(admin.page.getByLabel("Name")).toHaveValue(name);

    await admin.page.getByLabel("Certificate web address").fill("javascript:alert(1)");
    await admin.page.getByRole("button", { name: "Create supplier" }).click();
    await expect(admin.page.getByText("Use a full web address")).toBeVisible();

    await admin.page.getByLabel("Certificate web address").fill("https://example.com/certificate.pdf");
    await admin.page.getByRole("button", { name: "Create supplier" }).click();
    await admin.page.waitForURL(/\/admin\/suppliers\/(?!new)/);

    // Saved but not published: guests cannot see it.
    expect((await page.goto(`/farms/${slug}`))?.status()).toBe(404);
    await page.goto("/farms");
    await expect(page.getByText(name)).toHaveCount(0);

    await admin.page.getByLabel(/^Published/).check();
    await admin.page.getByRole("button", { name: "Save supplier" }).click();
    await expect(admin.page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();

    await page.goto("/farms");
    await page.getByRole("link", { name: new RegExp(name) }).click();
    await page.waitForURL(`**/farms/${slug}`);
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByText("Test Certified")).toBeVisible();
    await expect(page.getByRole("link", { name: "See the certificate" })).toHaveAttribute("href", "https://example.com/certificate.pdf");
  } finally {
    await admin.page.goto("/admin/suppliers");
    const row = admin.page.getByTestId(`supplier-${slug}`);
    if (await row.count()) {
      await row.getByRole("link", { name }).click();
      await admin.page.getByRole("button", { name: "Delete" }).click();
      await admin.page.getByRole("button", { name: "Yes, delete this supplier" }).click();
      await admin.page.waitForURL("**/admin/suppliers");
    }
    await admin.context.close();
  }
});

test("legal pages carry the draft notice, and the farms page invents nobody", async ({ page }) => {
  for (const path of ["/legal/privacy", "/legal/terms", "/legal/allergens"]) {
    await page.goto(path);
    await expect(page.getByText("Draft, pending legal review.")).toBeVisible();
  }
  await page.goto("/legal/allergens");
  await expect(page.getByText("Our kitchens share equipment").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Please tell staff about allergies" })).toBeVisible();

  // No supplier is seeded, so the page has to say so rather than show an example.
  await page.goto("/farms");
  await expect(page.getByRole("heading", { name: "Supplier stories are coming" })).toBeVisible();

  await page.goto("/contact");
  await expect(page.getByTestId("contact-downtown")).toContainText("+1 512 555 0101");
});

test("an admin builds a dish: live nutrition, a stable address, options, hide and delete", async ({ browser, baseURL, page }) => {
  test.slow();
  const stamp = Date.now();
  const name = `Test Dish ${stamp}`;
  const slug = `test-dish-${stamp}`;
  const admin = await signedInPage(browser, baseURL!, "admin@nature.test");
  const a = admin.page;
  leftovers.dishSlugs.push(slug);

  try {
    await a.goto("/admin/menu/new");
    await a.getByLabel("Name", { exact: true }).fill(name);
    await a.getByLabel("Description").fill("A dish that only exists for this test.");
    await a.getByLabel("Category").selectOption({ label: "Sides" });
    await a.getByLabel("Photo path").fill("/images/dishes/green-juice.png");

    // A bad price is refused, and what was typed stays.
    await a.getByLabel("Price (USD)").fill("cheap");
    await a.getByRole("button", { name: "Create dish" }).click();
    await expect(a.getByText("Enter the price in dollars")).toBeVisible();
    await expect(a.getByLabel("Name", { exact: true })).toHaveValue(name);

    await a.getByLabel("Price (USD)").fill("7.50");
    await a.getByRole("button", { name: "Create dish" }).click();
    await a.waitForURL(/\/admin\/menu\/(?!new)/);
    await expect(a.getByText(`/dish/${slug}`)).toBeVisible();

    // It starts hidden, and cannot go on the menu with nothing in it.
    expect((await page.goto(`/dish/${slug}`))?.status()).toBe(404);
    await a.getByRole("button", { name: "Put on the menu" }).click();
    await expect(a.getByRole("alert").filter({ hasText: "Add the dish's ingredients first" })).toBeVisible();

    // Nutrition and tags follow the recipe as it is edited, before anything is saved.
    const result = a.getByTestId("recipe-result");
    await a.getByLabel("Add an ingredient").selectOption({ label: "Lemon" });
    await a.getByRole("button", { name: "Add", exact: true }).click();
    const grams = a.getByLabel("Lemon, grams");

    // A line with no weight cannot be saved.
    await a.getByRole("button", { name: "Save recipe" }).click();
    await expect(a.getByRole("alert").filter({ hasText: "Every ingredient needs a weight" })).toBeVisible();

    await grams.fill("100");
    await expect(result.getByTestId("kcal")).toHaveText(/^29\s/);
    await grams.fill("200");
    await expect(result.getByTestId("kcal")).toHaveText(/^58\s/);
    await expect(result.getByText("Vegan")).toBeVisible();

    await a.getByLabel("Add an ingredient").selectOption({ label: "Sesame seeds" });
    await a.getByRole("button", { name: "Add", exact: true }).click();
    await a.getByLabel("Sesame seeds, grams").fill("10");
    await expect(result.getByRole("region", { name: "Allergens" })).toContainText("Sesame");
    await a.getByRole("button", { name: "Remove Sesame seeds" }).click();
    await expect(result.getByRole("region", { name: "Allergens" })).not.toContainText("Sesame");

    await a.getByRole("button", { name: "Save recipe" }).click();
    await expect(a.getByRole("status").filter({ hasText: "The menu now uses this recipe." })).toBeVisible();
    await a.getByRole("button", { name: "Put on the menu" }).click();
    await expect(a.getByRole("button", { name: "Hide from the menu" })).toBeVisible();

    // The guest sees the same figure, at the address set when it was created.
    await page.goto(`/dish/${slug}`);
    await expect(page.getByTestId("kcal")).toHaveText(/^58\s/);

    // Renaming it does not move it.
    await a.getByLabel("Name", { exact: true }).fill(`${name} renamed`);
    await a.getByRole("button", { name: "Save details" }).click();
    await expect(a.locator("form").filter({ has: a.getByRole("button", { name: "Save details" }) }).getByRole("status")).toHaveText("Saved.");
    await page.goto(`/dish/${slug}`);
    await expect(page.getByRole("heading", { name: `${name} renamed` })).toBeVisible();

    // A group cannot demand more than it offers, because the dish could not then be ordered.
    const newGroup = a.locator("form").filter({ hasText: "Add an option group" });
    await newGroup.getByLabel("Group name").fill("Extras");
    await newGroup.getByLabel("Must pick").fill("1");
    await newGroup.getByRole("button", { name: "Add group" }).click();
    await expect(newGroup.getByRole("alert")).toContainText("Add the options first");
    await newGroup.getByLabel("Must pick").fill("0");
    await newGroup.getByRole("button", { name: "Add group" }).click();

    const group = a.getByTestId("group-Extras");
    await expect(group).toBeVisible();
    await group.getByLabel("Option name").fill("Extra lemon");
    await group.getByLabel("Ingredient").selectOption({ label: "Lemon" });
    await group.getByLabel("Grams").fill("50");
    await group.getByLabel("Extra (USD)").fill("1.25");
    await group.getByRole("button", { name: "Add option" }).click();
    const option = a.getByTestId("option-Extra lemon");
    await expect(option).toContainText("+$1.25");

    await group.getByLabel("Must pick").first().fill("1");
    await group.getByRole("button", { name: "Save group" }).click();
    await expect(group.getByRole("status").filter({ hasText: "Saved." }).first()).toBeVisible();
    await option.locator("summary").click();
    await option.getByRole("button", { name: "Delete" }).click();
    await expect(option.getByRole("alert")).toContainText("has to stay");

    // Hidden, guests cannot reach it.
    await a.getByRole("button", { name: "Hide from the menu" }).click();
    await expect(a.getByRole("button", { name: "Put on the menu" })).toBeVisible();
    expect((await page.goto(`/dish/${slug}`))?.status()).toBe(404);

    // Nothing depends on it, so this one can be deleted.
    await a.getByRole("button", { name: "Delete", exact: true }).first().click();
    await a.getByRole("button", { name: "Yes, delete this dish" }).click();
    await a.waitForURL("**/admin/menu");
    await expect(a.getByRole("link", { name: new RegExp(name) })).toHaveCount(0);
    leftovers.dishSlugs.pop();
  } finally {
    await admin.context.close();
  }
});

test("a dish that has been ordered can be hidden, but not deleted", async ({ browser, baseURL, request }) => {
  await paidOrder(request, `delete.${Date.now()}@example.com`).then(({ orderId }) => request.post(`/api/v1/orders/${orderId}/cancel`));
  const admin = await signedInPage(browser, baseURL!, "admin@nature.test");
  await admin.page.goto("/admin/menu");
  await admin.page.getByRole("link", { name: "Harvest Quinoa Bowl" }).click();
  await admin.page.waitForURL(/\/admin\/menu\/.+/);
  await expect(admin.page.getByText("This dish has been ordered, so it cannot be deleted. Hide it instead.")).toBeVisible();
  await expect(admin.page.getByRole("button", { name: "Delete", exact: true })).toHaveCount(0);
  await expect(admin.page.getByRole("button", { name: "Hide from the menu" })).toBeVisible();
  await admin.context.close();
});

test("roles and branches: the rules hold for an admin and for a manager", async ({ browser, baseURL }) => {
  test.slow();
  const email = `new.hire.${Date.now()}@example.com`;
  leftovers.emails.push(email);
  const signup = await browser.newContext({ baseURL });
  const newcomer = await signup.newPage();
  await newcomer.goto("/signup");
  await newcomer.getByLabel("Name").fill("Newly Hired");
  await newcomer.getByLabel("Email").fill(email);
  await newcomer.getByLabel("Password").fill("nature-food-dev");
  await newcomer.getByRole("button", { name: /create|sign up/i }).click();
  await newcomer.waitForURL((url) => !url.pathname.startsWith("/signup"));
  await signup.close();

  const admin = await signedInPage(browser, baseURL!, "admin@nature.test");
  const manager = await signedInPage(browser, baseURL!, "manager@nature.test");

  try {
    // A manager adds them, by the email of their account.
    await manager.page.goto("/manager/branch");
    await manager.page.getByLabel("Email of their account").fill("nobody.here@example.com");
    await manager.page.getByRole("button", { name: "Add to this branch" }).click();
    await expect(manager.page.getByRole("alert").filter({ hasText: "no account with that email" })).toBeVisible();

    await manager.page.getByLabel("Email of their account").fill(email);
    await manager.page.getByRole("button", { name: "Add to this branch" }).click();
    const person = manager.page.getByTestId(`person-${email}`);
    await expect(person).toContainText("Staff");

    // Forcing the admin role through the form is refused by the server.
    await person.locator('input[name="role"]').evaluate((input: HTMLInputElement) => {
      input.value = "ADMIN";
    });
    await person.getByRole("button", { name: "Make driver" }).click();
    await expect(person.getByRole("alert")).toContainText("Managers can only assign the staff and driver roles.");

    // A manager cannot take on someone who is already an admin.
    await manager.page.getByLabel("Email of their account").fill("nutrition@nature.test");
    await manager.page.getByRole("button", { name: "Add to this branch" }).click();
    await expect(manager.page.getByRole("alert").filter({ hasText: "already part of the team" })).toBeVisible();

    await manager.page.reload();
    await person.getByRole("button", { name: "Make driver" }).click();
    await expect(person).toContainText("Driver");

    // An admin moving them to another role needs a branch for it, and none for customer.
    await admin.page.goto(`/admin/users?q=${encodeURIComponent(email)}`);
    const row = admin.page.getByTestId(`person-${email}`);
    await expect(row).toContainText("Driver, Downtown");
    await row.getByLabel("Branch").selectOption({ label: "Choose a branch" });
    await row.getByRole("button", { name: "Save Newly Hired" }).click();
    await expect(row.getByRole("alert")).toContainText("needs a branch");
    await row.getByLabel("Branch").selectOption({ label: "Riverside" });
    await row.getByRole("button", { name: "Save Newly Hired" }).click();
    await expect(row).toContainText("Driver, Riverside");

    // Now they belong to another branch, so the Downtown manager cannot touch them.
    await manager.page.reload();
    await expect(person).toHaveCount(0);

    await row.getByLabel("Role").selectOption("CUSTOMER");
    await expect(row.getByLabel("Branch")).toHaveCount(0);
    await row.getByRole("button", { name: "Save Newly Hired" }).click();
    await expect(row.locator("p").nth(1)).toHaveText(`${email} · Customer`);
  } finally {
    await admin.context.close();
    await manager.context.close();
  }
});

test("settings and branch forms refuse bad values, and saving changes nothing else", async ({ browser, baseURL }) => {
  test.slow();
  const admin = await signedInPage(browser, baseURL!, "admin@nature.test");
  const { page } = admin;

  await page.goto("/admin/settings");
  await expect(page.getByText("These are the owner's decisions.")).toBeVisible();
  const deposit = await page.getByLabel("Deposit per guest (USD)").inputValue();
  await page.getByLabel("Deposit per guest (USD)").fill("ten dollars");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Enter the deposit per guest in dollars")).toBeVisible();
  await page.getByLabel("Deposit per guest (USD)").fill(deposit);
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Deposit per guest (USD)")).toHaveValue(deposit);

  await page.goto("/admin/branches");
  const row = page.getByTestId(`branch-${ROLLBACK_BRANCH}`);
  const summary = await row.locator("p").first().innerText();
  await row.getByRole("link", { name: "Hyde Park" }).click();
  await page.waitForURL(/\/admin\/branches\/.+/);

  const hours = await page.getByLabel("Monday opens", { exact: true }).inputValue();
  await page.getByLabel("Sales tax (%)").fill("99");
  await page.getByLabel("Monday opens", { exact: true }).fill("23:00");
  await page.getByRole("button", { name: "Save branch" }).click();
  await expect(page.getByText("Monday: The opening time must be before the closing time.")).toBeVisible();
  await expect(page.getByText("Enter the tax rate as a percentage")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Save branch" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
  await page.goto("/admin/branches");
  expect(await row.locator("p").first().innerText()).toBe(summary);
  await page.goto(`/manager/branch?branch=${ROLLBACK_BRANCH}`);
  await expect(page.getByLabel("Monday opens", { exact: true })).toHaveValue(hours);
  await admin.context.close();
});
