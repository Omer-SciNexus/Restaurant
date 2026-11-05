import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageIntro, ToConfirm } from "@/components/site/ContentPage";
import { prisma } from "@/lib/db";

// Draft copy for the owner to approve. The deposit party size is the live setting, so this
// page cannot disagree with what booking actually asks for.

export const metadata: Metadata = { title: "FAQ", description: "Ordering, delivery, booking, allergens and how Nature Food works out its nutrition." };

const linkClass = "text-forest underline";

function Question({ question, children }: { question: string; children: ReactNode }) {
  return (
    <details className="group rounded-brand bg-paper shadow-soft">
      <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 py-3 font-medium">
        {question}
        <span aria-hidden="true" className="text-stone transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="space-y-2 px-4 pb-4 text-[15px] leading-relaxed">{children}</div>
    </details>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-2xl">{title}</h2>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

export default async function FaqPage() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 }, select: { depositMinParty: true } });
  const depositParty = settings?.depositMinParty ?? 7;

  return (
    <div className="pb-10">
      <PageIntro title="Frequently asked questions" lead={<p>If your question is not here, your <Link href="/contact" className={linkClass}>branch</Link> can help.</p>} />
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Group title="Ordering">
          <Question question="Do I need an account to order?">
            <p>No. You can check out as a guest. With an account you can save addresses, see your order history and keep a diet and allergy profile.</p>
          </Question>
          <Question question="How can I pay?">
            <p>By card, Apple Pay, Google Pay or PayPal. All prices are in US dollars.</p>
          </Question>
          <Question question="Can I schedule an order for later?">
            <p>Yes. At checkout, choose as soon as possible or one of the times left today at your branch.</p>
          </Question>
          <Question question="How do I know where my order is?">
            <p>Your order page updates by itself as it moves through received, preparing, and ready or on the way. We send updates by email, and a text message for the moments that matter.</p>
          </Question>
          <Question question="Can I cancel an order?">
            <p>Yes, from your order page, until the kitchen has accepted it. You are refunded. After that, please call your branch.</p>
          </Question>
          <Question question="What if a branch cannot take my order?">
            <p>We tell you why, and refund you in full.</p>
          </Question>
        </Group>

        <Group title="Delivery">
          <Question question="How far do you deliver?">
            <p>Each branch delivers to the area around it, normally within 2 km. Checkout tells you whether your address is covered.</p>
          </Question>
          <Question question="What does delivery cost?">
            <p>You see the delivery fee, any minimum order and the tax before you pay, so there is nothing added at the end.</p>
          </Question>
          <Question question="Who brings my order?">
            <p>One of our own drivers, or a courier partner when none of them is free.</p>
          </Question>
        </Group>

        <Group title="Food and allergies">
          <Question question="I have an allergy. Is your food safe for me?">
            <p>Each dish lists its allergens and any &quot;may contain&quot; warnings, but our kitchens share equipment, so traces of any allergen are possible. Please tell staff about allergies before you order, and read our <Link href="/legal/allergens" className={linkClass}>allergen policy</Link>.</p>
          </Question>
          <Question question="Where do the nutrition numbers come from?">
            <p>They are calculated from each ingredient&apos;s data and the weight used in the recipe. A nutritionist checks the data, and any change to it needs a second person&apos;s approval. If a dish still has unchecked ingredients, its page says so.</p>
          </Question>
          <Question question="Do you cater for special diets?">
            <p>The menu can be filtered by vegan, vegetarian, gluten-free, dairy-free and nut-free. These tags are worked out from the ingredients. With an account, you can save your diet and allergies once, and dishes that do not fit are flagged.</p>
          </Question>
          <Question question="Is your food organic or local?">
            <p>We only make a claim like that when a supplier can prove it, and you will see it on that supplier&apos;s page under <Link href="/farms" className={linkClass}>Our farms</Link>. If you do not see the claim, we are not making it.</p>
          </Question>
          <Question question="When is breakfast served?">
            <p>From 7am to 11am, in your branch&apos;s local time.</p>
          </Question>
        </Group>

        <Group title="Bookings and events">
          <Question question="How do I book a table?">
            <p>Choose a branch, date, time and party size on the <Link href="/book" className={linkClass}>booking page</Link>. If a time is full, you can join the waitlist.</p>
          </Question>
          <Question question="Do I have to pay a deposit?">
            <p>Groups of {depositParty} or more pay a refundable deposit when booking. You see the amount before you pay.</p>
            <ToConfirm>the cancellation and no-show policy for deposits.</ToConfirm>
          </Question>
          <Question question="Can you host a private event or cater for us?">
            <p>Yes. Send us the date, number of guests, budget, menu wishes and any allergies through the <Link href="/events" className={linkClass}>events and catering form</Link>. We reply with a quote and a menu, and you pay a deposit online to confirm.</p>
            <ToConfirm>the catering minimum, and how far ahead catering has to be booked.</ToConfirm>
          </Question>
        </Group>

        <Group title="Cooking at home">
          <Question question="Can I make your dishes at home?">
            <p>Some of them. <Link href="/cook" className={linkClass}>Cook at home</Link> has step-by-step recipe videos, with ingredients, nutrition and allergens for each. Save the ones you like to your cookbook.</p>
          </Question>
        </Group>
      </div>
    </div>
  );
}
