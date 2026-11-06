import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { branchId, chooseBranch, menuItemId, PASSWORD, signIn } from "./helpers";

const NEW_PASSWORD = `${PASSWORD}-long`;
const RECIPE = "harvest-quinoa-bowl";

/** A brand new customer, so these tests never disturb the shared accounts' profiles. */
async function signUp(page: Page, name: string): Promise<string> {
  const email = `${name.toLowerCase()}.${Date.now()}.${Math.floor(Math.random() * 10_000)}@example.test`;
  await page.goto("/signup");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/account\/diet/);
  return email;
}

async function newCustomer(browser: Browser, baseURL: string, name: string) {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await signUp(page, name);
  return { context, page };
}

test("guest opens a recipe, saves it to My cookbook and downloads the PDF", async ({ page }) => {
  // No videos are filmed yet, so the recipe opens with its calm placeholder instead.
  await page.goto("/cook");
  await page.getByRole("link", { name: "Harvest Quinoa Bowl" }).click();
  await page.waitForURL(`/cook/${RECIPE}`);
  await expect(page.getByTestId("video-coming-soon")).toContainText("Video coming soon");
  await expect(page.locator("mux-player")).toHaveCount(0);

  // Signing in comes back to the same recipe. A new customer makes this run repeatable.
  await page.getByRole("link", { name: "Save to my cookbook" }).click();
  await page.waitForURL(/\/login\?next=/);
  expect(decodeURIComponent(new URL(page.url()).search)).toContain(`/cook/${RECIPE}`);
  await signUp(page, "Saver");

  await page.goto(`/cook/${RECIPE}`);
  await page.getByRole("button", { name: "Save to my cookbook" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved to your cookbook." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove from my cookbook" })).toBeVisible();

  await page.goto("/account/cookbook");
  const entry = page.getByTestId("cookbook-entry");
  await expect(entry).toHaveCount(1);
  await expect(entry.getByRole("link", { name: "Harvest Quinoa Bowl" })).toBeVisible();

  // Accents and characters the PDF font cannot draw must not break the download.
  const note = "Plus de citron, crème fraîche. Dvořák says 寿司.";
  await entry.getByLabel(/Your note/).fill(note);
  await entry.getByRole("button", { name: "Save note" }).click();
  await expect(entry.getByRole("status")).toHaveText("Note saved.");
  await page.reload();
  await expect(page.getByTestId("cookbook-entry").getByLabel(/Your note/)).toHaveValue(note);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download PDF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("nature-food-cookbook.pdf");
  const response = await page.request.get("/api/v1/me/cookbook.pdf");
  expect(response.headers()["content-type"]).toBe("application/pdf");
  const pdf = await PDFDocument.load(await response.body());
  expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
  expect(pdf.getTitle()).toBe("My cookbook");

  await page.goto("/account/cookbook/print");
  await expect(page.getByTestId("print-recipe")).toContainText("Harvest Quinoa Bowl");
  await expect(page.getByTestId("print-recipe")).toContainText("crème fraîche");

  await page.goto("/account/cookbook");
  await page.getByRole("button", { name: "Remove Harvest Quinoa Bowl from my cookbook" }).click();
  await expect(page.getByRole("heading", { name: "Nothing saved yet" })).toBeVisible();
});

