"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { callApi } from "@/lib/api-client";
import { ALLERGEN_INFO, ALLERGENS, DIET_INFO, DIETS, type Allergen, type Diet } from "@/lib/domain";
import { Button, LinkButton } from "../ui/Button";
import { FormError } from "../ui/Form";

function Choice({ name, value, label, icon, checked }: { name: string; value: string; label: string; icon: string; checked: boolean }) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-brand border border-line bg-paper px-3 py-2 has-checked:border-forest has-checked:bg-sage has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-forest">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className="h-5 w-5 shrink-0 accent-forest" />
      <Image src={icon} alt="" width={32} height={32} className="h-8 w-8 shrink-0" />
      <span className="text-[15px] font-medium">{label}</span>
    </label>
  );
}

export function DietForm({ diets, allergies }: { diets: readonly Diet[]; allergies: readonly Allergen[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setSaved(false);
    setError(null);
    const result = await callApi("/api/v1/me/diet", "PUT", { diets: form.getAll("diets"), allergies: form.getAll("allergies") });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSaved(true);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-8">
      <fieldset>
        <legend className="font-heading text-2xl">Diet</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {DIETS.map((diet) => (
            <Choice key={diet} name="diets" value={diet} label={DIET_INFO[diet].label} icon={DIET_INFO[diet].icon} checked={diets.includes(diet)} />
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="font-heading text-2xl">Allergies</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ALLERGENS.map((allergen) => (
            <Choice key={allergen} name="allergies" value={allergen} label={ALLERGEN_INFO[allergen].label} icon={ALLERGEN_INFO[allergen].icon} checked={allergies.includes(allergen)} />
          ))}
        </div>
        <p className="mt-3 text-sm text-stone">This helps you spot dishes to avoid, but it does not reach the kitchen by itself. If you have an allergy, please also tell staff, or add a note when you order.</p>
      </fieldset>
      <FormError message={error} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save my profile"}
        </Button>
        {saved ? (
          <LinkButton href="/menu" variant="secondary">
            See the menu
          </LinkButton>
        ) : null}
        <p role="status" className="text-sm text-stone">
          {saved ? "Saved. Menu cards now flag dishes that do not fit." : ""}
        </p>
      </div>
    </form>
  );
}
