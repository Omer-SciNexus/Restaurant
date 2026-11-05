import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageIntro, Section } from "@/components/site/ContentPage";
import { LinkButton } from "@/components/ui/Button";

// Draft copy for the owner to approve.

export const metadata: Metadata = { title: "Our food", description: "The six natural rules behind every Nature Food dish, and how we show what is in it." };

const RULES = [
  {
    images: ["rule-made-in-house"],
    title: "Cooked from whole ingredients",
    text: "Everything is cooked from whole ingredients in our own kitchens. No ready-made sauces.",
  },
  {
    images: ["rule-oven-baked"],
    title: "No deep fryer",
    text: "Fries, wedges and chicken tenders are oven-baked in olive oil.",
  },
  {
    images: ["rule-grass-fed"],
    title: "Better meat, eggs and fish",
    text: "Grass-fed beef, free-range chicken and eggs, and responsibly caught fish. We claim these only once a supplier has proved them.",
  },
  {
    images: ["rule-whole-grain"],
    title: "Whole grains and slow dough",
    text: "Buns, breads, pizza and tortillas are made from whole grains or slow-fermented sourdough.",
  },
  {
    images: ["rule-nothing-artificial", "rule-natural-sweeteners"],
    title: "Nothing artificial",
    text: "No artificial colours, flavours or preservatives, and no high-fructose corn syrup. We sweeten with fruit, honey or maple.",
  },
  {
    images: [],
    title: "Nothing hidden",
    text: "Full nutrition and allergens are shown for every item, treats included.",
  },
];

export default function OurFoodPage() {
  return (
    <div className="pb-10">
      <PageIntro
        title="Our food"
        image="/images/restaurant/kitchen-prep.png"
        imageAlt="A cook chopping fresh herbs on a wooden board, with bowls of tomato, cucumber, red onion and grains"
        lead={<p>Well-loved dishes and everyday bowls, all made the same way. Six rules apply to everything we serve, including the burgers and the brownies.</p>}
      />

      <section aria-labelledby="rules" className="mx-auto mt-12 max-w-6xl px-4 sm:px-6">
        <h2 id="rules" className="text-3xl">
          Our natural rules
        </h2>
        <ol className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {RULES.map((rule) => (
            <li key={rule.title} className="rounded-brand bg-paper p-5 shadow-soft">
              <div className="flex h-20 gap-2">
                {rule.images.length > 0 ? (
                  rule.images.map((image) => <Image key={image} src={`/images/illustrations/rules/${image}.png`} alt="" width={80} height={80} className="h-20 w-20" />)
                ) : (
                  <span aria-hidden="true" className="flex h-20 w-20 flex-col items-center justify-center rounded-brand bg-sage font-heading text-lg">
                    kcal
                    <span className="font-body text-xs">protein</span>
                  </span>
                )}
              </div>
              <h3 className="mt-3 text-xl">{rule.title}</h3>
              <p className="mt-1 text-sm text-stone">{rule.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Section title="How we work out the numbers">
          <p>Nutrition and allergens are stored for each ingredient, per 100 g. Every recipe is weighed, so a dish&apos;s calories, protein, carbs, fat, fibre, sugar and salt are calculated from what goes into it, never typed in by hand. The same goes for a bowl you build yourself.</p>
          <p>A nutritionist checks the ingredient data, and every later change to it has to be approved by a second person. Until all of a dish&apos;s ingredients have been checked, its page carries a notice saying so.</p>
        </Section>

        <Section title="How diet tags work">
          <p>Vegan, vegetarian, gluten-free, dairy-free and nut-free tags are worked out from the ingredients, so a dish cannot be labelled vegan while containing an animal product. Our kitchens share equipment, so please read the <Link href="/legal/allergens" className="text-forest underline">allergen policy</Link> if you have an allergy.</p>
        </Section>

        <Section title="What we will not claim">
          <p>Words like organic, local or grass-fed only appear once a supplier can show the proof. Where we have not got that proof yet, we simply do not say it. You can read about the suppliers we have confirmed on <Link href="/farms" className="text-forest underline">Our farms</Link>.</p>
        </Section>

        <div className="mt-10 flex flex-wrap gap-3">
          <LinkButton href="/menu">See the menu</LinkButton>
          <LinkButton href="/build-a-bowl" variant="secondary">
            Build a bowl
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
