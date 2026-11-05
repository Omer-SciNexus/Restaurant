import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseMuxEvent, playbackUrls, verifyMuxSignature } from "@/lib/video";

const SECRET = "test-secret";
const BODY = JSON.stringify({ id: "evt_1", type: "video.asset.ready" });
const NOW_MS = 1_800_000_000_000;
const NOW_SEC = NOW_MS / 1000;

const sign = (timestamp: number, body = BODY, secret = SECRET) => `t=${timestamp},v1=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;

describe("verifyMuxSignature", () => {
  it("accepts a correct signature", () => {
    expect(verifyMuxSignature(sign(NOW_SEC), BODY, SECRET, NOW_MS)).toBe(true);
  });

  it("refuses a changed body, the wrong secret or a missing header", () => {
    expect(verifyMuxSignature(sign(NOW_SEC), `${BODY} `, SECRET, NOW_MS)).toBe(false);
    expect(verifyMuxSignature(sign(NOW_SEC, BODY, "other"), BODY, SECRET, NOW_MS)).toBe(false);
    expect(verifyMuxSignature(null, BODY, SECRET, NOW_MS)).toBe(false);
    expect(verifyMuxSignature(sign(NOW_SEC), BODY, "", NOW_MS)).toBe(false);
  });

  it("refuses an old signature, so a captured call cannot be replayed", () => {
    expect(verifyMuxSignature(sign(NOW_SEC - 299), BODY, SECRET, NOW_MS)).toBe(true);
    expect(verifyMuxSignature(sign(NOW_SEC - 301), BODY, SECRET, NOW_MS)).toBe(false);
  });

  it("refuses a malformed header", () => {
    expect(verifyMuxSignature("nonsense", BODY, SECRET, NOW_MS)).toBe(false);
    expect(verifyMuxSignature(`t=${NOW_SEC}`, BODY, SECRET, NOW_MS)).toBe(false);
    expect(verifyMuxSignature(`t=${NOW_SEC},v1=zzzz`, BODY, SECRET, NOW_MS)).toBe(false);
    expect(verifyMuxSignature(`t=abc,v1=00`, BODY, SECRET, NOW_MS)).toBe(false);
  });
});

describe("parseMuxEvent", () => {
  it("reads a ready asset", () => {
    const event = parseMuxEvent({
      id: "evt_1",
      type: "video.asset.ready",
      data: { id: "asset", status: "ready", duration: 245.6, passthrough: "video_1", upload_id: "upload_1", playback_ids: [{ id: "signed", policy: "signed" }, { id: "public", policy: "public" }] },
    });
    expect(event.ready).toEqual({ playbackId: "public", durationSec: 246, videoId: "video_1", uploadId: "upload_1" });
  });

  it("does nothing for other events, or with no public playback id", () => {
    expect(parseMuxEvent({ id: "evt_2", type: "video.upload.created", data: {} }).ready).toBeNull();
    expect(parseMuxEvent({ id: "evt_3", type: "video.asset.ready", data: { id: "asset", status: "ready", playback_ids: [{ id: "s", policy: "signed" }] } }).ready).toBeNull();
  });

  it("throws on something that is not a Mux event", () => {
    expect(() => parseMuxEvent({ hello: "world" })).toThrow();
  });
});

describe("playbackUrls", () => {
  it("builds the Mux stream address", () => {
    expect(playbackUrls("abc").stream).toBe("https://stream.mux.com/abc.m3u8");
  });
});
