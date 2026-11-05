import { expect, test } from "@playwright/test";
import { addDish, chooseBranch, fillContact, payAndTrack, signedInPage } from "./helpers";

test.beforeEach(async ({ context, baseURL }) => {
  await chooseBranch(context, baseURL!);
});

test("guest orders for pickup and pays by card, staff take it through to collected", async ({ page, browser, baseURL }) => {
  await addDish(page, "harvest-quinoa-bowl");
  await page.goto("/cart");
  // A full cart must never flash "empty" while the page loads.
  await expect(page.getByRole("heading", { name: "Your cart is empty" })).toHaveCount(0);
  await page.getByRole("link", { name: "Checkout" }).click();

  await fillContact(page);
  // $14.95 + 8.25% tax ($1.23) = $16.18
  await expect(page.getByTestId("total")).toHaveText("$16.18");
  const { reference } = await payAndTrack(page);
  await expect(page.getByTestId("current-step")).toContainText("Received");

  const staff = await signedInPage(browser, baseURL!, "staff@nature.test");
  await staff.page.goto("/staff/orders");
  const card = staff.page.getByTestId(`order-${reference}`);
  await card.getByRole("button", { name: "Accept" }).click();
  await card.getByRole("button", { name: "Start preparing" }).click();

  // The guest's open page updates by itself.
  await expect(page.getByTestId("current-step")).toContainText("Preparing");

  await card.getByRole("button", { name: "Mark ready" }).click();
  await expect(page.getByTestId("order-headline")).toHaveText("Ready for pickup");
  await card.getByRole("button", { name: "Mark collected" }).click();
  await expect(page.getByTestId("order-headline")).toHaveText("Collected. Enjoy!");
  await staff.context.close();
});

test("guest orders delivery, staff assign a driver, the driver delivers it", async ({ page, browser, baseURL }) => {
  await addDish(page, "margherita-pizza");
  await addDish(page, "green-juice");
  await page.goto("/checkout");

  await page.getByRole("radio", { name: /Delivery/ }).check({ force: true });
  await page.getByLabel("Street address").fill("12 Test Street");
  await page.getByLabel("City").fill("Austin");
  await fillContact(page);
  // $22.45 + $3.99 delivery + $1.85 tax = $28.29
  await expect(page.getByTestId("total")).toHaveText("$28.29");
  await page.getByRole("radio", { name: /PayPal/ }).check({ force: true });
  const { reference } = await payAndTrack(page);

  const staff = await signedInPage(browser, baseURL!, "staff@nature.test");
  await staff.page.goto("/staff/orders");
  const card = staff.page.getByTestId(`order-${reference}`);
  await card.getByRole("button", { name: "Accept" }).click();
  await card.getByRole("button", { name: "Start preparing" }).click();
  await card.getByRole("button", { name: "Mark ready" }).click();
  await expect(card.getByRole("button", { name: "Mark collected" })).toHaveCount(0);
  await card.getByLabel("Assign a driver").selectOption({ label: "Dana Driver" });
  await card.getByRole("button", { name: "Assign", exact: true }).click();
  await expect(card.getByText("Driver: Dana Driver")).toBeVisible();

  const driver = await signedInPage(browser, baseURL!, "driver@nature.test");
  await driver.page.goto("/driver");
  const job = driver.page.getByTestId(`delivery-${reference}`);
  await job.getByRole("button", { name: "Picked up" }).click();
  await expect(page.getByTestId("order-headline")).toHaveText("On the way to you");
  await job.getByRole("button", { name: "Delivered" }).click();
  await expect(page.getByTestId("order-headline")).toHaveText("Delivered. Enjoy!");

  await staff.context.close();
  await driver.context.close();
});

test("staff hand a delivery to the third-party courier", async ({ page, browser, baseURL }) => {
  await addDish(page, "margherita-pizza");
  await addDish(page, "green-juice");
  await page.goto("/checkout");
  await page.getByRole("radio", { name: /Delivery/ }).check({ force: true });
  await page.getByLabel("Street address").fill("12 Test Street");
  await page.getByLabel("City").fill("Austin");
  await fillContact(page);
  await expect(page.getByTestId("total")).toBeVisible();
  const { reference } = await payAndTrack(page);

  const staff = await signedInPage(browser, baseURL!, "staff@nature.test");
  await staff.page.goto("/staff/orders");
  const card = staff.page.getByTestId(`order-${reference}`);
  await card.getByRole("button", { name: "Accept" }).click();
  await card.getByRole("button", { name: "No driver free? Send to courier" }).click();
  await expect(card.getByText("Courier: simulated")).toBeVisible();
  await staff.context.close();
});

test("guest builds a bowl with a live price and orders it", async ({ page }) => {
  await page.goto("/build-a-bowl");
  await expect(page.getByTestId("bowl-price")).toHaveText("$10.95");
  // An empty bowl must not claim to be free of allergens.
  await expect(page.getByText("None of the nine major allergens")).toHaveCount(0);

  // Guests tap the visible card, not the hidden input inside it.
  const card = (name: string) => page.locator("label").filter({ hasText: name });
  // The first tap can land before the page is interactive, so retry until it registers.
  await expect(async () => {
    await card("Quinoa").click();
    await expect(page.getByTestId("bowl-summary")).toContainText("Quinoa", { timeout: 1000 });
  }).toPass();
  await page.getByRole("button", { name: "Next: Protein" }).click();
  await card("Miso salmon").click();
  await expect(page.getByTestId("bowl-price")).toHaveText("$15.45");
  await expect(page.getByRole("region", { name: "Allergens" })).toContainText("Fish");

  await page.getByRole("button", { name: "Next: Toppings" }).click();
  await card("Avocado").click();
  await expect(page.getByTestId("bowl-price")).toHaveText("$16.95");

  await page.getByRole("button", { name: "Next: Dressing" }).click();
  await card("Lemon-tahini").click();
  await expect(page.getByRole("region", { name: "Allergens" })).toContainText("Sesame");
  await page.getByRole("button", { name: "Add to cart" }).click();

  await page.waitForURL("**/cart");
  await expect(page.getByText("Quinoa, Miso salmon, Avocado, Lemon-tahini")).toBeVisible();
  await page.getByRole("link", { name: "Checkout" }).click();
  // $16.95 + 8.25% tax ($1.40) = $18.35; proves the server agrees with the live price.
  await expect(page.getByTestId("total")).toHaveText("$18.35");
});

test("a declined card does not place the order, and the guest can retry", async ({ page }) => {
  await addDish(page, "harvest-quinoa-bowl");
  await page.goto("/checkout");
  await fillContact(page);
  await page.getByRole("button", { name: /^Continue to pay \$/ }).click();
  await page.getByRole("button", { name: "Simulate a declined card" }).click();
  await expect(page.getByText("The test card was declined.")).toBeVisible();
  await expect(page).toHaveURL(/\/checkout/);

  await page.getByRole("button", { name: /^Simulate paying/ }).click();
  await page.waitForURL(/\/order\//);
  await expect(page.getByTestId("order-headline")).toHaveText("We have your order");
});
