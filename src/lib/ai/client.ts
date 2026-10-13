import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AIError } from "./errors";

let client: Anthropic | null = null;

/** Lazily-created SDK client. The API key never leaves the server. */
export function getAnthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AIError("not_configured");
  client ??= new Anthropic({ apiKey, timeout: 90_000 });
  return client;
}

export function isMockMode(): boolean {
  return process.env.AI_MOCK === "1";
}
