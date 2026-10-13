export type AIErrorCode =
  | "bad_input"
  | "not_configured"
  | "busy"
  | "unavailable"
  | "refused"
  | "bad_output";

const FRIENDLY: Record<AIErrorCode, { status: number; message: string }> = {
  bad_input: {
    status: 400,
    message: "Something about that request didn't look right. Try again with a different photo.",
  },
  not_configured: {
    status: 503,
    message: "The kitchen AI isn't set up yet. Add ANTHROPIC_API_KEY to .env.local and restart.",
  },
  busy: {
    status: 429,
    message: "Lots of people are cooking right now. Give it a few seconds and try again.",
  },
  unavailable: {
    status: 503,
    message: "We couldn't reach the kitchen AI. Check your connection and try again.",
  },
  refused: {
    status: 422,
    message: "We can't help with that one. Try another photo or question.",
  },
  bad_output: {
    status: 502,
    message: "The kitchen AI got a little muddled. Please try again.",
  },
};

export class AIError extends Error {
  readonly code: AIErrorCode;
  readonly status: number;

  constructor(code: AIErrorCode, message?: string) {
    super(message ?? FRIENDLY[code].message);
    this.name = "AIError";
    this.code = code;
    this.status = FRIENDLY[code].status;
  }
}
