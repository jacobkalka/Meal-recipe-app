import { isMockMode } from "@/lib/ai/client";
import { mockAsk } from "@/lib/ai/mock";
import { normalizeAsk } from "@/lib/ai/normalize";
import { askContent, askSystem } from "@/lib/ai/prompts";
import { handleJson } from "@/lib/ai/route";
import { generateStructured } from "@/lib/ai/structured";
import { AskAISchema, AskRequestSchema } from "@/lib/schemas";

export const maxDuration = 60;

/** Free-text or tapped question about a dish/recipe -> short answer + 3 follow-ups. */
export async function POST(request: Request) {
  return handleJson(request, AskRequestSchema, async (input) => {
    const answer = isMockMode()
      ? await mockAsk(input)
      : await generateStructured({
          task: "ask",
          system: askSystem(input.units),
          content: askContent(input),
          schema: AskAISchema,
        });
    return { answer: normalizeAsk(answer) };
  });
}
