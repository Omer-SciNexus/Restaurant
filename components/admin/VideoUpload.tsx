"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { createVideoUploadAction, refreshVideoStatusAction } from "@/lib/actions/recipes";
import { Button } from "../ui/Button";
import { FormError } from "../ui/Form";

type Status = "none" | "processing" | "ready";

/** Sends the file straight to Mux from this browser, so a large video never passes through our server. */
function putFile(url: string, file: File, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => (request.status >= 200 && request.status < 300 ? resolve() : reject(new Error(`Upload failed: ${request.status}`)));
    request.onerror = () => reject(new Error("Upload failed"));
    request.send(file);
  });
}

export function VideoUpload({ recipeId, status, configured }: { recipeId: string; status: Status; configured: boolean }) {
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, startChecking] = useTransition();

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setMessage("");
    const started = await createVideoUploadAction(recipeId);
    if (!started.uploadUrl) {
      setError(started.error ?? "We could not start the upload. Please try again.");
      return;
    }
    setProgress(0);
    try {
      await putFile(started.uploadUrl, file, setProgress);
      setMessage("Uploaded. Mux is processing it now, and the recipe shows the video once it is ready.");
    } catch {
      setError("The upload did not finish. Please check your connection and try again.");
    }
    setProgress(null);
  };

  const check = () =>
    startChecking(async () => {
      setError(null);
      const result = await refreshVideoStatusAction(recipeId);
      if (result.error) setError(result.error);
      else setMessage("Up to date.");
    });

  return (
    <section aria-labelledby="video-heading" className="mt-8 rounded-brand bg-paper p-4 shadow-soft sm:p-5" data-testid="video-upload">
      <h2 id="video-heading" className="text-2xl">
        Video
      </h2>
      <p className="mt-1 text-sm text-stone">
        {status === "ready" ? "This recipe has a video. Uploading another replaces it." : status === "processing" ? "An upload is processing. Guests keep seeing \"Video coming soon\" until it is ready." : "No video yet. Guests see \"Video coming soon\", and the written steps still work."}
      </p>
      {configured ? null : (
        <p role="status" className="mt-3 rounded-brand bg-honey/15 p-3 text-sm">
          Video is not configured yet. Add MUX_TOKEN_ID and MUX_TOKEN_SECRET to upload.
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label htmlFor="video-file" className="text-sm font-medium">
          Choose a video file
        </label>
        <input id="video-file" type="file" accept="video/*" onChange={upload} disabled={progress !== null} className="max-w-full text-sm" />
        {status === "processing" ? (
          <Button type="button" variant="secondary" size="sm" disabled={checking} onClick={check}>
            Check now
          </Button>
        ) : null}
      </div>
      {progress !== null ? (
        <p role="status" className="mt-3 text-sm">
          Uploading: {progress}%
        </p>
      ) : null}
      {message ? (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      ) : null}
      <div className="mt-3">
        <FormError message={error} />
      </div>
    </section>
  );
}
