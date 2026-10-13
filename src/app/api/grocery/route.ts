import { isMockMode } from "@/lib/ai/client";
import { mockGrocery } from "@/lib/ai/mock";
import { normalizeGrocery } from "@/lib/ai/normalize";
import { groceryContent, grocerySystem } from "@/lib/ai/prompts";
import { handleJson } from "@/lib/ai/route";
import { generateStructured } from "@/lib/ai/structured";
import { GroceryAISchema, GroceryRequestSchema } from "@/lib/schemas";

export const maxDuration = 60;

/** One or more (already scaled) recipes -> merged list grouped by store section. */
export async function POST(request: Request) {
  return handleJson(request, GroceryRequestSchema, async (input) => {
    const grocery = isMockMode()
      ? await mockGrocery(input)
      : await generateStructured({
          task: "grocery",
          system: grocerySystem(input.units),
          content: groceryContent(input),
          schema: GroceryAISchema,
        });
    return { grocery: normalizeGrocery(grocery) };
  });
}
