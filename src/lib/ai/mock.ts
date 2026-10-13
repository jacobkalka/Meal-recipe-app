import "server-only";
import type { Analysis, AnalyzeRequest, AskAI, AskRequest, GroceryAI, GroceryRequest, RecipeAI, RecipeRequest } from "../schemas";
import { SEED_RECIPE_CONTENT } from "../seed";

/**
 * Canned responses for AI_MOCK=1, so the whole UI can be explored (and
 * demoed) without an API key. Never used when the env flag is unset.
 */

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function mockAnalyze(req: AnalyzeRequest): Promise<Analysis> {
  await wait(1800);
  const dish = req.dishHint?.trim() || "Creamy Gnocchi with Leek & Miso";
  return {
    dish_name: dish,
    cuisine: "Modern Italian",
    confidence: req.dishHint ? "high" : "medium",
    alternatives: ["Gnocchi Alfredo", "Potato Gnocchi with Brown Butter", "Creamy Spinach Pasta"],
    visible_ingredients: ["gnocchi", "leek", "spinach", "walnuts", "parmesan"],
    likely_cooking_methods: ["boiled", "pan-tossed"],
    suggested_actions: [
      { id: "find-recipe", label: `Find the recipe to make this ${req.dishHint ? dish.toLowerCase() : "gnocchi"}`, type: "recipe" },
      { id: "grocery-list", label: "Make me a grocery list for this", type: "grocery" },
      { id: "healthier", label: "Make a healthier version", type: "modify" },
      { id: "under-30", label: "Make it in under 30 minutes", type: "modify" },
      { id: "dairy-free", label: "Make it dairy-free", type: "modify" },
      { id: "wine", label: "What wine or drink goes with it?", type: "question" },
    ],
    not_food: false,
  };
}

export async function mockRecipe(req: RecipeRequest): Promise<RecipeAI> {
  await wait(2200);
  const base = req.baseRecipe ?? SEED_RECIPE_CONTENT.gnocchi;
  return {
    ...base,
    title: req.baseRecipe ? base.title : req.dishName,
    change_summary: req.modifier ? `Demo mode: pretended to apply "${req.modifier}".` : null,
  };
}

export async function mockGrocery(req: GroceryRequest): Promise<GroceryAI> {
  await wait(900);
  return {
    items: req.recipes.flatMap((r) =>
      r.ingredients.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        section: i.section,
        staple: /salt|pepper|oil/i.test(i.name),
        from: [r.title],
      })),
    ),
  };
}

export async function mockAsk(req: AskRequest): Promise<AskAI> {
  await wait(1200);
  return {
    answer: `Demo mode answer about ${req.dish.name}: "${req.question}" is a great question. With a real API key you'll get a specific, practical answer here.`,
    follow_ups: [
      { label: "What sides go with it?", type: "question" },
      { label: "Make it spicier", type: "modify" },
      { label: "Can I make it ahead?", type: "question" },
    ],
  };
}
