"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "../ui/Button";
import { inputClass } from "../ui/Form";

type BranchOption = { id: string; slug: string; name: string; address: string };

type Props = {
  branches: BranchOption[];
  selectedSlug?: string;
  /** Where to go after choosing. Stays on the current page when left out. */
  next?: string;
};

export function BranchPicker({ branches, selectedSlug, next }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [slug, setSlug] = useState(selectedSlug ?? "");
  const [message, setMessage] = useState<string | null>(null);

  async function choose(value: string) {
    const response = await fetch("/api/v1/branches/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: value }),
    });
    if (!response.ok) {
      setMessage("We could not save your branch. Please try again.");
      return;
    }
    startTransition(() => {
      if (next) router.push(next);
      router.refresh();
    });
  }

  function useLocation() {
    if (!navigator.geolocation) {
      setMessage("Your browser cannot share your location. Please pick a branch from the list.");
      return;
    }
    setMessage("Finding your nearest branch...");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const response = await fetch(`/api/v1/branches/nearest?lat=${coords.latitude}&lng=${coords.longitude}`);
        if (!response.ok) {
          setMessage("We could not find a branch near you. Please pick one from the list.");
          return;
        }
        const { branch, distanceKm } = (await response.json()) as { branch: BranchOption; distanceKm: number };
        setSlug(branch.slug);
        setMessage(`${branch.name} is your nearest branch, ${distanceKm.toFixed(1)} km away.`);
        await choose(branch.slug);
      },
      () => setMessage("We could not read your location. Please pick a branch from the list."),
    );
  }

  return (
    <div className="mx-auto max-w-xl text-left">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="branch-select" className="sr-only">
          Choose a branch
        </label>
        <select
          id="branch-select"
          value={slug}
          disabled={pending}
          onChange={(event) => {
            setSlug(event.target.value);
            if (event.target.value) void choose(event.target.value);
          }}
          className={inputClass}
        >
          <option value="">Choose a branch</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.slug}>
              {branch.name}, {branch.address}
            </option>
          ))}
        </select>
        <Button type="button" variant="secondary" onClick={useLocation} disabled={pending} className="whitespace-nowrap">
          Use my location
        </Button>
      </div>
      <p role="status" className="mt-2 min-h-5 text-sm text-stone">
        {message}
      </p>
    </div>
  );
}
