"use client";

import type Anthropic from "@anthropic-ai/sdk";
import { toJSONSchema, type z } from "zod";
import { AI_EFFORT, AI_MODEL, type AITask } from "../src/lib/ai/config";
import { normalizeAnalysis, normalizeAsk, normalizeGrocery, normalizeRecipe } from "../src/lib/ai/normalize";
import {
  ANALYZE_SYSTEM,
  analyzeContent,
  askContent,
  askSystem,
  groceryContent,
  grocerySystem,
  recipeContent,
  recipeSystem,
} from "../src/lib/ai/prompts";
import { ApiError } from "../src/lib/api";
import {
  AnalysisAISchema,
  AnalyzeRequestSchema,
  AskAISchema,
  AskRequestSchema,
  GroceryAISchema,
  GroceryRequestSchema,
  RecipeAISchema,
  RecipeRequestSchema,
  type Analysis,
  type AnalyzeRequest,
  type AskAI,
  type AskRequest,
  type GroceryAI,
  type GroceryRequest,
  type RecipeAI,
  type RecipeRequest,
} from "../src/lib/schemas";

export { ApiError, friendlyMessage } from "../src/lib/api";

/**
 * Drop-in replacement for src/lib/api.ts in the claude.ai artifact build.
 * Instead of calling our Next.js API routes (which hold the API key), it asks
 * Claude through the artifact's `sample` capability, on the viewer's own
 * Claude account. Prompts, schemas and post-processing are the same modules
 * the server routes use.
 */

// ---------- the `sample` capability (types from the runtime contract) ----------

interface SampleOptions {
  images?: Blob[];
  model?: string;
  modelTier?: "quick" | "default" | "complex";
  effort?: "low" | "medium" | "high";
  cache?: boolean;
  signal?: AbortSignal;
}

interface SampleFn {
  (input: string, options?: SampleOptions): Promise<{ text: string }>;
  json<T = unknown>(input: string, options?: SampleOptions): Promise<T>;
  limits(): Promise<{ images?: { maxCount: number } }>;
}

declare global {
  interface Window {
    claude?: { use(name: "sample"): Promise<SampleFn | null> };
  }
}

let samplePromise: Promise<SampleFn | null> | null = null;

function getSample(): Promise<SampleFn | null> {
  samplePromise ??= (async () => {
    try {
      return (await window.claude?.use("sample")) ?? null;
    } catch {
      return null;
    }
  })();
  return samplePromise;
}

const TIER: Record<AITask, SampleOptions["modelTier"]> = {
  analyze: "default",
  recipe: "default",
  grocery: "quick",
  ask: "quick",
};

const MESSAGES: Record<string, { code: string; message: string }> = {
  not_granted: { code: "not_granted", message: "The kitchen AI needs your OK to use Claude. Reload the page and choose Allow when asked." },
  sampling_disabled: { code: "not_granted", message: "Claude isn't available for this account, so the kitchen AI can't run here." },
  not_declared: { code: "not_granted", message: "The kitchen AI isn't enabled for this page." },
  capability_disabled: { code: "not_granted", message: "The kitchen AI can't run in this view. Try opening the app in Claude in your browser." },
  capability_removed: { code: "not_granted", message: "This Claude app is too old for the kitchen AI. Update it or open the app in your browser." },
  images_unavailable: { code: "image", message: "Photos can't be sent to Claude from this view. Try opening the app in Claude in your browser." },
  image_rejected: { code: "image", message: "We couldn't send that photo. Try a different JPG or PNG photo." },
  rate_limited: { code: "busy", message: "You've hit a usage limit for now. Give it a little while and try again." },
  session_expired: { code: "session", message: "Your Claude session has expired. Sign in again, then reload this page." },
  refused: { code: "refused", message: "We can't help with that one. Try another photo or question." },
  prompt_too_large: { code: "bad_input", message: "That was too much to send at once. Try a shorter note or question." },
  empty_completion: { code: "bad_output", message: "The kitchen AI got a little muddled. Please try again." },
  invalid_json: { code: "bad_output", message: "The kitchen AI got a little muddled. Please try again." },
};