test("a saved allergy flags an unsafe dish before checkout", async ({ page, context, baseURL }) => {
  await chooseBranch(context, baseURL!);
  await signUp(page, "Allergy");

  await page.goto("/menu");
  const kaleCaesar = page.locator("article").filter({ hasText: "Kale Caesar Salad" });
  await expect(kaleCaesar).toBeVisible();
  await expect(kaleCaesar.getByTestId("profile-flag")).toHaveCount(0);

  await page.goto("/account/diet");
  await page.getByRole("checkbox", { name: "Tree nuts" }).check();
  await page.getByRole("button", { name: "Save my profile" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();

  await page.goto("/menu");
  await expect(page.locator("article").filter({ hasText: "Kale Caesar Salad" }).getByTestId("profile-flag")).toContainText("Contains tree nuts");
  // A dish with no tree nuts in it stays unflagged.
  await expect(page.locator("article").filter({ hasText: "Harvest Quinoa Bowl" }).getByTestId("profile-flag")).toHaveCount(0);

  await page.goto("/dish/kale-caesar-salad");
  await expect(page.getByTestId("profile-warning")).toContainText("tree nuts");

  // The warning follows the dish through the cart to the last step before paying.
  await page.getByRole("button", { name: /^Add to cart/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Added" })).toBeVisible();
  await page.goto("/cart");
  await expect(page.getByTestId("profile-warning")).toContainText("tree nuts");
  await page.goto("/checkout");
  await expect(page.getByTestId("profile-warning")).toContainText("Check before ordering Kale Caesar Salad");
  // The kitchen's note starts filled in, so an allergy is not lost if the guest skips it.
  await expect(page.getByLabel(/Any allergies/)).toHaveValue("Allergic to tree nuts.");

  // The recipe uses the same profile and the same ingredient data.
  await page.goto("/cook/date-cacao-bites");
  await expect(page.getByTestId("profile-warning")).toContainText("tree nuts");

  // The profile survives a reload, and can be cleared.
  await page.goto("/account/diet");
  await expect(page.getByRole("checkbox", { name: "Tree nuts" })).toBeChecked();
});

test("a saved address fills in the delivery details at checkout", async ({ page, context, baseURL }) => {
  await chooseBranch(context, baseURL!);
  await signUp(page, "Saved");
  const created = await page.request.post("/api/v1/me/addresses", { data: { label: "Home", street: "12 Test Street", city: "Austin", notes: "Blue door" } });
  expect(created.status()).toBe(201);

  // Two dishes, because one alone is under the branch's delivery minimum.
  for (const slug of ["margherita-pizza", "green-juice"]) {
    await page.goto(`/dish/${slug}`);
    await page.getByRole("button", { name: /^Add to cart/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "Added" })).toBeVisible();
  }
  await page.goto("/checkout");
  await page.getByRole("radio", { name: /Delivery/ }).check({ force: true });
  await page.getByLabel("Saved addresses").selectOption({ label: "Home: 12 Test Street, Austin" });
  await expect(page.getByLabel("Street address")).toHaveValue("12 Test Street");
  await expect(page.getByLabel("City")).toHaveValue("Austin");
  await expect(page.getByLabel(/Notes for the driver/)).toHaveValue("Blue door");
  // $22.45 + $3.99 delivery + $1.85 tax = $28.29
  await expect(page.getByTestId("total")).toHaveText("$28.29");

  await page.getByLabel("Saved addresses").selectOption({ label: "Enter a new address" });
  await expect(page.getByLabel("Street address")).toHaveValue("");
});

test("one customer cannot read, change or delete another customer's address", async ({ browser, baseURL }) => {
  const owner = await newCustomer(browser, baseURL!, "Owner");
  const other = await newCustomer(browser, baseURL!, "Other");

  const created = await owner.page.request.post("/api/v1/me/addresses", {
    // The browser cannot choose the owner or the coordinates: both are ignored.
    data: { label: "Home", street: "12 Test Street", city: "Austin", notes: "Blue door", userId: "someone-else", lat: 1, lng: 1 },
  });
  expect(created.status()).toBe(201);
  const { address } = await created.json();
  expect(address.notes).toBe("Blue door");
  expect(address).not.toHaveProperty("userId");

  const url = `/api/v1/me/addresses/${address.id}`;
  expect((await other.page.request.get(url)).status()).toBe(404);
  expect((await other.page.request.patch(url, { data: { street: "1 Taken Road" } })).status()).toBe(404);
  expect((await other.page.request.delete(url)).status()).toBe(404);
  expect((await (await other.page.request.get("/api/v1/me/addresses")).json()).addresses).toEqual([]);

  // Still there, unchanged, for its owner.
  const mine = await owner.page.request.get(url);
  expect(mine.ok()).toBeTruthy();
  expect((await mine.json()).address.street).toBe("12 Test Street");

  // The owner can use the page: edit, then remove.
  await owner.page.goto("/account/addresses");
  await owner.page.getByRole("button", { name: "Edit Home" }).click();
  await owner.page.getByLabel("City").first().fill("Round Rock");
  await owner.page.getByRole("button", { name: "Save address" }).first().click();
  await expect(owner.page.getByTestId("address")).toContainText("Round Rock");
  await owner.page.getByRole("button", { name: "Remove Home" }).click();
  await owner.page.getByRole("button", { name: "Yes, remove it" }).click();
  await expect(owner.page.getByTestId("address")).toHaveCount(0);
  expect((await owner.page.request.delete(url)).status()).toBe(404);

  await owner.context.close();
  await other.context.close();
});

test("one customer's cookbook and orders stay their own", async ({ browser, baseURL, request }) => {
  const owner = await newCustomer(browser, baseURL!, "Keeper");
  const other = await newCustomer(browser, baseURL!, "Nosy");
  const { recipe } = await (await request.get(`/api/v1/recipes/${RECIPE}`)).json();

  await owner.page.request.post("/api/v1/me/cookbook", { data: { recipeId: recipe.id, note: "Private" } });
  expect((await (await other.page.request.get("/api/v1/me/cookbook")).json()).entries).toEqual([]);

  // Removing the same recipe from another account touches only that account's rows.
  expect((await (await other.page.request.delete(`/api/v1/me/cookbook?recipeId=${recipe.id}`)).json()).removed).toBe(false);
  const { entries } = await (await owner.page.request.get("/api/v1/me/cookbook")).json();
  expect(entries).toHaveLength(1);
  expect(entries[0].note).toBe("Private");

  expect((await (await other.page.request.get("/api/v1/me/orders")).json()).orders).toEqual([]);

  await owner.context.close();
  await other.context.close();
});

test("a profile update cannot change a role, and bad input is refused", async ({ browser, baseURL }) => {
  const customer = await newCustomer(browser, baseURL!, "Climber");
  const updated = await customer.page.request.patch("/api/v1/me", { data: { name: "Still A Customer", role: "ADMIN", branchId: "x", id: "x", email: "admin@nature.test" } });
  expect(updated.ok()).toBeTruthy();
  const { user } = await updated.json();
  expect(user.name).toBe("Still A Customer");
  expect(user.role).toBe("CUSTOMER");
  expect(user.email).not.toBe("admin@nature.test");

  expect((await customer.page.request.patch("/api/v1/me", { data: { phone: "not a phone" } })).status()).toBe(400);
  expect((await customer.page.request.put("/api/v1/me/diet", { data: { diets: ["CARNIVORE"], allergies: [] } })).status()).toBe(400);
  expect((await customer.page.request.post("/api/v1/me/cookbook", { data: { recipeId: "not-a-recipe" } })).status()).toBe(404);
  await customer.context.close();
});

test("an order placed while signed in appears in history with its receipt", async ({ page, request }) => {
  await signUp(page, "Orderer");
  const [branch, item] = await Promise.all([branchId(request, "downtown"), menuItemId(request, "harvest-quinoa-bowl")]);
  const created = await page.request.post("/api/v1/orders", {
    data: {
      branchId: branch,
      type: "PICKUP",
      customerName: "Test Guest",
      customerEmail: "test.guest@example.com",
      customerPhone: "+1 512 555 0199",
      paymentMethod: "card",
      lines: [{ menuItemId: item, quantity: 1 }],
    },
  });
  expect(created.status()).toBe(201);
  const { orderId, reference } = await created.json();

  const { orders } = await (await page.request.get("/api/v1/me/orders")).json();
  expect(orders.map((order: { id: string }) => order.id)).toEqual([orderId]);

  await page.goto("/account/orders");
  const row = page.getByTestId(`order-${reference}`);
  await expect(row).toContainText("Harvest Quinoa Bowl");
  await row.getByRole("link", { name: `Receipt for order ${reference}` }).click();
  await page.waitForURL(`/order/${orderId}`);
});

test("the new pages have no serious accessibility problems", async ({ page }) => {
  const check = async (path: string) => {
    await page.goto(path);
    await page.waitForLoadState("load");
    // Next's dev overlay is not part of the site.
    const { violations } = await new AxeBuilder({ page }).exclude("nextjs-portal").analyze();
    const serious = violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
    expect(serious.map((violation) => `${path}: ${violation.id}: ${violation.nodes[0]?.target}`)).toEqual([]);
  };

  await check("/cook");
  await check(`/cook/${RECIPE}`);
  await check(`/cook/${RECIPE}/cooking`);
  await signUp(page, "Axe");
  await page.request.post("/api/v1/me/addresses", { data: { label: "Home", street: "12 Test Street", city: "Austin" } });
  for (const path of ["/account", "/account/diet", "/account/addresses", "/account/orders", "/account/cookbook", "/account/cookbook/print"]) {
    await check(path);
  }
});

test("the account pages fit a phone with no sideways scrolling", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 360, height: 740 } });
  const page = await context.newPage();
  await signUp(page, "Phone");
  for (const path of ["/account", "/account/diet", "/account/addresses", "/account/orders", "/account/cookbook", `/cook/${RECIPE}`, `/cook/${RECIPE}/cooking`]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(360);
  }
  await context.close();
});

