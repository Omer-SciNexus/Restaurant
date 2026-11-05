"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { callApi } from "@/lib/api-client";
import { Button } from "../ui/Button";
import { FormError, inputClass } from "../ui/Form";

/** A personal note on one saved recipe, and the way to take it back out of the cookbook. */
export function CookbookNote({ recipeId, title, note }: { recipeId: string; title: string; note: string | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fieldId = `note-${recipeId}`;

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setStatus("");
    setError(null);
    const result = await callApi("/api/v1/me/cookbook", "POST", { recipeId, note: form.get("note") });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setStatus("Note saved.");
    router.refresh();
  };

  const remove = async () => {
    setPending(true);
    setStatus("");
    setError(null);
    const result = await callApi(`/api/v1/me/cookbook?recipeId=${encodeURIComponent(recipeId)}`, "DELETE");
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  };

  return (
    <form onSubmit={save} className="mt-3 space-y-2">
      <label htmlFor={fieldId} className="block text-sm font-medium">
        Your note on {title}
      </label>
      <textarea id={fieldId} name="note" rows={2} maxLength={2000} defaultValue={note ?? ""} placeholder="What you changed, or what to try next time" className={inputClass} />
      <FormError message={error} />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          Save note
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={remove} aria-label={`Remove ${title} from my cookbook`}>
          Remove
        </Button>
        <p role="status" className="text-sm text-stone">
          {status}
        </p>
      </div>
    </form>
  );
}
