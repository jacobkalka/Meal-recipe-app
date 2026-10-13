/**
 * Single place to configure the AI model. Swap AI_MODEL to change models
 * everywhere. Note: claude-haiku-5-5 rejects temperature / top_p / top_k, so
 * no sampling parameters are sent anywhere in this app.
 */
export const AI_MODEL = "claude-haiku-5-5";

/** Thinking counts toward max_tokens, so leave generous headroom. */
export const AI_MAX_TOKENS = 16000;

/** Per-task effort. Higher = more thinking (slower, pricier, often better). */
export const AI_EFFORT = {
  analyze: "medium",
  recipe: "medium",
  grocery: "low",
  ask: "low",
} as const;

export type AITask = keyof typeof AI_EFFORT;
