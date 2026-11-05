import { expect, test } from "@playwright/test";
import { branchId, menuItemId, signedInPage } from "./helpers";

const ORDER = {
  type: "PICKUP",
  customerName: "Test Guest",
  customerEmail: "test.guest@example.com",
  customerPhone: "+1 512 555 0199",
  paymentMethod: "card",
};

test("the browser cannot set its own price", async ({ request }) => {
  const [branch, item] = await Promise.all([branchId(request, "downtown"), menuItemId(request, "harvest-quinoa-bowl")]);
  const response = await request.post("/api/v1/orders", {
    data: { ...ORDER, branchId: branch, lines: [{ menuItemId: item, quantity: 1, unitPriceCents: 1, totalCents: 1 }], totalCents: 1 },
  });
  expect(response.status()).toBe(201);
  // $14.95 + tax, whatever the request claimed.
  expect((await response.json()).totalCents).toBe(1618);
});

test("an option from another dish is refused", async ({ request }) => {
  const [branch, item] = await Promise.all([branchId(request, "downtown"), menuItemId(request, "harvest-quinoa-bowl")]);
  const response = await request.post("/api/v1/orders/quote", {
    data: { branchId: branch, type: "PICKUP", lines: [{ menuItemId: item, quantity: 1, optionIds: ["not-a-real-option"] }] },
  });
  expect(response.status()).toBe(422);
  expect((await response.json()).error.code).toBe("OPTION_INVALID");
});

test("bad input is refused with field errors", async ({ request }) => {
  const response = await request.post("/api/v1/orders", { data: { branchId: "x", type: "PICKUP", lines: [], customerEmail: "nope" } });
  expect(response.status()).toBe(400);
  expect((await response.json()).error.code).toBe("INVALID_INPUT");
});

test("staff endpoints refuse anyone who is not signed in", async ({ request }) => {
  expect((await request.get("/api/v1/staff/orders")).status()).toBe(401);
  expect((await request.get("/api/v1/driver/deliveries")).status()).toBe(401);
});

test("staff cannot see or change another branch's orders", async ({ browser, baseURL, request }) => {
  const [downtown, item] = await Promise.all([branchId(request, "downtown"), menuItemId(request, "harvest-quinoa-bowl")]);
  const created = await request.post("/api/v1/orders", { data: { ...ORDER, branchId: downtown, lines: [{ menuItemId: item, quantity: 1 }] } });
  const { orderId, payment } = await created.json();
  await request.post("/api/v1/payments/simulate", { data: { paymentId: payment.paymentId, outcome: "succeed" } });

  const other = await signedInPage(browser, baseURL!, "staff.riverside@nature.test");
  expect((await other.page.request.get(`/api/v1/staff/orders?branchId=${downtown}`)).status()).toBe(403);
  const change = await other.page.request.patch(`/api/v1/staff/orders/${orderId}/status`, { data: { status: "ACCEPTED" } });
  expect(change.status()).toBe(403);
  await other.context.close();
});

test("a customer cannot use staff endpoints", async ({ browser, baseURL }) => {
  const guest = await signedInPage(browser, baseURL!, "guest@nature.test");
  expect((await guest.page.request.get("/api/v1/staff/orders")).status()).toBe(403);
  await guest.context.close();
});

test("a driver cannot change a delivery assigned to someone else", async ({ browser, baseURL, request }) => {
  const [downtown, item] = await Promise.all([branchId(request, "downtown"), menuItemId(request, "margherita-pizza")]);
  const created = await request.post("/api/v1/orders", {
    data: { ...ORDER, type: "DELIVERY", address: { street: "12 Test Street", city: "Austin" }, branchId: downtown, lines: [{ menuItemId: item, quantity: 2 }] },
  });
  const { orderId } = await created.json();
  const driver = await signedInPage(browser, baseURL!, "driver@nature.test");
  const response = await driver.page.request.patch(`/api/v1/driver/deliveries/${orderId}`, { data: { status: "DELIVERED" } });
  expect(response.status()).toBe(404);
  await driver.context.close();
});

test("an unpaid order cannot be pushed to the kitchen by the simulated endpoint twice", async ({ request }) => {
  const [branch, item] = await Promise.all([branchId(request, "downtown"), menuItemId(request, "harvest-quinoa-bowl")]);
  const created = await request.post("/api/v1/orders", { data: { ...ORDER, branchId: branch, lines: [{ menuItemId: item, quantity: 1 }] } });
  const { orderId, payment } = await created.json();
  for (let i = 0; i < 2; i++) {
    const paid = await request.post("/api/v1/payments/simulate", { data: { paymentId: payment.paymentId, outcome: "succeed" } });
    expect(paid.ok()).toBeTruthy();
  }
  const order = await request.get(`/api/v1/orders/${orderId}`);
  expect((await order.json()).order.status).toBe("RECEIVED");
});

test("a guest can cancel before the kitchen accepts, and is refunded", async ({ request }) => {
  const [branch, item] = await Promise.all([branchId(request, "downtown"), menuItemId(request, "harvest-quinoa-bowl")]);
  const created = await request.post("/api/v1/orders", { data: { ...ORDER, branchId: branch, lines: [{ menuItemId: item, quantity: 1 }] } });
  const { orderId, payment, totalCents } = await created.json();
  await request.post("/api/v1/payments/simulate", { data: { paymentId: payment.paymentId, outcome: "succeed" } });

  expect((await request.post(`/api/v1/orders/${orderId}/cancel`)).ok()).toBeTruthy();
  const { order } = await (await request.get(`/api/v1/orders/${orderId}`)).json();
  expect(order.status).toBe("CANCELLED");
  expect(order.refundedCents).toBe(totalCents);
  expect((await request.post(`/api/v1/orders/${orderId}/cancel`)).status()).toBe(409);
});

test("delivery outside the 2 km zone is refused when a location is known", async ({ request }) => {
  const [branch, item] = await Promise.all([branchId(request, "downtown"), menuItemId(request, "margherita-pizza")]);
  const response = await request.post("/api/v1/orders", {
    data: {
      ...ORDER,
      type: "DELIVERY",
      branchId: branch,
      // About 20 km north of the Downtown branch.
      address: { street: "1 Far Away Road", city: "Austin", lat: 30.45, lng: -97.74 },
      lines: [{ menuItemId: item, quantity: 2 }],
    },
  });
  expect(response.status()).toBe(422);
  expect((await response.json()).error.code).toBe("OUT_OF_ZONE");
});
