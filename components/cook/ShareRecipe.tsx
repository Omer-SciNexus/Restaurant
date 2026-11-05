"use client";

import { useState } from "react";
import { Button } from "../ui/Button";

/** Uses the phone's own share sheet where there is one, otherwise copies the link. */
export function ShareRecipe({ title }: { title: string }) {
  const [message, setMessage] = useState<string | null>(null);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // Closing the share sheet is a choice, not a failure.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link copied.");
    } catch {
      setMessage(`Copy this link: ${url}`);
    }
  };

  return (
    <>
      <Button type="button" variant="ghost" onClick={share}>
        Share link
      </Button>
      {message ? (
        <p role="status" className="basis-full break-all text-sm text-stone">
          {message}
        </p>
      ) : null}
    </>
  );
}
