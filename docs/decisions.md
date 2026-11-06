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
| Admin and manager screens use Server Actions, not the REST endpoints the plan lists | They are internal screens with no other client. Each action checks role and branch itself and validates with Zod, the same as a route would. |
| Editing a dish's recipe goes live on save, with the resulting nutrition and diet tags shown first | The approval table is per ingredient, so it cannot hold a recipe change, and the plan's later nutritionist review of recipes has no screen yet. **Owner to decide** whether recipe edits should also wait for a second person; that needs a schema change. |
| New dishes start hidden, and cannot go on the menu with no ingredients | The plan requires full nutrition and allergens on every item, and a dish with none would have nothing to show. |
| Only an admin can use the rollback switch, and it can change all branches at once | The go-live plan puts this switch in admin and needs it within a minute. Managers see its state on their own branch. |
| Managers add staff by the email of an existing account | There is no invitation flow in the plan. It also means a manager never sets anyone's password. |
| Refunds claim the amount in the database before the provider is called, and give it back if the provider refuses | Two refunds at the same moment cannot both pass the check. A server crash in that instant would show a refund not sent, which is safer than sending one twice. |
| A payment's follow-up work failing releases the payment claim | The provider's retry can then finish the job, rather than finding the payment already claimed and leaving the money unapplied. |
| Money arriving for a cancelled order, a lapsed table hold or a replaced quote is refunded automatically | The guest paid for something that no longer exists. |
| Saved allergies warn at menu, dish, cart and checkout, but never block the order | The guest decides; a block would stop someone ordering for another person. The saved allergy also pre-fills the kitchen note. |
| A dish can be hidden per branch by a manager or admin; staff only mark it sold out | The plan's risk table needs slow dishes hidden per branch. Sold out is a shift-by-shift call, hiding is a menu decision. |
| Waitlist offers go to every oldest-first party that fits, and never add up to more than the free room | Guests are offered the table rather than waiting on one party to answer. **Owner to confirm.** |
| Waitlist offers do not hold seats or time out | The schema has no offer time. An offer stays open until the slot passes, and the seats stay bookable until the guest confirms. |
| A change needing a larger deposit is refused, with a message to rebook then cancel | A reservation links to one payment. |
| A paid table cannot be moved inside the cancel window | Moving then cancelling would avoid the rule. A smaller party is allowed, with no refund. |
| No-shows can only be marked once the slot has started, and the deposit is kept | Nobody can be marked absent early. |
| The `stone` text colour went from `#6e675f` to `#69625a` | The old value measured 4.43:1 on `oat-deep`, just under WCAG AA's 4.5:1. |
| Cookbook PDF uses pdf-lib's built-in fonts | Accented Latin works. Arabic, Chinese, Cyrillic and emoji in a guest's note print as "?" and the PDF says so. Fixing it needs `fontkit` and an embedded font. |

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
