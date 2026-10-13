import { isMockMode } from "@/lib/ai/client";
import { mockRecipe } from "@/lib/ai/mock";
import { normalizeRecipe } from "@/lib/ai/normalize";
import { recipeContent, recipeSystem } from "@/lib/ai/prompts";
import { handleJson } from "@/lib/ai/route";
import { generateStructured } from "@/lib/ai/structured";
import { RecipeAISchema, RecipeRequestSchema } from "@/lib/schemas";

export const maxDuration = 60;

/** Confirmed dish (+ optional modifier / current recipe) -> full home recipe. */
export async function POST(request: Request) {
  return handleJson(request, RecipeRequestSchema, async (input) => {
    const recipe = isMockMode()
      ? await mockRecipe(input)
      : await generateStructured({
          task: "recipe",
          system: recipeSystem(input.units),
          content: recipeContent(input),
          schema: RecipeAISchema,
        });
    return { recipe: normalizeRecipe(recipe) };
  });
}
