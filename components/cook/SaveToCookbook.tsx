"use client";

import { useState } from "react";
import { callApi } from "@/lib/api-client";
import { Button, LinkButton } from "../ui/Button";

/** Saves or removes a recipe. A guest goes to sign in first and comes straight back here. */
export function SaveToCookbook({ recipeId, slug, signedIn, initiallySaved }: { recipeId: string; slug: string; signedIn: boolean; initiallySaved: boolean }) {
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  if (!signedIn) {
    return (
      <LinkButton href={`/login?next=${encodeURIComponent(`/cook/${slug}`)}`} variant="secondary">
        Save to my cookbook
      </LinkButton>
    );
  }

  const toggle = async () => {
    setPending(true);
    setMessage(null);
    const result = saved
      ? await callApi(`/api/v1/me/cookbook?recipeId=${encodeURIComponent(recipeId)}`, "DELETE")
      : await callApi("/api/v1/me/cookbook", "POST", { recipeId });
    setPending(false);
    if (!result.ok) {
      setMessage({ text: result.message, error: true });
      return;
    }
    setMessage({ text: saved ? "Removed from your cookbook." : "Saved to your cookbook.", error: false });
    setSaved(!saved);
  };

  return (
    <>
      <Button type="button" variant="secondary" disabled={pending} onClick={toggle}>
        {saved ? "Remove from my cookbook" : "Save to my cookbook"}
      </Button>
      {message ? (
        <p role={message.error ? "alert" : "status"} className={`basis-full text-sm ${message.error ? "text-danger" : "text-stone"}`}>
          {message.text}
        </p>
      ) : null}
    </>
  );
}
