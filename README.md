# Nature Food web app

Mobile-first web app for Nature Food, a natural, healthy-food restaurant with 10 branches. Guests see what is in every dish, order for pickup or delivery, and book a table. Staff, drivers, managers and admins run the restaurant from the same app.

The plan, schedule and gates live in the [plan doc](https://claude.ai/artifact/RsgwLqPAdP5bihBaYfci92). Choices made while building it are in [docs/decisions.md](docs/decisions.md).

## Run it locally

Needs Node 22 and a Postgres database.

```bash
npm install
cp .env.example .env        # then set AUTH_SECRET: openssl rand -base64 32
npm run db:up               # Postgres in Docker on port 5433
npm run db:deploy           # create the tables
npm run db:seed             # draft menu, placeholder branches, test accounts
npm run dev
```

If Docker is unavailable, `npx prisma dev` runs a local Postgres with no setup. Copy the `postgres://` address it prints into `DATABASE_URL` and set `DATABASE_POOL_MAX="1"`. It has a single database session, which brings three limits:

- Only one app server can use it at a time. Running a dev and a production server together drops connections.
- If it starts resetting connections, restart it: `npx prisma dev stop <name>`, then start it again. The data is kept.
- `prisma migrate dev` fails on its address. Write the migration by hand and run `npm run db:deploy`.

No other keys are needed locally. With a key missing, payments are simulated and clearly labelled, and email and SMS are written to the server log. In production, missing payment keys are an error, so a stand-in can never take a real order.

The branches open at 7am in their own timezone. To try ordering outside those hours, set `NF_FAKE_NOW="2026-11-05T18:30:00Z"` in `.env`. It is ignored in production.

### Test accounts

All use the password `nature-food-dev`, and are only created outside production.

| Email | Role |
| --- | --- |
| `admin@nature.test` | Admin |
| `nutrition@nature.test` | Second admin, for nutrition approvals |
| `manager@nature.test` | Manager, Downtown |
| `staff@nature.test` | Staff, Downtown |
| `driver@nature.test` | Driver, Downtown |
| `staff.riverside@nature.test` | Staff, Riverside |
| `guest@nature.test` | Customer |

## Checks

```bash
npm run typecheck
npm run lint
npm test                    # unit tests
npm run test:coverage
npx playwright install chromium
npm run test:e2e            # end-to-end journeys and accessibility, needs the seeded database
npm run build && npx @lhci/cli@0.15.1 autorun   # speed and accessibility scores, stop the dev server first
```

## Where things live

| Path | What |
| --- | --- |
| `app/(site)`, `app/(auth)`, `app/account` | Guest pages |
| `app/staff`, `app/driver`, `app/manager`, `app/admin` | Restaurant pages |
| `app/api/v1`, `app/api/webhooks` | REST API and provider webhooks |
| `lib/pricing.ts`, `lib/nutrition.ts`, `lib/diet.ts`, `lib/hours.ts`, `lib/delivery/zones.ts`, `lib/orders/status.ts` | Business rules as plain functions, each with unit tests |
| `lib/access.ts`, `lib/auth.ts` | Role and branch rules, sign-in |
| `lib/orders`, `lib/payments`, `lib/delivery`, `lib/notify` | Services that use the database and outside providers |
| `components/ui` | Design system |
| `prisma/seed-data` | Draft menu, ingredients and placeholder branches |

## Rules that keep the food data honest

- Prices and totals are only ever calculated on the server, in integer cents.
- Nutrition is stored per ingredient and calculated for each dish, so it is never typed by hand.
- Diet tags are derived from ingredients. A dish cannot be labelled vegan while containing an animal product.
- Every nutrition or allergen edit needs approval from a second person.
- A dish shows a "draft data" notice until a nutritionist has approved all of its ingredients.
- A supplier is only named once its profile is published, so no sourcing claim appears without proof.
