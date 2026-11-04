import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { PricingError } from "./pricing";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ErrorBody = { error: { code: string; message: string; fields?: Record<string, string[] | undefined> } };

export function errorResponse(error: unknown): NextResponse<ErrorBody> {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  if (error instanceof PricingError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: 422 });
  }
  if (error instanceof ZodError) {
    const { fieldErrors } = z.flattenError(error);
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Please check the details you entered.", fields: fieldErrors as Record<string, string[]> } },
      { status: 400 },
    );
  }
  console.error(error);
  return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Something went wrong on our side." } }, { status: 500 });
}

/** Wraps a route handler so every failure becomes the same JSON error shape. */
export function handle<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "The request body is not valid JSON.");
  }
}
