import { isMockMode } from "@/lib/ai/client";
import { mockAnalyze } from "@/lib/ai/mock";
import { normalizeAnalysis } from "@/lib/ai/normalize";
import { ANALYZE_SYSTEM, analyzeContent } from "@/lib/ai/prompts";
import { handleJson } from "@/lib/ai/route";
import { generateStructured } from "@/lib/ai/structured";
import { AnalysisAISchema, AnalyzeRequestSchema } from "@/lib/schemas";

export const maxDuration = 60;

/** Meal photo (+ optional menu photo and note) -> dish identification + suggested actions. */
export async function POST(request: Request) {
  return handleJson(request, AnalyzeRequestSchema, async (input) => {
    const analysis = isMockMode()
      ? await mockAnalyze(input)
      : await generateStructured({
          task: "analyze",
          system: ANALYZE_SYSTEM,
          content: analyzeContent(input),
          schema: AnalysisAISchema,
        });
    return { analysis: normalizeAnalysis(analysis, input.dishHint) };
  });
}
