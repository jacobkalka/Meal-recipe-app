import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { getAnthropic } from "./client";
import { AI_EFFORT, AI_MAX_TOKENS, AI_MODEL, type AITask } from "./config";
import { AIError } from "./errors";

interface StructuredRequest<S extends z.ZodType> {
  task: AITask;
  system: string;
  content: Anthropic.ContentBlockParam[];
  schema: S;
}

/**
 * Calls the model with a structured-output JSON schema and returns the
 * zod-validated result. If the output can't be parsed or validated it retries
 * once, then throws a friendly AIError. Transient HTTP errors (429/5xx/network)
 * are already retried by the SDK itself.
 */
export async function generateStructured<S extends z.ZodType>({
  task,
  system,
  content,
  schema,
}: StructuredRequest<S>): Promise<z.infer<S>> {
  const client = getAnthropic();
  let lastProblem: unknown = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const message = await client.messages.parse({
        model: AI_MODEL,
        max_tokens: AI_MAX_TOKENS,
        system,
        messages: [{ role: "user", content }],
        output_config: { format: zodOutputFormat(schema), effort: AI_EFFORT[task] },
      });

      if (message.stop_reason === "refusal") throw new AIError("refused");
      if (message.parsed_output != null) return message.parsed_output as z.infer<S>;
      lastProblem = `no parsed output (stop_reason: ${message.stop_reason})`;
    } catch (error) {
      if (error instanceof AIError) throw error;
      if (error instanceof Anthropic.APIError) throw toAIError(task, error);
      // JSON / schema validation failure from the parse helper: retry once.
      lastProblem = error;
    }
  }

  console.error(`[ai:${task}] unusable output after retry:`, describe(lastProblem));
  throw new AIError("bad_output");
}

function toAIError(task: AITask, error: InstanceType<typeof Anthropic.APIError>): AIError {
  console.error(`[ai:${task}] API error ${error.status ?? "(network)"}:`, error.message);
  if (error instanceof Anthropic.AuthenticationError) return new AIError("not_configured");
  if (error instanceof Anthropic.PermissionDeniedError) return new AIError("not_configured");
  if (error instanceof Anthropic.RateLimitError) return new AIError("busy");
  if (error instanceof Anthropic.BadRequestError) return new AIError("bad_input");
  return new AIError("unavailable");
}

function describe(problem: unknown): string {
  if (problem instanceof Error) return problem.message.slice(0, 500);
  return String(problem).slice(0, 500);
}
