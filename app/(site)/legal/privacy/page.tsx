import type { Metadata } from "next";
import { LegalDraftNotice, Section, ToConfirm } from "@/components/site/ContentPage";

// Placeholder until the lawyer's text arrives (plan weeks 8 to 12). It describes what the app
// actually does and invents no legal terms.

export const metadata: Metadata = { title: "Privacy", description: "Draft privacy information, pending legal review." };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 pb-10 pt-8 sm:px-6">
      <h1 className="text-4xl">Privacy</h1>
      <LegalDraftNotice />

      <Section title="What we collect">
        <ul className="list-outside list-disc space-y-1.5 pl-5">
          <li>Your name, email and phone number, when you order, book a table or send an event request.</li>
          <li>Your delivery address, and any notes you add for the driver.</li>
          <li>Your order and booking history, if you have an account.</li>
          <li>Any allergy note you add to an order, and a diet and allergy profile if you choose to save one.</li>
          <li>Your location, only if you choose to share it to find your nearest branch.</li>
        </ul>
      </Section>

      <Section title="Why we use it">
        <p>To take and deliver your order, to send you updates about it, to manage your booking or event, and to warn you when a dish does not fit a diet or allergy you have told us about.</p>
      </Section>

      <Section title="Payment details">
        <p>Card and PayPal payments are handled by Stripe and PayPal. We keep a record of the payment and any refund, but your card details are entered with them and are not stored by us.</p>
      </Section>

      <Section title="Services that help us">
        <p>We plan to use outside services for payments (Stripe, PayPal), email and text messages (Resend, Twilio), maps and address checks (Google Maps), delivery by courier, video, image hosting and web hosting. Some of them receive the details needed to do their part.</p>
      </Section>

      <Section title="Cookies and storage">
        <p>The site remembers the branch you chose and keeps you signed in using cookies, and keeps your cart in your browser.</p>
      </Section>

      <div className="mt-10">
        <ToConfirm>the company&apos;s legal name and contact details, how long each kind of data is kept, your rights over your data and how to use them, and the final list of service providers. The lawyer will set these out.</ToConfirm>
      </div>
    </article>
  );
}
