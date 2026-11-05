// Mux video over its REST API. Without keys the upload reports that video is not configured;
// the recipe pages then keep showing "Video coming soon". Nothing here touches the database,
// so the signature and event rules can be tested as plain functions.

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ApiError } from "./api";
import { services } from "./env";

const MUX_API = "https://api.mux.com/video/v1";
const SIGNATURE_TOLERANCE_SEC = 5 * 60;

export const VIDEO_NOT_CONFIGURED = "Video is not configured yet. Add MUX_TOKEN_ID and MUX_TOKEN_SECRET to upload.";

async function muxRequest<T>(path: string, schema: z.ZodType<T>, init?: { method: string; body: unknown }): Promise<T> {
  if (!services.mux) throw new ApiError(503, "VIDEO_NOT_CONFIGURED", VIDEO_NOT_CONFIGURED);
  const credentials = Buffer.from(`${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`).toString("base64");
  const response = await fetch(`${MUX_API}${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
    body: init ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    console.error("Mux request failed", path, response.status);
    throw new ApiError(502, "VIDEO_PROVIDER_ERROR", "Mux did not accept that request. Please try again.");
  }
  return schema.parse(((await response.json()) as { data: unknown }).data);
}

const uploadSchema = z.object({ id: z.string(), url: z.string().optional(), asset_id: z.string().nullish(), status: z.string().optional() });
const assetSchema = z.object({
  id: z.string(),
  status: z.string(),
  duration: z.number().optional(),
  playback_ids: z.array(z.object({ id: z.string(), policy: z.string() })).optional(),
});

/**
 * A one-time address the admin's browser sends the file to directly, so large videos never pass
 * through our server. `passthrough` carries our video id, and Mux returns it on every asset
 * event, which keeps the webhook independent of event order. English captions are generated
 * here as a first draft; the plan asks for captions and a transcript on every video.
 */
export async function createDirectUpload(videoId: string, corsOrigin: string): Promise<{ uploadId: string; uploadUrl: string }> {
  const upload = await muxRequest("/uploads", uploadSchema, {
    method: "POST",
    body: {
      cors_origin: corsOrigin,
      new_asset_settings: {
        playback_policies: ["public"],
        video_quality: "basic",
        passthrough: videoId,
        inputs: [{ generated_subtitles: [{ language_code: "en", name: "English CC" }] }],
      },
    },
  });
  if (!upload.url) throw new ApiError(502, "VIDEO_PROVIDER_ERROR", "Mux did not return an upload address. Please try again.");
  return { uploadId: upload.id, uploadUrl: upload.url };
}

export type VideoReady = { playbackId: string; durationSec: number | null };

function readyFromAsset(asset: z.infer<typeof assetSchema>): VideoReady | null {
  const playback = asset.playback_ids?.find((entry) => entry.policy === "public");
  if (asset.status !== "ready" || !playback) return null;
  return { playbackId: playback.id, durationSec: asset.duration === undefined ? null : Math.round(asset.duration) };
}

/** Asks Mux directly, for when a webhook was missed or is not set up. Null while processing. */
export async function getUploadPlayback(uploadId: string): Promise<VideoReady | null> {
  const upload = await muxRequest(`/uploads/${encodeURIComponent(uploadId)}`, uploadSchema);
  if (!upload.asset_id) return null;
  return readyFromAsset(await muxRequest(`/assets/${encodeURIComponent(upload.asset_id)}`, assetSchema));
}

/** Streaming and still-image addresses for a public playback id. */
export function playbackUrls(playbackId: string) {
  return {
    stream: `https://stream.mux.com/${playbackId}.m3u8`,
    thumbnail: `https://image.mux.com/${playbackId}/thumbnail.webp`,
  };
}

// ---- Webhook

/**
 * Checks the Mux-Signature header: "t=<unix seconds>,v1=<hex>", an HMAC-SHA256 of
 * "<t>.<raw body>" with the endpoint's signing secret. Old timestamps are refused, so a
 * captured call cannot be replayed later.
 */
export function verifyMuxSignature(header: string | null, rawBody: string, secret: string, nowMs: number = Date.now()): boolean {
  if (!header || !secret) return false;
  const parts = header.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) return false;
  if (Math.abs(nowMs / 1000 - Number(timestamp)) > SIGNATURE_TOLERANCE_SEC) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest();
  return signatures.some((signature) => {
    if (!/^[0-9a-f]+$/i.test(signature)) return false;
    const given = Buffer.from(signature, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

const webhookSchema = z.object({
  id: z.string().min(1),
  type: z.string(),
  data: assetSchema.partial().extend({ passthrough: z.string().nullish(), upload_id: z.string().nullish() }).optional(),
});

export type MuxEvent = {
  id: string;
  type: string;
  /** Set only for video.asset.ready with a public playback id. */
  ready: (VideoReady & { videoId: string | null; uploadId: string | null }) | null;
};

export function parseMuxEvent(raw: unknown): MuxEvent {
  const event = webhookSchema.parse(raw);
  const data = event.data;
  const playback = data?.playback_ids?.find((entry) => entry.policy === "public");
  const ready =
    event.type === "video.asset.ready" && playback
      ? {
          playbackId: playback.id,
          durationSec: data?.duration === undefined ? null : Math.round(data.duration),
          videoId: data?.passthrough ?? null,
          uploadId: data?.upload_id ?? null,
        }
      : null;
  return { id: event.id, type: event.type, ready };
}
