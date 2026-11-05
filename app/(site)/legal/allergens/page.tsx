import type { Metadata } from "next";
import { LegalDraftNotice, Section, ToConfirm } from "@/components/site/ContentPage";
import { AllergenList } from "@/components/ui/Tags";
import { ALLERGENS } from "@/lib/domain";

export const metadata: Metadata = { title: "Allergen policy", description: "How Nature Food shows allergens, and why our kitchens cannot promise to be free of any allergen." };

export default function AllergensPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 pb-10 pt-8 sm:px-6">
      <h1 className="text-4xl">Allergen policy</h1>
      <LegalDraftNotice />

      <div className="mt-6 rounded-brand border-2 border-forest bg-paper p-5">
        <h2 className="text-2xl">Please tell staff about allergies</h2>
        <p className="mt-2 text-[15px] leading-relaxed">Our kitchens share equipment, so traces of any allergen are possible, in any dish. Please tell a member of staff about any allergy before you order. You can also add a note about it at checkout.</p>
      </div>

      <Section title="What we show on each dish">
        <p>Every dish page lists its ingredients and the allergens they contain. We track the nine major US food allergens:</p>
        <AllergenList allergens={ALLERGENS} />
      </Section>

      <Section title="&quot;Contains&quot; and &quot;may contain&quot;">
        <p>
          <strong>Contains</strong> means the allergen is in the recipe. <strong>May contain</strong> means there is a known risk of it from a supplier or from shared equipment.
        </p>
        <p>Even when a dish shows neither for your allergen, it was still made in a kitchen that shares equipment. A dish with no allergens listed is not an allergen-free dish.</p>
      </Section>

      <Section title="Diet tags and allergies">
        <p>Tags such as nut-free, dairy-free and gluten-free are worked out from a dish&apos;s ingredients. They describe the recipe, not the kitchen, so please do not rely on a tag alone if you have an allergy.</p>
      </Section>

      <Section title="How the information is checked">
        <p>Allergens are stored for each ingredient. A nutritionist checks them, and every change has to be approved by a second person. A dish whose ingredients have not all been checked yet shows a notice on its page, and in that case please ask staff before ordering.</p>
      </Section>

      <Section title="Your own profile">
        <p>With an account, you can save your allergies once. Dishes that contain them or may contain them are flagged before you order. This helps you choose, but it does not replace telling staff.</p>
      </Section>

      <div className="mt-10">
        <ToConfirm>the final wording of this policy, from the nutritionist and the owner, along with the lawyer&apos;s review.</ToConfirm>
      </div>
    </article>
  );
}
