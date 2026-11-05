import type { Metadata } from "next";
import { LegalDraftNotice, Section, ToConfirm } from "@/components/site/ContentPage";

// Placeholder until the lawyer's text arrives (plan weeks 8 to 12). It describes how ordering
// works in the app today and does not set out any terms as final.

export const metadata: Metadata = { title: "Terms", description: "Draft terms, pending legal review." };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 pb-10 pt-8 sm:px-6">
      <h1 className="text-4xl">Terms</h1>
      <LegalDraftNotice />

      <Section title="Orders">
        <p>Prices are in US dollars. Your total, including any delivery fee and tax, is worked out and shown before you pay. An order is sent to the branch once payment has been confirmed, and the branch can accept it or decline it. If it declines, you are refunded in full.</p>
      </Section>

      <Section title="Cancelling and refunds">
        <p>You can cancel an order from your order page until the kitchen has accepted it, and you are refunded. We can also refund all or part of an order ourselves, and we email you when we do.</p>
      </Section>

      <Section title="Delivery">
        <p>Delivery is available within each branch&apos;s delivery area, and is made by our own drivers or a courier partner. Checkout tells you whether your address is covered.</p>
      </Section>

      <Section title="Table bookings">
        <p>Larger groups pay a refundable deposit when booking. Bookings can be changed or cancelled online.</p>
      </Section>

      <Section title="Allergens">
        <p>Please read our allergen policy before you order if you have an allergy, and tell staff about it.</p>
      </Section>

      <div className="mt-10">
        <ToConfirm>the company&apos;s legal name, the refund and deposit policy, the rules for events and catering, liability, and which law applies. The lawyer will write these, and the owner will decide the deposit and cancellation policy.</ToConfirm>
      </div>
    </article>
  );
}
