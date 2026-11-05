# Build decisions

Choices made during the build where the plan left room, or where the code differs from it. The plan doc stays the source of truth for scope.

| Decision | Why |
| --- | --- |
| App lives at the repo root, not in `nature-food-web/` | The generated images were already in `public/images/`, where the plan's tree expects them. |
| Prisma 7.10.1, pinned | npm's `latest` tag for Prisma pointed at an 8.0 release candidate. |
| Auth.js v5, pinned to an exact beta | v5 is the version built for the App Router, and it has only been published as a beta. |
| Role and branch are read from the database on every request | The session only says who someone is, so removing a staff member takes effect immediately. |
| Money is stored in integer cents | Avoids rounding errors in totals, refunds and tax. |
| Added a tax column and a per-branch tax rate | The plan's order table had no tax, but US sales tax applies. The rate is a placeholder until the city is confirmed. |
| Added `order_events`, `processed_webhooks` and `password_reset_tokens` | Status history for support, safe webhook retries, and password resets that never store the token. |
| Payment can link to an order, a table deposit or an event deposit | All three take money through the same refund path. |
| Breakfast is hidden outside 07:00 to 11:00, with a note saying when it returns | The plan says it is shown then only. A direct link to a breakfast dish explains the hours and cannot be ordered. |
| Screens poll as well as listening to Pusher | A dropped connection or missing key makes updates a little slower, never missing. |
| Fraunces and Inter are stored in `app/fonts`, not fetched from Google at build time | Builds no longer depend on reaching Google Fonts, and pages make no third-party font request. Latin subset only, matching English-only scope. Both fonts are under the SIL Open Font License. |
| Guest orders are reached through an unguessable id | The same link we email them. Orders placed while signed in also require that account or branch staff. |

## Stand-ins while accounts are pending

| Service | Without keys, outside production | In production without keys |
| --- | --- | --- |
| Stripe, PayPal | Simulated, labelled "Test mode" | Refuses payment |
| Courier | Simulated hand-off; staff press what the courier would report | Button hidden; own drivers still work |
| Google Maps geocoding | Uses a shared location, or the branch's own | Refuses to check the address |
| Pusher | Polling only | Polling only |
| Resend, Twilio | Written to the server log | Written to the server log |

## Placeholder data to replace

| Data | Where | Replaced by |
| --- | --- | --- |
| Nutrition and allergen values | `prisma/seed-data/ingredients.ts` | Nutritionist's verified values, through the approval queue |
| Prices and gram weights | `prisma/seed-data/menu.ts` | Final menu from the owner and chef |
| Branch names, addresses, phone numbers, timezone | `prisma/seed-data/branches.ts` | Real branches, once the city is confirmed |
| Delivery fee, minimum order, tax rate | `prisma/seed-data/branches.ts` | Owner's decision and the accountant |
| Deposit amount and cancellation window | `Settings` table | Owner's decision |
