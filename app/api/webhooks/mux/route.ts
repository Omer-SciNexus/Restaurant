import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseMuxEvent, verifyMuxSignature, type MuxEvent } from "@/lib/video";

/** Mux calls this as a video is processed. The signature proves the call really came from Mux. */
export async function POST(request: Request) {
  const secret = process.env.MUX_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });

  const body = await request.text();
  if (!verifyMuxSignature(request.headers.get("mux-signature"), body, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: MuxEvent;
  try {
    event = parseMuxEvent(JSON.parse(body));
  } catch {
    return NextResponse.json({ error: "Unreadable event" }, { status: 400 });
  }

  // Mux retries on failure, so each event is applied at most once.
  const seenId = `mux:${event.id}`;
  const seen = await prisma.processedWebhook.findUnique({ where: { id: seenId } });
  if (seen) return NextResponse.json({ received: true });

  if (event.ready) {
    const { videoId, uploadId, playbackId, durationSec } = event.ready;
    const match = videoId ? { id: videoId } : uploadId ? { uploadId } : null;
    if (match) await prisma.video.updateMany({ where: match, data: { playbackId, durationSec } });
  }

  await prisma.processedWebhook.create({ data: { id: seenId } });
  return NextResponse.json({ received: true });
}