function toApiError(code: string | undefined): ApiError {
  const known = code ? MESSAGES[code] : undefined;
  return known
    ? new ApiError(known.code, known.message)
    : new ApiError("unavailable", "We couldn't reach the kitchen AI. Check your connection and try again.");
}

// ---------- prompt assembly ----------

function base64ToBlob(data: string, type: string): Blob {
  const bytes = atob(data);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
  return new Blob([buffer], { type });
}

/** `sample` takes one text input plus image blobs; there is no system prompt. */
function toSampleInput(system: string, blocks: Anthropic.ContentBlockParam[], schema: z.ZodType) {
  const images: Blob[] = [];
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.type === "text") parts.push(block.text);
    else if (block.type === "image" && block.source.type === "base64") {
      images.push(base64ToBlob(block.source.data, block.source.media_type));
      parts.push(`[attached image ${images.length}]`);
    }
  }
  const input = [
    system,
    "",
    "---",
    "",
    parts.join("\n"),
    "",
    "---",
    "Reply with only one JSON object (no prose, no code fence) that matches this JSON Schema:",
    JSON.stringify(toJSONSchema(schema)),
  ].join("\n");
  return { input, images };
}

/**
 * Asks for JSON, validates it with zod, and retries once if the reply can't be
 * parsed or validated. Other failures are never retried automatically.
 */
async function generate<S extends z.ZodType>(
  task: AITask,
  system: string,
  blocks: Anthropic.ContentBlockParam[],
  schema: S,
  signal?: AbortSignal,
): Promise<z.infer<S>> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new ApiError("offline", "You're offline. Reconnect to use the kitchen AI. Your saved recipes and grocery list still work.");
  }
  const sample = await getSample();
  if (!sample) {
    throw new ApiError("unavailable", "The kitchen AI only works when this page is open in Claude. Open it from your Claude artifacts and try again.");
  }

  const { input, images: allImages } = toSampleInput(system, blocks, schema);
  let images = allImages;
  if (images.length) {
    const limits = await sample.limits().catch(() => null);
    const max = limits?.images?.maxCount ?? 0;
    if (!max) throw toApiError("images_unavailable");
    images = images.slice(0, max);
  }

  const options: SampleOptions = {
    model: AI_MODEL,
    modelTier: TIER[task],
    effort: AI_EFFORT[task],
    // Every tap should get a fresh answer (and a retry must not replay a bad one).
    cache: false,
    signal,
    ...(images.length ? { images } : {}),
  };

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const parsed = schema.safeParse(await sample.json(input, options));
      if (parsed.success) return parsed.data;
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      if (code === "cancelled") throw new DOMException("The request was cancelled.", "AbortError");
      if (code !== "invalid_json") throw toApiError(code);
    }
  }
  throw toApiError("invalid_json");
}

function validated<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new ApiError("bad_input", "Something about that request didn't look right. Try again with a different photo.");
  return parsed.data;
}

export const api = {
  async analyze(req: AnalyzeRequest, signal?: AbortSignal): Promise<Analysis> {
    const input = validated(AnalyzeRequestSchema, req);
    const analysis = await generate("analyze", ANALYZE_SYSTEM, analyzeContent(input), AnalysisAISchema, signal);
    return normalizeAnalysis(analysis, input.dishHint);
  },
  async recipe(req: RecipeRequest, signal?: AbortSignal): Promise<RecipeAI> {
    const input = validated(RecipeRequestSchema, req);
    return normalizeRecipe(await generate("recipe", recipeSystem(input.units), recipeContent(input), RecipeAISchema, signal));
  },
  async grocery(req: GroceryRequest, signal?: AbortSignal): Promise<GroceryAI> {
    const input = validated(GroceryRequestSchema, req);
    return normalizeGrocery(await generate("grocery", grocerySystem(input.units), groceryContent(input), GroceryAISchema, signal));
  },
  async ask(req: AskRequest, signal?: AbortSignal): Promise<AskAI> {
    const input = validated(AskRequestSchema, req);
    return normalizeAsk(await generate("ask", askSystem(input.units), askContent(input), AskAISchema, signal));
  },
};
