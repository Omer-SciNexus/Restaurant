import "dotenv/config";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type APIResponse, type Page } from "@playwright/test";
import pg from "pg";
import { addDays } from "../../lib/booking/slots";
import { branchId, signedInPage } from "./helpers";

// Runs against the seeded database and the real routes. Test guests all use @booking.test
// addresses, so they are cleared before and after, and slots are picked at random so a
// failed run cannot get in the way of the next one.

test.setTimeout(240_000);

const PHONE = "+1 512 555 0142";

/**
 * Direct database access, to read money rows and to age a booking. The local database (prisma
 * dev) serves one connection at a time and resets any other at once, and the dev server can
 * hold that connection for several seconds. So: one short connection per query, waiting for a
 * turn for up to a minute. A real SQL error has a severity and fails straight away.
 */
const db = {
  async query(text: string, values?: unknown[]) {
    for (let attempt = 0; ; attempt++) {
      const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
      client.on("error", () => {});
      try {
        await client.connect();
        return await client.query(text, values);
      } catch (error) {
        if (attempt >= 60 || (error as { severity?: string }).severity) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } finally {
        await client.end().catch(() => {});
      }
    }
  },
};

const uniqueName = (tag: string) => `${tag} ${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
const emailFor = (tag: string) => `${tag.toLowerCase().replace(/\s+/g, ".")}@booking.test`;

async function clearTestGuests() {
  await db.query(`DELETE FROM reservations WHERE email LIKE '%@booking.test'`);
  await db.query(`DELETE FROM waitlist_entries WHERE email LIKE '%@booking.test'`);
  await db.query(`DELETE FROM event_requests WHERE "contactEmail" LIKE '%@booking.test'`);
}

async function settings() {
  const { rows } = await db.query(`SELECT "depositPerGuestCents", "depositMinParty", "freeCancelHours", "cateringLeadDays" FROM settings WHERE id = 1`);
  return rows[0] as { depositPerGuestCents: number; depositMinParty: number; freeCancelHours: number; cateringLeadDays: number };
}

async function paymentRow(paymentId: string) {
  const { rows } = await db.query(`SELECT status, "amountCents", "refundedAmountCents" FROM payments WHERE id = $1`, [paymentId]);
  return rows[0] as { status: string; amountCents: number; refundedAmountCents: number };
}

async function paymentOfReservation(reservationId: string) {
  const { rows } = await db.query(`SELECT p.status, p."amountCents", p."refundedAmountCents", p.id FROM reservations r JOIN payments p ON p.id = r."paymentId" WHERE r.id = $1`, [reservationId]);
  return rows[0] as { id: string; status: string; amountCents: number; refundedAmountCents: number };
}

test.beforeAll(clearTestGuests);
test.afterAll(clearTestGuests);

/**
 * The local database (prisma dev) can drop a query when several things use it at once, and the
 * busy dev server can reset a connection, so a 5xx or a reset here means try again. A wrong
 * answer still fails the test, as does any other status.
 */
async function steady(call: () => Promise<APIResponse>): Promise<APIResponse> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await call();
      if (response.status() < 500 || attempt >= 4) return response;
    } catch (error) {
      if (attempt >= 4 || !String(error).includes("ECONNRESET")) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

type ApiSlot = { iso: string; time: string; label: string; available: boolean };
type ApiDay = { date: string; today: string; lastDate: string; reason: string | null; deposit: { amountCents: number }; slots: ApiSlot[] };

async function day(request: APIRequestContext, branch: string, party: number, date?: string): Promise<ApiDay> {
  const response = await steady(() => request.get(`/api/v1/branches/${branch}/slots?party=${party}${date ? `&date=${date}` : ""}`));
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}

/** A random free slot at least this many days ahead, so reruns do not collide. */
async function freeSlot(request: APIRequestContext, branch: string, party: number, minDays = 3) {
  const { today, lastDate } = await day(request, branch, party);
  const span = Math.round((Date.parse(lastDate) - Date.parse(today)) / 86_400_000) - minDays;
  for (let attempt = 0; attempt < 40; attempt++) {
    const date = addDays(today, minDays + Math.floor(Math.random() * span));
    const free = (await day(request, branch, party, date)).slots.filter((slot) => slot.available);
    if (free.length > 0) return { date, ...free[Math.floor(Math.random() * free.length)]! };
  }
  throw new Error("No free slot found");
}

async function bookViaApi(request: APIRequestContext, branch: string, startsAt: string, partySize: number, tag = uniqueName("Api")) {
  const response = await steady(() => request.post("/api/v1/reservations", { data: { branchId: branch, startsAt, partySize, name: tag, email: emailFor(tag), phone: PHONE, paymentMethod: "card" } }));
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()) as { reservationId: string; status: string; depositCents: number; payment: { paymentId: string } | null };
}

const simulate = (request: APIRequestContext, paymentId: string, outcome = "succeed") => steady(() => request.post("/api/v1/payments/simulate", { data: { paymentId, outcome } }));

async function reservationView(request: APIRequestContext, id: string) {
  const response = await steady(() => request.get(`/api/v1/reservations/${id}`));
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()).reservation;
}

async function waitlistStatus(request: APIRequestContext, id: string) {
  return (await (await steady(() => request.get(`/api/v1/waitlist/${id}`))).json()).entry.status as string;
}

/** Fills an empty slot with four deposit-free parties, so any one of them can free a known amount of room. */
async function fillSlot(request: APIRequestContext, branch: string, startsAt: string) {
  const parties = [6, 6, 6, 2];
  const bookings = [];
  for (const size of parties) bookings.push({ size, ...(await bookViaApi(request, branch, startsAt, size)) });
  return bookings;
}

/** Waits until the form has hydrated and its first answer has arrived. */
async function openBookingForm(page: Page) {
  await page.goto("/book?branch=downtown");
  await expect(page.getByTestId("slot-status")).not.toHaveText("Finding free times...");
}

async function chooseTable(page: Page, date: string, party: number) {
  await page.getByLabel("Party size").selectOption(String(party));
  await page.getByLabel("Date").fill(date);
  await expect(page.getByTestId("slot-status")).not.toHaveText("Finding free times...");
}

async function fillGuest(page: Page, name: string) {
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Email").fill(emailFor(name));
  await page.getByLabel("Phone").fill(PHONE);
}

test("group of 8 books a table, pays a deposit, then cancels and is refunded", async ({ page, request }) => {
  const downtown = await branchId(request, "downtown");
  const policy = await settings();
  const deposit = 8 * policy.depositPerGuestCents;
  const money = `$${(deposit / 100).toFixed(2)}`;
  const slot = await freeSlot(request, downtown, 8);
  const name = uniqueName("Group");

  await openBookingForm(page);
  await chooseTable(page, slot.date, 8);
  await page.getByRole("radio", { name: slot.label, exact: true }).check({ force: true });

  // The rule and the amount are on screen before the guest commits to anything.
  await expect(page.getByRole("heading", { name: `Deposit: ${money}` })).toBeVisible();
  await expect(page.getByTestId("cancel-rule")).toContainText(`at least ${policy.freeCancelHours} hours before your table`);
  await expect(page.getByTestId("cancel-rule")).toContainText(money);

  await page.getByLabel("Occasion (optional)").selectOption("Birthday");
  await page.getByLabel("Special requests (optional)").fill("A high chair, please");
  await fillGuest(page, name);
  // The local database can drop this request when busy. The form then says so and stays filled
  // in, so press again as a guest would; a failed try must not leave anything in the way.
  const declined = page.getByRole("button", { name: "Simulate a declined card" });
  await expect(async () => {
    if (await declined.isVisible()) return;
    await page.getByRole("button", { name: `Continue to pay ${money}` }).click({ timeout: 5000 });
    await expect(declined).toBeVisible({ timeout: 15_000 });
  }).toPass({ timeout: 90_000 });

  // A declined card keeps the table held, and the guest can try again.
  await declined.click();
  await expect(page.getByRole("alert").filter({ hasText: "declined" })).toBeVisible();
  await page.getByRole("button", { name: /^Simulate paying/ }).click();
  await page.waitForURL(/\/book\/[0-9a-f-]{36}$/);

  const reservationId = new URL(page.url()).pathname.split("/").pop()!;
  await expect(page.getByTestId("booking-headline")).toHaveText("Your table is booked");
  await expect(page.getByTestId("deposit-status")).toHaveText("Deposit paid");
  await expect(page.getByText("Birthday")).toBeVisible();
  await expect(page.getByText("A high chair, please")).toBeVisible();
  await expect(page.getByTestId("cancel-rule")).toContainText("refunded in full");

  // Staff see the booking in the day view.
  const staff = await signedInPage(page.context().browser()!, new URL(page.url()).origin, "staff@nature.test");
  await staff.page.goto(`/staff/reservations?date=${slot.date}`);
  const card = staff.page.getByTestId(`reservation-${name}`);
  await expect(card).toContainText("8 guests");
  await expect(card).toContainText("A high chair, please");
  await expect(card).toContainText(`Deposit paid: ${money}`);
  await staff.context.close();

  // The exact outcome shows before the guest acts.
  await page.getByRole("button", { name: "Cancel booking" }).click();
  await expect(page.getByTestId("cancel-outcome")).toHaveText(`If you cancel now, your ${money} deposit is refunded in full.`);
  await page.getByRole("button", { name: "Yes, cancel it" }).click();

  await expect(page.getByTestId("booking-notice")).toContainText(`${money} has been refunded`);
  await expect(page.getByTestId("booking-headline")).toHaveText("This booking is cancelled");
  await expect(page.getByTestId("deposit-status")).toHaveText("Deposit refunded");

  const payment = await paymentOfReservation(reservationId);
  expect(payment).toMatchObject({ status: "REFUNDED", amountCents: deposit, refundedAmountCents: deposit });
  // Cancelling twice cannot refund twice.
  expect((await request.post(`/api/v1/reservations/${reservationId}/cancel`)).status()).toBe(409);
});

test("a late cancellation does not get the deposit back", async ({ page, request }) => {
  const downtown = await branchId(request, "downtown");
  const policy = await settings();
  const money = `$${((8 * policy.depositPerGuestCents) / 100).toFixed(2)}`;
  // Later today is inside any cancellation window of a few hours or more.
  const today = await day(request, downtown, 8);
  const slot = today.slots.filter((s) => s.available).at(-1)!;
  const booking = await bookViaApi(request, downtown, slot.iso, 8);
  await simulate(request, booking.payment!.paymentId);

  await page.goto(`/book/${booking.reservationId}`);
  await expect(page.getByTestId("deposit-status")).toHaveText("Deposit paid");
  await expect(page.getByTestId("cancel-rule")).toContainText(`if you cancel, your ${money} deposit is kept`);
  await page.getByRole("button", { name: "Cancel booking" }).click();
  await expect(page.getByTestId("cancel-outcome")).toContainText(`your ${money} deposit is kept`);
  await page.getByRole("button", { name: "Yes, cancel it" }).click();

  await expect(page.getByTestId("booking-notice")).toContainText(`Your ${money} deposit has been kept`);
  await expect(page.getByTestId("booking-headline")).toHaveText("This booking is cancelled");
  await expect(page.getByTestId("deposit-status")).toHaveText("Deposit kept");

  const payment = await paymentOfReservation(booking.reservationId);
  expect(payment).toMatchObject({ status: "SUCCEEDED", refundedAmountCents: 0 });
});

test("guest joins a waitlist and gets a free table", async ({ page, request }) => {
  const downtown = await branchId(request, "downtown");
  const slot = await freeSlot(request, downtown, 20);
  const bookings = await fillSlot(request, downtown, slot.iso);
  const name = uniqueName("Waiting");

  await openBookingForm(page);
  await chooseTable(page, slot.date, 2);
  const full = page.getByRole("radio", { name: new RegExp(`^${slot.label}.*Full`) });
  await full.check({ force: true });
  await expect(page.getByRole("status").filter({ hasText: `${slot.label} is full` })).toBeVisible();
  await fillGuest(page, name);
  await page.getByRole("button", { name: "Join the waitlist" }).click();
  await page.waitForURL(/\/book\/waitlist\//);
  await expect(page.getByTestId("waitlist-headline")).toHaveText("You are on the waitlist");
  const entryId = new URL(page.url()).pathname.split("/").pop()!;

  // Staff can see who is waiting.
  const staff = await signedInPage(page.context().browser()!, new URL(page.url()).origin, "staff@nature.test");
  await staff.page.goto("/staff/waitlist");
  await expect(staff.page.getByTestId(`waitlist-${name}`)).toContainText("Waiting");

  // Someone cancels, and the guest's open page updates by itself.
  expect((await request.post(`/api/v1/reservations/${bookings[3]!.reservationId}/cancel`)).ok()).toBeTruthy();
  await expect(page.getByTestId("waitlist-headline")).toHaveText("A table has come free");
  await page.getByRole("button", { name: "Confirm this table" }).click();

  await page.waitForURL(/\/book\/[0-9a-f-]{36}$/);
  await expect(page.getByTestId("booking-headline")).toHaveText("Your table is booked");
  await expect(page.getByTestId("booking-party")).toHaveText("2");
  expect(await waitlistStatus(request, entryId)).toBe("CONFIRMED");

  // The room is taken again, so nobody can double-book it.
  const after = await day(request, downtown, 1, slot.date);
  expect(after.slots.find((s) => s.iso === slot.iso)!.available).toBe(false);
  await staff.context.close();
});

test("the oldest entry that fits is offered first, and a bigger one keeps its place", async ({ request }) => {
  const downtown = await branchId(request, "downtown");
  const slot = await freeSlot(request, downtown, 20);
  const bookings = await fillSlot(request, downtown, slot.iso);

  const join = async (tag: string, partySize: number) => {
    const name = uniqueName(tag);
    const response = await request.post("/api/v1/waitlist", { data: { branchId: downtown, startsAt: slot.iso, partySize, name, email: emailFor(name), phone: PHONE } });
    expect(response.status()).toBe(201);
    return ((await response.json()) as { id: string }).id;
  };
  const big = await join("Big", 8);
  const firstSmall = await join("First", 2);
  const secondSmall = await join("Second", 2);

  // Two seats free up: the party of 8 cannot fit, the older party of 2 is told, the younger is not.
  await request.post(`/api/v1/reservations/${bookings[3]!.reservationId}/cancel`);
  expect(await waitlistStatus(request, big)).toBe("WAITING");
  expect(await waitlistStatus(request, firstSmall)).toBe("OFFERED");
  expect(await waitlistStatus(request, secondSmall)).toBe("WAITING");

  // Six more: the two seats on offer are set aside, so 6 are left, still not enough for 8.
  await request.post(`/api/v1/reservations/${bookings[2]!.reservationId}/cancel`);
  expect(await waitlistStatus(request, big)).toBe("WAITING");
  expect(await waitlistStatus(request, secondSmall)).toBe("OFFERED");

  // Another six: now the party of 8 fits, and its size means it pays a deposit on confirming.
  await request.post(`/api/v1/reservations/${bookings[1]!.reservationId}/cancel`);
  expect(await waitlistStatus(request, big)).toBe("OFFERED");

  const confirmed = await request.post(`/api/v1/waitlist/${big}/confirm`, { data: { paymentMethod: "paypal" } });
  expect(confirmed.status()).toBe(201);
  const { reservationId, status, payment, depositCents } = await confirmed.json();
  const policy = await settings();
  expect(status).toBe("PENDING_DEPOSIT");
  expect(depositCents).toBe(8 * policy.depositPerGuestCents);
  await simulate(request, payment.paymentId);
  expect((await reservationView(request, reservationId)).status).toBe("CONFIRMED");
});

test("an offered guest who is too late stays on the list with their place", async ({ request }) => {
  const downtown = await branchId(request, "downtown");
  const slot = await freeSlot(request, downtown, 20);
  const bookings = await fillSlot(request, downtown, slot.iso);
  const name = uniqueName("Late");
  const joined = await request.post("/api/v1/waitlist", { data: { branchId: downtown, startsAt: slot.iso, partySize: 2, name, email: emailFor(name), phone: PHONE } });
  const { id } = await joined.json();

  await request.post(`/api/v1/reservations/${bookings[3]!.reservationId}/cancel`);
  expect(await waitlistStatus(request, id)).toBe("OFFERED");

  // An offer does not hold seats, so another guest books them first.
  await bookViaApi(request, downtown, slot.iso, 2);
  const late = await request.post(`/api/v1/waitlist/${id}/confirm`, { data: {} });
  expect(late.status()).toBe(409);
  expect((await late.json()).error.code).toBe("TABLE_TAKEN");
  expect(await waitlistStatus(request, id)).toBe("WAITING");

  // Leaving works, and a place cannot be left twice.
  expect((await request.post(`/api/v1/waitlist/${id}/cancel`)).ok()).toBeTruthy();
  expect((await request.post(`/api/v1/waitlist/${id}/cancel`)).status()).toBe(409);
});

test("an open slot cannot be waitlisted, and a full one cannot be booked", async ({ request }) => {
  const downtown = await branchId(request, "downtown");
  const slot = await freeSlot(request, downtown, 20);
  const name = uniqueName("Open");
  const contact = { branchId: downtown, startsAt: slot.iso, name, email: emailFor(name), phone: PHONE };

  const open = await request.post("/api/v1/waitlist", { data: { ...contact, partySize: 2 } });
  expect(open.status()).toBe(409);
  expect((await open.json()).error.code).toBe("SLOT_AVAILABLE");

  await fillSlot(request, downtown, slot.iso);
  const full = await request.post("/api/v1/reservations", { data: { ...contact, partySize: 1 } });
  expect(full.status()).toBe(409);
  expect((await full.json()).error.code).toBe("SLOT_FULL");
});

test("two guests cannot both take the last seats", async ({ request }) => {
  const downtown = await branchId(request, "downtown");
  // The local database shares one session between connections, so simultaneous requests can
  // fail in bursts, which shows up as a stray 5xx or 404. No round may ever oversell. A clean
  // round must have exactly one winner, so keep going, spaced out, until there is one. This
  // cannot prove the slot lock itself, which needs separate sessions: run it on real Postgres.
  for (let round = 0; round < 20; round++) {
    if (round > 0) await new Promise((resolve) => setTimeout(resolve, 1500));
    const slot = await freeSlot(request, downtown, 20);
    const post = (tag: string) => {
      const name = uniqueName(tag);
      return request.post("/api/v1/reservations", { data: { branchId: downtown, startsAt: slot.iso, partySize: 12, name, email: emailFor(name), phone: PHONE } });
    };
    const statuses = (await Promise.all([post("Race One"), post("Race Two"), post("Race Three")])).map((response) => response.status());
    const { rows } = await db.query(`SELECT COALESCE(SUM("partySize"), 0)::int AS seats FROM reservations WHERE "branchId" = $1 AND "startsAt" = $2 AND status IN ('PENDING_DEPOSIT', 'CONFIRMED', 'SEATED')`, [downtown, new Date(slot.iso)]);
    expect(rows[0].seats).toBeLessThanOrEqual(12);
    expect(statuses.filter((status) => status === 201).length).toBeLessThanOrEqual(1);
    if (statuses.every((status) => status === 201 || status === 409)) {
      expect(statuses.sort()).toEqual([201, 409, 409]);
      return;
    }
  }
  throw new Error("Twenty rounds in a row were disturbed by database errors");
});

test("a deposit hold ends after 30 minutes: the seats come back and it cannot be paid", async ({ request }) => {
  const downtown = await branchId(request, "downtown");
  const slot = await freeSlot(request, downtown, 20);
  const booking = await bookViaApi(request, downtown, slot.iso, 20);
  expect(booking.status).toBe("PENDING_DEPOSIT");

  // While held, the seats are taken.
  let seats = await day(request, downtown, 1, slot.date);
  expect(seats.slots.find((s) => s.iso === slot.iso)!.available).toBe(false);

  // 30 minutes exactly still holds; a minute more does not.
  await db.query(`UPDATE reservations SET "createdAt" = "createdAt" - interval '30 minutes' WHERE id = $1`, [booking.reservationId]);
  seats = await day(request, downtown, 1, slot.date);
  expect(seats.slots.find((s) => s.iso === slot.iso)!.available).toBe(false);

  await db.query(`UPDATE reservations SET "createdAt" = "createdAt" - interval '1 minute' WHERE id = $1`, [booking.reservationId]);
  seats = await day(request, downtown, 1, slot.date);
  expect(seats.slots.find((s) => s.iso === slot.iso)!.available).toBe(true);

  const view = await reservationView(request, booking.reservationId);
  expect(view.status).toBe("CANCELLED");
  expect(view.canPay).toBe(false);
  expect(view.deposit.state).toBe("NOT_PAID");

  // A new payment is refused.
  const retry = await request.post(`/api/v1/reservations/${booking.reservationId}/pay`, { data: { paymentMethod: "card" } });
  expect(retry.status()).toBe(409);

  // A payment already under way is refunded straight back, and does not confirm the table.
  expect((await simulate(request, booking.payment!.paymentId)).ok()).toBeTruthy();
  expect(await paymentRow(booking.payment!.paymentId)).toMatchObject({ status: "REFUNDED" });
  expect((await reservationView(request, booking.reservationId)).status).toBe("CANCELLED");
});

test("a hold that has lapsed but not been swept still cannot be confirmed by payment", async ({ request }) => {
  const downtown = await branchId(request, "downtown");
  const slot = await freeSlot(request, downtown, 8);
  const booking = await bookViaApi(request, downtown, slot.iso, 8);
  await db.query(`UPDATE reservations SET "createdAt" = "createdAt" - interval '31 minutes' WHERE id = $1`, [booking.reservationId]);

  expect((await simulate(request, booking.payment!.paymentId)).ok()).toBeTruthy();
  expect(await paymentRow(booking.payment!.paymentId)).toMatchObject({ status: "REFUNDED" });
  expect((await reservationView(request, booking.reservationId)).status).toBe("CANCELLED");
});

test("paying twice confirms once and refunds nothing", async ({ request }) => {
  const downtown = await branchId(request, "downtown");
  const slot = await freeSlot(request, downtown, 8);
  const booking = await bookViaApi(request, downtown, slot.iso, 8);
  for (let i = 0; i < 2; i++) expect((await simulate(request, booking.payment!.paymentId)).ok()).toBeTruthy();
  expect((await reservationView(request, booking.reservationId)).status).toBe("CONFIRMED");
  expect(await paymentRow(booking.payment!.paymentId)).toMatchObject({ status: "SUCCEEDED", refundedAmountCents: 0 });
});

test("the browser cannot set its own deposit or status, and the amount comes from Settings", async ({ request }) => {
  const downtown = await branchId(request, "downtown");
  const policy = await settings();
  const slot = await freeSlot(request, downtown, 9);
  const name = uniqueName("Tamper");
  const response = await request.post("/api/v1/reservations", {
    data: { branchId: downtown, startsAt: slot.iso, partySize: 9, name, email: emailFor(name), phone: PHONE, depositAmountCents: 1, depositCents: 1, status: "CONFIRMED" },
  });
  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body.status).toBe("PENDING_DEPOSIT");
  expect(body.depositCents).toBe(9 * policy.depositPerGuestCents);
  expect((await paymentRow(body.payment.paymentId)).amountCents).toBe(9 * policy.depositPerGuestCents);

  // Below the threshold there is no deposit at all.
  const small = await day(request, downtown, policy.depositMinParty - 1, slot.date);
  expect(small.deposit.amountCents).toBe(0);
  const atThreshold = await day(request, downtown, policy.depositMinParty, slot.date);
  expect(atThreshold.deposit.amountCents).toBe(policy.depositMinParty * policy.depositPerGuestCents);
});

test("times outside the rules are refused", async ({ request }) => {
  const downtown = await branchId(request, "downtown");
  const { today, lastDate } = await day(request, downtown, 2);
  const name = uniqueName("Rules");
  const post = (startsAt: string) => request.post("/api/v1/reservations", { data: { branchId: downtown, startsAt, partySize: 2, name, email: emailFor(name), phone: PHONE } });

  // Between slots, in the past, and beyond the booking window: all from a real open day.
  const open = await day(request, downtown, 2, addDays(today, 7));
  const between = new Date(new Date(open.slots[0]!.iso).getTime() + 15 * 60_000).toISOString();
  const past = new Date(new Date(open.slots[0]!.iso).getTime() - 30 * 86_400_000).toISOString();
  const tooFar = new Date(new Date(open.slots[0]!.iso).getTime() + 60 * 86_400_000).toISOString();
  for (const startsAt of [between, past, tooFar]) {
    const response = await post(startsAt);
    expect(response.status()).toBe(422);
    expect((await response.json()).error.code).toBe("BAD_TIME");
  }
  expect((await day(request, downtown, 2, addDays(lastDate, 1))).reason).toBe("OUT_OF_RANGE");
  expect((await day(request, downtown, 2, addDays(today, -1))).reason).toBe("OUT_OF_RANGE");

  const tooBig = await request.post("/api/v1/reservations", { data: { branchId: downtown, startsAt: open.slots[0]!.iso, partySize: 21, name, email: emailFor(name), phone: PHONE } });
  expect(tooBig.status()).toBe(422);
  expect((await tooBig.json()).error.code).toBe("PARTY_TOO_LARGE");
});

test("guest changes a booking: new time, a smaller party, and the limits", async ({ page, request }) => {
  const downtown = await branchId(request, "downtown");
  const policy = await settings();
  const slot = await freeSlot(request, downtown, 8);
  const booking = await bookViaApi(request, downtown, slot.iso, 8);
  await simulate(request, booking.payment!.paymentId);

  // The party grows past what has been paid: refused, with a way forward.
  const grow = await request.patch(`/api/v1/reservations/${booking.reservationId}`, { data: { partySize: 9 } });
  expect(grow.status()).toBe(409);
  expect((await grow.json()).error.code).toBe("DEPOSIT_INCREASE");

  // One guest fewer in the free window refunds that guest's share.
  await page.goto(`/book/${booking.reservationId}`);
  await page.getByRole("button", { name: "Change booking" }).click();
  await expect(page.getByTestId("slot-status")).not.toHaveText("Finding free times...");
  await page.getByLabel("Party size").selectOption("7");
  await expect(page.getByText("we refund the part of your deposit")).toBeVisible();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByTestId("booking-notice")).toContainText(`$${(policy.depositPerGuestCents / 100).toFixed(2)} of your deposit has been refunded`);
  await expect(page.getByTestId("booking-party")).toHaveText("7");
  expect(await paymentOfReservation(booking.reservationId)).toMatchObject({ status: "PARTIALLY_REFUNDED", refundedAmountCents: policy.depositPerGuestCents });

  // Moving to another day keeps the deposit.
  const nextDay = await freeSlot(request, downtown, 7, 2);
  const moved = await request.patch(`/api/v1/reservations/${booking.reservationId}`, { data: { startsAt: nextDay.iso } });
  expect(moved.ok()).toBeTruthy();
  const view = (await moved.json()).reservation;
  expect(view.startsAt).toBe(new Date(nextDay.iso).toISOString());
  expect(view.deposit.heldCents).toBe(7 * policy.depositPerGuestCents);

  // Cancelling refunds what is left, in full.
  await request.post(`/api/v1/reservations/${booking.reservationId}/cancel`);
  expect(await paymentOfReservation(booking.reservationId)).toMatchObject({ status: "REFUNDED", refundedAmountCents: 8 * policy.depositPerGuestCents });
});

test("a paid table cannot be moved once the free window has closed", async ({ request }) => {
  const downtown = await branchId(request, "downtown");
  const today = await day(request, downtown, 8);
  const available = today.slots.filter((s) => s.available);
  const booking = await bookViaApi(request, downtown, available.at(-1)!.iso, 8);
  await simulate(request, booking.payment!.paymentId);

  const later = await freeSlot(request, downtown, 8);
  const moved = await request.patch(`/api/v1/reservations/${booking.reservationId}`, { data: { startsAt: later.iso } });
  expect(moved.status()).toBe(409);
  expect((await moved.json()).error.code).toBe("WINDOW_CLOSED");

  // A smaller party is allowed, with no refund.
  const smaller = await request.patch(`/api/v1/reservations/${booking.reservationId}`, { data: { partySize: 4 } });
  expect(smaller.ok()).toBeTruthy();
  expect(await paymentOfReservation(booking.reservationId)).toMatchObject({ status: "SUCCEEDED", refundedAmountCents: 0 });
  await request.post(`/api/v1/reservations/${booking.reservationId}/cancel`);
});

test("staff seat guests and mark a no-show, and the deposit is kept", async ({ browser, baseURL, request }) => {
  const downtown = await branchId(request, "downtown");
  const today = await day(request, downtown, 8);
  const available = today.slots.filter((s) => s.available);
  const seatedName = uniqueName("Seat");
  const noShowName = uniqueName("Absent");
  await bookViaApi(request, downtown, available[0]!.iso, 2, seatedName);
  const absent = await bookViaApi(request, downtown, available.at(-1)!.iso, 8, noShowName);
  await simulate(request, absent.payment!.paymentId);

  const staff = await signedInPage(browser, baseURL!, "staff@nature.test");
  await staff.page.goto("/staff/reservations");
  const seated = staff.page.getByTestId(`reservation-${seatedName}`);
  await seated.getByRole("button", { name: "Seat guests" }).click();
  await expect(seated.getByTestId("reservation-status")).toHaveText("Seated");
  await seated.getByRole("button", { name: "Mark finished" }).click();
  await expect(seated.getByTestId("reservation-status")).toHaveText("Finished");

  // Before the time comes, there is no button and the server refuses too.
  const notYet = staff.page.getByTestId(`reservation-${noShowName}`);
  await expect(notYet.getByRole("button", { name: "Mark no-show" })).toHaveCount(0);
  const early = await staff.page.request.patch(`/api/v1/staff/reservations/${absent.reservationId}`, { data: { status: "NO_SHOW" } });
  expect(early.status()).toBe(409);

  // Their time has come.
  await db.query(`UPDATE reservations SET "startsAt" = "startsAt" - interval '12 hours' WHERE id = $1`, [absent.reservationId]);
  await staff.page.reload();
  await notYet.getByRole("button", { name: "Mark no-show" }).click();
  await expect(notYet.getByTestId("reservation-status")).toHaveText("No-show");
  await expect(notYet).toContainText("Deposit kept");
  expect(await paymentOfReservation(absent.reservationId)).toMatchObject({ status: "SUCCEEDED", refundedAmountCents: 0 });
  await staff.context.close();
});

test("another branch's staff get 403 on every booking route, and guests are kept out", async ({ browser, baseURL, request }) => {
  const downtown = await branchId(request, "downtown");
  const slot = await freeSlot(request, downtown, 20);
  const bookings = await fillSlot(request, downtown, slot.iso);
  const booking = bookings[0]!;
  const name = uniqueName("Queue");
  const joined = await request.post("/api/v1/waitlist", { data: { branchId: downtown, startsAt: slot.iso, partySize: 2, name, email: emailFor(name), phone: PHONE } });
  const { id: entryId } = await joined.json();

  const other = await signedInPage(browser, baseURL!, "staff.riverside@nature.test");
  const api = other.page.request;
  expect((await api.get(`/api/v1/staff/reservations?branchId=${downtown}`)).status()).toBe(403);
  expect((await api.patch(`/api/v1/staff/reservations/${booking.reservationId}`, { data: { status: "SEATED" } })).status()).toBe(403);
  expect((await api.get(`/api/v1/staff/waitlist?branchId=${downtown}`)).status()).toBe(403);
  expect((await api.patch(`/api/v1/staff/waitlist/${entryId}`, { data: { action: "REMOVE" } })).status()).toBe(403);
  expect((await reservationView(request, booking.reservationId)).status).toBe("CONFIRMED");
  expect(await waitlistStatus(request, entryId)).toBe("WAITING");
  // Their own branch still works.
  expect((await api.get("/api/v1/staff/reservations")).status()).toBe(200);
  await other.context.close();

  expect((await request.get(`/api/v1/staff/reservations?branchId=${downtown}`)).status()).toBe(401);
  expect((await request.patch(`/api/v1/staff/reservations/${booking.reservationId}`, { data: { status: "SEATED" } })).status()).toBe(401);
  expect((await request.get("/api/v1/staff/waitlist")).status()).toBe(401);

  const customer = await signedInPage(browser, baseURL!, "guest@nature.test");
  expect((await customer.page.request.get(`/api/v1/staff/reservations?branchId=${downtown}`)).status()).toBe(403);
  expect((await customer.page.request.patch(`/api/v1/staff/waitlist/${entryId}`, { data: { action: "OFFER" } })).status()).toBe(403);
  // Not admin, so the events admin page turns them away.
  await customer.page.goto("/admin/events");
  await expect(customer.page).toHaveURL(/denied=1/);
  await customer.context.close();
});

test("a booking made while signed in needs that account, and shows in My bookings", async ({ browser, baseURL, request }) => {
  const downtown = await branchId(request, "downtown");
  const slot = await freeSlot(request, downtown, 2);
  const guest = await signedInPage(browser, baseURL!, "guest@nature.test");
  const name = uniqueName("Member");
  const created = await guest.page.request.post("/api/v1/reservations", { data: { branchId: downtown, startsAt: slot.iso, partySize: 2, name, email: emailFor(name), phone: PHONE } });
  expect(created.status()).toBe(201);
  const { reservationId } = await created.json();

  expect((await request.get(`/api/v1/reservations/${reservationId}`)).status()).toBe(403);
  expect((await request.post(`/api/v1/reservations/${reservationId}/cancel`)).status()).toBe(403);

  await guest.page.goto("/account/bookings");
  await expect(guest.page.getByRole("link", { name: new RegExp(`at ${slot.label}$`) }).first()).toBeVisible();
  await guest.page.goto(`/book/${reservationId}`);
  await expect(guest.page.getByTestId("booking-headline")).toHaveText("Your table is booked");
  await guest.page.getByRole("button", { name: "Cancel booking" }).click();
  await guest.page.getByRole("button", { name: "Yes, cancel it" }).click();
  await expect(guest.page.getByTestId("booking-headline")).toHaveText("This booking is cancelled");
  await guest.context.close();
});

test("event request receives a quote and the deposit is paid", async ({ page, browser, baseURL, request }) => {
  const downtown = await branchId(request, "downtown");
  const { today } = await day(request, downtown, 2);
  const name = uniqueName("Event");

  await page.goto("/events");
  await page.getByRole("radio", { name: /Private event/ }).check({ force: true });
  await page.getByLabel("Date").fill(addDays(today, 30));
  await page.getByLabel("Number of guests").fill("30");
  await page.getByLabel("Budget in dollars (optional)").fill("2000");
  await page.getByLabel("Menu wishes (optional)").fill("Lots of grain bowls");
  await page.getByLabel("Allergies and diets (optional)").fill("Two guests with a nut allergy");
  await fillGuest(page, name);
  await page.getByRole("button", { name: "Send my request" }).click();
  await expect(page.getByTestId("event-sent")).toContainText("We have your request");

  await page.getByRole("link", { name: "See your request" }).click();
  await page.waitForURL(/\/events\/[0-9a-f-]{36}$/);
  await expect(page.getByTestId("event-headline")).toHaveText("We have your request");
  const requestId = new URL(page.url()).pathname.split("/").pop()!;

  // No quote yet, so there is nothing to accept.
  expect((await request.post(`/api/v1/event-requests/${requestId}/accept`, { data: { paymentMethod: "card" } })).status()).toBe(409);

  const admin = await signedInPage(browser, baseURL!, "admin@nature.test");
  await admin.page.goto("/admin/events");
  const card = admin.page.getByTestId(`event-${name}`);
  await expect(card).toContainText("Allergies: Two guests with a nut allergy");
  // A deposit above the quote is refused.
  await card.getByLabel("Quote in dollars").fill("1500");
  await card.getByLabel("Deposit in dollars").fill("2000");
  await card.getByRole("button", { name: "Send quote" }).click();
  await expect(card.getByRole("alert")).toContainText("cannot be more than the quote");

  await card.getByLabel("Quote in dollars").fill("1,500");
  await card.getByLabel("Deposit in dollars").fill("300");
  await card.getByLabel("Menu and notes for the guest").fill("A sharing menu for 30.");
  await card.getByRole("button", { name: "Send quote" }).click();
  await expect(card.getByRole("status")).toContainText("Quote sent");

  await page.reload();
  await expect(page.getByTestId("event-headline")).toHaveText("Your quote is ready");
  await expect(page.getByTestId("quote-total")).toHaveText("$1,500.00");
  await expect(page.getByTestId("quote-deposit")).toHaveText("$300.00");
  await expect(page.getByText("A sharing menu for 30.")).toBeVisible();

  await page.getByRole("button", { name: "Accept and pay $300.00" }).click();
  await page.getByRole("button", { name: "Simulate paying $300.00" }).click();
  await expect(page.getByTestId("event-headline")).toHaveText("Your deposit is paid");

  // The money came from the stored quote, and paying again changes nothing.
  const { rows } = await db.query(`SELECT "paymentId", status FROM event_requests WHERE id = $1`, [requestId]);
  expect(rows[0].status).toBe("DEPOSIT_PAID");
  expect(await paymentRow(rows[0].paymentId)).toMatchObject({ status: "SUCCEEDED", amountCents: 30000 });
  expect((await simulate(request, rows[0].paymentId)).ok()).toBeTruthy();
  expect(await paymentRow(rows[0].paymentId)).toMatchObject({ status: "SUCCEEDED", refundedAmountCents: 0 });

  await admin.page.reload();
  await expect(admin.page.getByTestId(`paid-event-${name}`)).toContainText("deposit $300.00 paid");
  await admin.context.close();
});

test("a replaced or declined quote cannot be paid", async ({ browser, baseURL, request }) => {
  const downtown = await branchId(request, "downtown");
  const { today } = await day(request, downtown, 2);
  const name = uniqueName("Change");
  const created = await request.post("/api/v1/event-requests", {
    data: { type: "PRIVATE_EVENT", branchId: downtown, date: addDays(today, 20), guests: 12, name, email: emailFor(name), phone: PHONE, depositCents: 1, status: "DEPOSIT_PAID" },
  });
  expect(created.status()).toBe(201);
  const { id, status } = await created.json();
  expect(status).toBe("NEW");

  const admin = await signedInPage(browser, baseURL!, "admin@nature.test");
  const sendQuote = async (quote: string, deposit: string) => {
    await admin.page.goto("/admin/events");
    const card = admin.page.getByTestId(`event-${name}`);
    await card.getByLabel("Quote in dollars").fill(quote);
    await card.getByLabel("Deposit in dollars").fill(deposit);
    await card.getByRole("button", { name: /Send (updated )?quote/ }).click();
    await expect(card.getByRole("status")).toContainText("Quote sent");
  };
  await sendQuote("500", "100");

  // The guest starts paying, then the quote is replaced before they finish.
  const first = await (await request.post(`/api/v1/event-requests/${id}/accept`, { data: { paymentMethod: "card", amountCents: 1 } })).json();
  expect(first.depositCents).toBe(10000);
  await sendQuote("600", "150");
  await simulate(request, first.payment.paymentId);
  expect(await paymentRow(first.payment.paymentId)).toMatchObject({ status: "REFUNDED" });
  const stillQuoted = await (await request.get(`/api/v1/event-requests/${id}`)).json();
  expect(stillQuoted.request.status).toBe("QUOTED");
  expect(stillQuoted.request.depositCents).toBe(15000);

  expect((await request.post(`/api/v1/event-requests/${id}/decline`)).ok()).toBeTruthy();
  expect((await request.post(`/api/v1/event-requests/${id}/accept`, { data: { paymentMethod: "card" } })).status()).toBe(409);
  await admin.context.close();
});

test("booking pages have no automatically detectable accessibility problems", async ({ page, request }) => {
  const downtown = await branchId(request, "downtown");
  const slot = await freeSlot(request, downtown, 8);
  const booking = await bookViaApi(request, downtown, slot.iso, 8);

  await openBookingForm(page);
  await chooseTable(page, slot.date, 8);
  await page.getByRole("radio", { name: slot.label, exact: true }).check({ force: true });
  const check = async () => {
    const { violations } = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(violations.map((violation) => `${violation.id}: ${violation.nodes[0]?.html}`)).toEqual([]);
  };
  await check();

  await page.goto(`/book/${booking.reservationId}`);
  await expect(page.getByTestId("booking-headline")).toBeVisible();
  await check();

  await page.goto("/events");
  await expect(page.getByRole("button", { name: "Send my request" })).toBeVisible();
  await check();
});

test("catering respects the lead time in Settings, and a private event needs a branch", async ({ request }) => {
  const downtown = await branchId(request, "downtown");
  const policy = await settings();
  const { today } = await day(request, downtown, 2);
  const name = uniqueName("Cater");
  const contact = { name, email: emailFor(name), phone: PHONE, guests: 40 };

  const tooSoon = await request.post("/api/v1/event-requests", { data: { ...contact, type: "CATERING", date: addDays(today, policy.cateringLeadDays - 1) } });
  expect(tooSoon.status()).toBe(422);
  expect((await tooSoon.json()).error.code).toBe("TOO_SOON");

  const inTime = await request.post("/api/v1/event-requests", { data: { ...contact, type: "CATERING", date: addDays(today, policy.cateringLeadDays) } });
  expect(inTime.status()).toBe(201);

  const noBranch = await request.post("/api/v1/event-requests", { data: { ...contact, type: "PRIVATE_EVENT", date: addDays(today, 30) } });
  expect(noBranch.status()).toBe(422);
  expect((await noBranch.json()).error.code).toBe("BRANCH_REQUIRED");

  const notADate = await request.post("/api/v1/event-requests", { data: { ...contact, type: "CATERING", date: "2026-02-30" } });
  expect(notADate.status()).toBe(400);
});
