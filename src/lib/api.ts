"use client";

import type {
  Analysis,
  AnalyzeRequest,
  AskAI,
  AskRequest,
  GroceryAI,
  GroceryRequest,
  RecipeAI,
  RecipeRequest,
} from "./schemas";

/** Error with a message that is always safe to show to the user. */
export class ApiError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

const GENERIC = "Something went wrong on our side. Please try again.";

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new ApiError(
      "offline",
      "You're offline. Reconnect to use the kitchen AI. Your saved recipes and grocery list still work.",
    );
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError("network", "We couldn't reach the kitchen AI. Check your connection and try again.");
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    throw new ApiError("bad_response", GENERIC);
  }

  if (!response.ok) {
    const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(err?.code ?? "unknown", err?.message ?? GENERIC);
  }
  return data as T;
}

export const api = {
  async analyze(req: AnalyzeRequest, signal?: AbortSignal): Promise<Analysis> {
    return (await post<{ analysis: Analysis }>("/api/analyze", req, signal)).analysis;
  },
  async recipe(req: RecipeRequest, signal?: AbortSignal): Promise<RecipeAI> {
    return (await post<{ recipe: RecipeAI }>("/api/recipe", req, signal)).recipe;
  },
  async grocery(req: GroceryRequest, signal?: AbortSignal): Promise<GroceryAI> {
    return (await post<{ grocery: GroceryAI }>("/api/grocery", req, signal)).grocery;
  },
  async ask(req: AskRequest, signal?: AbortSignal): Promise<AskAI> {
    return (await post<{ answer: AskAI }>("/api/ask", req, signal)).answer;
  },
};

export function friendlyMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return GENERIC;
}
