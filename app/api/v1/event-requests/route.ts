import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { createEventRequest } from "@/lib/events/service";
import { eventRequestSchema } from "@/lib/validation/booking";

export const POST = handle(async (request: Request) => {
  const input = eventRequestSchema.parse(await readJson(request));
  const user = await getCurrentUser();
  return NextResponse.json(await createEventRequest(input, user), { status: 201 });
});