test("the account area and its API need signing in", async ({ page, request }) => {
  await page.goto("/account");
  await page.waitForURL(/\/login\?next=%2Faccount/);
  await page.goto("/account/cookbook");
  await page.waitForURL(/\/login\?next=/);

  for (const path of ["/api/v1/me", "/api/v1/me/addresses", "/api/v1/me/orders", "/api/v1/me/cookbook", "/api/v1/me/cookbook.pdf"]) {
    expect((await request.get(path)).status(), path).toBe(401);
  }
  expect((await request.put("/api/v1/me/diet", { data: { diets: [], allergies: [] } })).status()).toBe(401);
  expect((await request.post("/api/v1/me/cookbook", { data: { recipeId: "x" } })).status()).toBe(401);
});

test("the account pages show their empty states and the honest payment note", async ({ page }) => {
  await signUp(page, "Fresh");
  await page.goto("/account");
  await expect(page.getByText("Saved payment methods are not available yet.")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Your account" }).getByRole("link", { name: "Bookings" })).toHaveAttribute("href", "/account/bookings");

  await page.getByLabel("Phone").fill("+1 512 555 0123");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();

  await page.goto("/account/orders");
  await expect(page.getByRole("heading", { name: "No orders yet" })).toBeVisible();
  await page.goto("/account/cookbook");
  await expect(page.getByRole("heading", { name: "Nothing saved yet" })).toBeVisible();
});

test("the recipe page scales servings, switches units and shows per-serving facts", async ({ page, request }) => {
  await page.goto(`/cook/${RECIPE}`);
  const quinoa = page.getByTestId("ingredient-line").filter({ hasText: "quinoa" });
  await expect(quinoa).toHaveText("1 2/3 cups cooked quinoa");
  await expect(page.getByTestId("servings")).toHaveText("Serves 2");

  await page.getByRole("button", { name: "More servings" }).click();
  await page.getByRole("button", { name: "More servings" }).click();
  await expect(page.getByTestId("servings")).toHaveText("Serves 4");
  await expect(quinoa).toHaveText("3 1/3 cups cooked quinoa");

  await page.getByText("Metric", { exact: true }).click();
  await expect(quinoa).toHaveText("600 g cooked quinoa");

  // The scaler stops at 1 and 6 people.
  await page.getByRole("button", { name: "More servings" }).click();
  await page.getByRole("button", { name: "More servings" }).click();
  await expect(page.getByRole("button", { name: "More servings" })).toBeDisabled();
  await expect(page.getByTestId("servings")).toHaveText("Serves 6");

  // Same ingredients, same per-serving nutrition and allergens as the menu dish.
  const { dish } = await (await request.get(`/api/v1/dishes/${RECIPE}`)).json();
  const { recipe } = await (await request.get(`/api/v1/recipes/${RECIPE}`)).json();
  expect(recipe.nutrition).toEqual(dish.nutrition);
  expect(recipe.facts).toEqual(dish.facts);
  await expect(page.getByTestId("kcal")).toContainText(String(dish.nutrition.kcal));
  await expect(page.getByText("Draft data.")).toBeVisible();

  await expect(page.getByRole("link", { name: "Too busy? Order it" })).toHaveAttribute("href", `/dish/${RECIPE}`);
});

test("the library filters by diet, time, difficulty and category, and searches", async ({ page, request }) => {
  // Admins can publish more recipes at any time, so the full count comes from the API.
  const { recipes } = await (await request.get("/api/v1/recipes")).json();
  expect(recipes.length).toBeGreaterThanOrEqual(12);

  await page.goto("/cook");
  const cards = page.getByRole("region", { name: "Recipes" }).getByRole("article");
  await expect(cards).toHaveCount(recipes.length);

  await page.getByRole("list", { name: "Filter by category" }).getByRole("link", { name: "Drinks" }).click();
  await page.waitForURL(/category=drinks/);
  await expect(cards).toHaveCount(2);

  await page.getByRole("list", { name: "Filter by category" }).getByRole("link", { name: "Drinks" }).click();
  await page.waitForURL((url) => !url.search.includes("category"));
  await expect(cards).toHaveCount(recipes.length);

  await page.goto("/cook?diet=vegan&time=30&difficulty=easy");
  await expect(page.getByRole("status")).toContainText("found");
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThan(recipes.length);

  await page.goto("/cook");
  await page.getByRole("searchbox", { name: "Search recipes" }).fill("salmon");
  await page.getByRole("button", { name: "Search" }).click();
  await page.waitForURL(/q=salmon/);
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("Miso Salmon Bowl");
});

test("the recipes API only serves published recipes, with no private video details", async ({ request }) => {
  const list = await (await request.get("/api/v1/recipes?category=breakfast")).json();
  expect(list.recipes.map((r: { slug: string }) => r.slug).sort()).toEqual(["avocado-egg-sourdough", "berry-overnight-oats"]);

  const { recipe } = await (await request.get(`/api/v1/recipes/${RECIPE}`)).json();
  expect(recipe.video).toBeNull();
  expect(recipe.hasVideo).toBe(false);
  expect(recipe.steps[0].stepNo).toBe(1);
  expect(recipe.dish.slug).toBe(RECIPE);
  expect(recipe.status).toBe("PUBLISHED");

  expect((await request.get("/api/v1/recipes/not-a-recipe")).status()).toBe(404);
});

test("cooking mode steps through a recipe, and timers keep running between steps", async ({ page }) => {
  await page.goto(`/cook/${RECIPE}`);
  await page.getByRole("button", { name: "More servings" }).click();
  await page.getByRole("link", { name: "Start cooking mode" }).click();
  await page.waitForURL(/\/cook\/harvest-quinoa-bowl\/cooking\?servings=3&units=us/);

  // The ingredient list carries the servings chosen on the recipe page.
  await expect(page.getByText("Serves 3")).toBeVisible();
  await expect(page.getByTestId("cooking-ingredient").filter({ hasText: "quinoa" })).toHaveText("2 1/2 cups cooked quinoa");

  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByTestId("cooking-step-number")).toHaveText("Step 1 of 6");
  await page.getByRole("button", { name: "Start timer, step 1" }).click();
  await expect(page.getByRole("button", { name: "Pause timer, step 1" })).toBeVisible();

  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByTestId("cooking-step-number")).toHaveText("Step 2 of 6");
  const others = page.getByTestId("running-timers");
  await expect(others).toContainText("Step 1");
  const first = await others.getByRole("timer").innerText();
  await expect.poll(async () => others.getByRole("timer").innerText(), { timeout: 15_000 }).not.toBe(first);

  // Keyboard works too, and Back returns to the step without touching its running timer.
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("cooking-step-number")).toHaveText("Step 1 of 6");
  await expect(page.getByRole("button", { name: "Pause timer, step 1" })).toBeVisible();

  for (let step = 2; step <= 6; step++) {
    await page.getByRole("button", { name: "Next step" }).click();
    await expect(page.getByTestId("cooking-step-number")).toHaveText(`Step ${step} of 6`);
  }
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.getByRole("heading", { name: /All done/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to the recipe" })).toBeVisible();
});

