import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, Section, ToConfirm } from "@/components/site/ContentPage";
import { getBranches } from "@/lib/menu";

// Draft copy for the owner to approve. It says nothing about founders or dates on purpose.

export const metadata: Metadata = { title: "About", description: "Nature Food is a natural, healthy-food restaurant. Every dish shows what is in it before you order." };

export default async function AboutPage() {
  const branches = await getBranches();
  return (
    <div className="pb-10">
      <PageIntro
        title="About Nature Food"
        image="/images/pages/about-our-story.png"
        imageAlt="A cook preparing kale and vegetables at a wooden counter in a bright dining room"
        lead={
          <p>
            We are a natural, healthy-food restaurant with {branches.length} {branches.length === 1 ? "branch" : "branches"}, all sharing one menu. Natural food, nothing hidden.
          </p>
        }
      />
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Section title="What we cook">
          <p>Bowls and salads are at the heart of the menu, with breakfast and fresh juices for the mornings. Alongside them are natural versions of the dishes people already love, such as burgers, pizza, pasta and tacos, so that everyone in a family or a group finds something they want.</p>
          <p>Those dishes follow the same <Link href="/our-food" className="text-forest underline">natural rules</Link> as everything else. The fries are baked. The sauces are made in our own kitchens.</p>
        </Section>

        <Section title="What we believe guests should know">
          <p>You should be able to see what is in your food before you have to ask. Every dish shows its ingredients, nutrition and allergens, and a bowl you build yourself updates as you choose.</p>
          <p>We would rather say less than say something we cannot back up. That is why our data goes past a nutritionist and a second pair of eyes, and why a supplier only appears on <Link href="/farms" className="text-forest underline">Our farms</Link> once what they tell us has been confirmed.</p>
        </Section>

        <Section title="How you can eat with us">
          <p>Order for pickup or delivery, book a table, or ask us about a private event or catering. If you would rather cook, our Cook at home recipes show you how we make some of our dishes.</p>
        </Section>

        <div className="mt-10">
          <ToConfirm>our story in the owner&apos;s own words, including how Nature Food began and who is behind it.</ToConfirm>
        </div>
      </div>
    </div>
  );
}
