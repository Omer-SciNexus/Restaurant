import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { joinWaitlist } from "@/lib/booking/service";
import { joinWaitlistSchema } from "@/lib/validation/booking";

export const POST = handle(async (request: Request) => {
  const input = joinWaitlistSchema.parse(await readJson(request));
  return NextResponse.json(await joinWaitlist(input), { status: 201 });
});