test("cooking mode still works when the browser refuses to keep the screen on", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "wakeLock", { value: { request: () => Promise.reject(new DOMException("Refused", "NotAllowedError")) } });
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`/cook/${RECIPE}/cooking`);
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByTestId("cooking-step-number")).toHaveText("Step 1 of 6");
  await expect(page.getByText("Your screen stays on")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("cooking mode holds a wake lock when the browser allows one", async ({ page }) => {
  await page.addInitScript(() => {
    const lock = { released: false, addEventListener() {}, release: async () => {} };
    Object.defineProperty(navigator, "wakeLock", { value: { request: async () => lock } });
  });
  await page.goto(`/cook/${RECIPE}/cooking`);
  await expect(page.getByText("Your screen stays on while you cook.")).toBeVisible();
});

test("the Mux webhook refuses a call with no valid signature", async ({ request }) => {
  const response = await request.post("/api/webhooks/mux", {
    data: { id: "evt_fake", type: "video.asset.ready", data: { passthrough: "x", playback_ids: [{ id: "fake", policy: "public" }] } },
    headers: { "mux-signature": "t=1,v1=00" },
  });
  expect(response.status()).toBe(400);
});

test("recipe admin is for admins, and video upload says when it is not configured", async ({ page, browser, baseURL }) => {
  const customer = await newCustomer(browser, baseURL!, "Curious");
  await customer.page.goto("/admin/recipes");
  await customer.page.waitForURL(/denied=1/);
  await customer.context.close();

  await signIn(page, "admin@nature.test");
  await page.goto("/admin/recipes");
  await expect(page.getByRole("link", { name: "Harvest Quinoa Bowl" })).toBeVisible();
  await page.getByRole("link", { name: "Harvest Quinoa Bowl" }).click();
  await page.waitForURL(/\/admin\/recipes\/.+/);
  await expect(page.getByTestId("video-upload")).toContainText("Video is not configured yet");

  // Create a draft, check guests cannot see it, publish it, and check they can.
  const slug = `e2e-recipe-${Date.now()}`;
  await page.goto("/admin/recipes/new");
  await page.getByLabel("Title").fill("E2E Draft Recipe");
  await page.getByLabel("Web address").fill(slug);
  await page.getByLabel("Description").fill("A recipe made by the test suite.");
  await page.getByLabel("Ingredient 1", { exact: true }).selectOption({ label: "Quinoa" });
  await page.getByLabel("Grams").fill("300");
  await page.getByLabel("Shown as").fill("1 2/3 cups cooked quinoa");
  await page.getByLabel("Step 1", { exact: true }).fill("Cook the quinoa.");
  await page.getByLabel("Timer (seconds)").fill("600");
  await page.getByRole("button", { name: "Create recipe" }).click();
  await page.waitForURL(/created=1/);
  await expect(page.getByText("Recipe created.")).toBeVisible();

  expect((await browser.newContext({ baseURL }).then((c) => c.request.get(`/api/v1/recipes/${slug}`))).status()).toBe(404);

  await page.getByLabel("Status").selectOption("PUBLISHED");
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
  const published = await browser.newContext({ baseURL }).then((c) => c.request.get(`/api/v1/recipes/${slug}`));
  expect(published.status()).toBe(200);
  const { recipe } = await published.json();
  // 300 g of quinoa at 120 kcal per 100 g, for 2 servings.
  expect(recipe.nutrition.kcal).toBe(180);
  expect(recipe.steps[0].timerSec).toBe(600);

  // Back to draft, so test runs do not fill the guest library.
  await page.getByLabel("Status").selectOption("DRAFT");
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect.poll(async () => (await page.request.get(`/api/v1/recipes/${slug}`)).status()).toBe(404);
});
