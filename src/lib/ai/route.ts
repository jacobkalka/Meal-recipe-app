import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { AIError } from "./errors";

/**
 * Shared POST handler plumbing: parses + validates the JSON body, runs the
 * handler, and turns every failure into a friendly `{ error: { code, message } }`.
 */
export async function handleJson<S extends z.ZodType, R>(
  request: Request,
  schema: S,
  handler: (input: z.infer<S>) => Promise<R>,
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(new AIError("bad_input"));
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    console.warn("[api] invalid request:", parsed.error.issues.slice(0, 3));
    return errorResponse(new AIError("bad_input"));
  }

  try {
    return NextResponse.json(await handler(parsed.data));
  } catch (error) {
    if (error instanceof AIError) return errorResponse(error);
    console.error("[api] unexpected error:", error);
    return errorResponse(new AIError("unavailable"));
  }
}

function errorResponse(error: AIError): NextResponse {
  return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
}
