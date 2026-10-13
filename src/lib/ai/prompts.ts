import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { AnalyzeRequest, AskRequest, GroceryRequest, RecipeRequest, Units } from "../schemas";
import { imageBlock } from "./images";

const UNIT_GUIDE: Record<Units, string> = {
  us: "US customary units: tsp, tbsp, cup, fl oz, oz, lb (temperatures in °F, with °C in parentheses)",
  metric: "metric units: g, kg, ml, l, plus tsp and tbsp for small amounts (temperatures in °C, with °F in parentheses)",
};

function dietLine(diet: string[]): string {
  return diet.length
    ? `The cook's dietary preferences (hard constraints): ${diet.join(", ")}.`
    : "The cook has no dietary restrictions.";
}

function text(value: string): Anthropic.TextBlockParam {
  return { type: "text", text: value };
}

// ---------------------------------------------------------------------------
// /api/analyze
// ---------------------------------------------------------------------------

export const ANALYZE_SYSTEM = `You are the vision engine of a cooking app that helps people recreate restaurant meals at home. You receive a photo of a restaurant meal, sometimes a photo of the menu description, and sometimes a short note from the diner.

Identify the dish:
- dish_name: the most specific common name a home cook would search for (e.g. "Lasagna Bolognese", not "Pasta dish"), in Title Case.
- If a menu photo is provided, treat its wording as strong evidence for the dish name and key ingredients, and prefer the menu's dish name when it matches the plate.
- Use the diner's note to resolve ambiguity (e.g. "it was spicy", "creamy sauce").
- confidence: "high" when the dish is clearly recognizable or confirmed by the menu, "medium" when it is probably right, "low" when several dishes fit.
- alternatives: 2-3 other dishes it could plausibly be, most likely first. Never repeat dish_name.
- visible_ingredients: only what you can actually see or what the menu names. Lowercase, simple names ("parmesan", "basil"), at most 12.
- likely_cooking_methods: e.g. "baked", "pan-seared", "braised".

Suggested actions: 5-7 short tappable phrases tailored to this dish.
1. First, type "recipe": "Find the recipe to make this <dish>", using a short lowercase name for the dish (e.g. "Find the recipe to make this lasagna").
2. Second, type "grocery": "Make me a grocery list for this".
3. Then 3-5 more, mixing type "modify" (healthier, vegetarian or vegan version, cheaper, under 30 minutes, spicier, make-ahead, kid-friendly; only ones that make sense for this dish) and type "question" (e.g. "What wine or drink goes with it?", "What sides go with this?").
- Every label is under 45 characters, sentence case, no trailing punctuation, no emoji.
- Respect the diner's dietary preferences and never suggest something that violates them. If the dish conflicts with a preference (e.g. it has meat and the diner is vegetarian), put an action that adapts it (e.g. "Make it vegetarian") right after the grocery action.
- ids are short kebab-case strings, unique within the list.

If the photo does not show food or a dish (a person, a document, a landscape, an empty plate), set not_food to true, use empty strings and arrays for the other fields, and set confidence to "low".`;

export function analyzeContent(req: AnalyzeRequest): Anthropic.ContentBlockParam[] {
  const blocks: Anthropic.ContentBlockParam[] = [text("Photo 1: the meal."), imageBlock(req.mealImage)];
  if (req.menuImage) {
    blocks.push(text("Photo 2: the restaurant's menu description for this dish."), imageBlock(req.menuImage));
  }
  const lines = [dietLine(req.diet)];
  if (req.note?.trim()) lines.push(`The diner's note: "${req.note.trim()}"`);
  if (req.dishHint?.trim()) {
    lines.push(
      `The diner says this dish is "${req.dishHint.trim()}". Use exactly that as dish_name, set confidence to "high", and choose alternatives, visible ingredients and actions for that dish.`,
    );
  }
  lines.push("Identify the dish and suggest the next actions.");
  blocks.push(text(lines.join("\n")));
  return blocks;
}

// ---------------------------------------------------------------------------
// /api/recipe
// ---------------------------------------------------------------------------

export function recipeSystem(units: Units): string {
  return `You are a recipe developer for a cooking app that helps people recreate restaurant meals at home. You write a home version inspired by the dish, never a claim to be the restaurant's exact recipe.

Write for a home cook with an ordinary kitchen:
- Be specific: heat levels, oven temperatures, timings, and visual cues for doneness ("until the edges are golden, 3-4 minutes").
- Use ${UNIT_GUIDE[units]}.
- Use ingredients from an ordinary supermarket. When something is specialty, add a widely available swap in substitutions.
- steps: 4-10 steps numbered from 1, each one or two sentences focused on one action. Put the minutes of hands-off waiting (simmering, baking, boiling, resting, marinating) in duration_minutes so the app can offer a timer; otherwise null. temperature is the oven or oil temperature if relevant, else null. ingredients_used lists the ingredient names, exactly as written in the ingredients list, used in that step.
- ingredients: quantity is a number (decimals are fine, e.g. 0.5) and is null only for "to taste". For whole items use a count unit like "clove" or "can", or "" (2 eggs = quantity 2, unit ""). Name ingredients plainly ("yellow onion", "unsalted butter") and put prep details in notes ("finely chopped"), else notes is null.
- inferred: true for ingredients you could not see in the photo or menu and are inferring: seasonings, fats, stocks, sauce bases, and aromatics hidden in a sauce. Visible or menu-confirmed ingredients are inferred: false.
- section is the supermarket aisle.
- servings: default to 4 unless the dish is clearly a single plate meant for 1-2.
- tips: 2-3 short tips about where home cooks usually go wrong with this dish.
- substitutions: 2-4 useful swaps.
- tags: 2-5 accurate tags from: quick, healthy, vegetarian, vegan, comfort, spicy, high-protein, make-ahead, one-pot, budget, gluten-free, dairy-free. "quick" means prep plus cook time is 30 minutes or less.
- follow_up_actions: 4-6 tappable suggestions for what the cook might want next, under 40 characters each. Use type "modify" for changes to the recipe ("Make it spicier", "Make it healthier", "Make it dairy-free", "Make it in under 30 minutes") and type "question" for things answered without changing it ("Explain step 3", "Can I make it ahead?", "What should I serve with it?"). Nothing that conflicts with dietary preferences.
- description: 1-2 honest, appetizing sentences that present it as a home version inspired by the dish.
- change_summary: null unless you were asked to change an existing recipe.

Dietary preferences are hard constraints: every ingredient must comply. If the dish normally contains something that conflicts, adapt it and say so in the description.`;
}

export function recipeContent(req: RecipeRequest): Anthropic.ContentBlockParam[] {
  const blocks: Anthropic.ContentBlockParam[] = [];
  if (req.mealImage) blocks.push(text("Photo of the restaurant meal:"), imageBlock(req.mealImage));
  if (req.menuImage) blocks.push(text("The restaurant's menu description:"), imageBlock(req.menuImage));

  const lines = [
    `Dish: ${req.dishName}${req.cuisine ? ` (${req.cuisine})` : ""}`,
    req.ingredients.length
      ? `Ingredients the diner confirmed they saw: ${req.ingredients.join(", ")}.`
      : "No visible ingredients were confirmed.",
    dietLine(req.diet),
  ];
  if (req.note?.trim()) lines.push(`The diner's note about the dish: "${req.note.trim()}"`);

  if (req.baseRecipe && req.modifier) {
    lines.push(
      "",
      "Here is the current recipe as JSON:",
      JSON.stringify(req.baseRecipe),
      "",
      `Apply this change: "${req.modifier}". Keep everything else the same unless the change requires it. Return the full updated recipe, with fresh follow_up_actions, and set change_summary to one short sentence describing what changed.`,
    );
  } else if (req.modifier) {
    lines.push("", `Write the recipe with this adjustment: "${req.modifier}". Set change_summary to one short sentence describing the adjustment.`);
  } else {
    lines.push("", "Write the home recipe.");
  }
  blocks.push(text(lines.join("\n")));
  return blocks;
}

// ---------------------------------------------------------------------------
// /api/grocery
// ---------------------------------------------------------------------------

export function grocerySystem(units: Units): string {
  return `You turn one or more recipes into a tidy, shoppable grocery list.
- Merge duplicates across recipes ("yellow onion" and "onion", garlic cloves from two recipes), summing quantities into one sensible unit.
- Prefer what a shopper actually buys when it helps ("3 tbsp lemon juice" becomes 1 lemon), otherwise keep the recipe's amounts. Use ${UNIT_GUIDE[units]}.
- name is short and plain, as a shopper would write it. Count items use unit "" (2 lemons = name "lemons", quantity 2, unit "").
- quantity is null when an amount isn't meaningful (salt, pepper).
- staple is true for things most kitchens already have (salt, black pepper, cooking oil) and for anything on the cook's "usually have" list.
- from lists the titles of the recipes that use the item.
- section is the supermarket aisle.
- Include every ingredient from every recipe except plain water, and add nothing that isn't in the recipes.`;
}

export function groceryContent(req: GroceryRequest): Anthropic.ContentBlockParam[] {
  const lines = [
    req.staples.length
      ? `Things the cook usually has at home: ${req.staples.join(", ")}.`
      : "The cook didn't list any pantry staples.",
    "",
    "Recipes (quantities are already scaled to the servings shown):",
    JSON.stringify(req.recipes),
    "",
    "Build the merged grocery list.",
  ];
  return [text(lines.join("\n"))];
}

// ---------------------------------------------------------------------------
// /api/ask
// ---------------------------------------------------------------------------

export function askSystem(units: Units): string {
  return `You are a friendly, expert home-cooking assistant inside a recipe app. The user is looking at a restaurant dish they photographed (and maybe a home recipe for it) and asks a question or taps a suggestion.
- Answer in 2-5 short sentences, or a short list with lines starting with "- ". Plain text only: no headings, bold, or tables.
- Be specific and practical. Use ${UNIT_GUIDE[units]}. Respect dietary preferences.
- If they ask to change the recipe, briefly explain what you'd change; the app rewrites recipes separately.
- Never claim to know the restaurant's exact recipe. For allergy questions, remind them to check with the restaurant.
- If the question is unrelated to food, cooking, or this dish, gently steer back to the dish.
- follow_ups: exactly 3 short next questions or changes (under 40 characters each). Use type "modify" for recipe changes and "question" for questions.`;
}

export function askContent(req: AskRequest): Anthropic.ContentBlockParam[] {
  const lines = [
    `Dish: ${req.dish.name}${req.dish.cuisine ? ` (${req.dish.cuisine})` : ""}`,
    req.dish.visible_ingredients.length
      ? `Visible ingredients: ${req.dish.visible_ingredients.join(", ")}.`
      : "",
    dietLine(req.diet),
  ];
  if (req.recipe) lines.push("", "The home recipe they're looking at, as JSON:", JSON.stringify(req.recipe));
  if (req.history.length) {
    lines.push("", "Earlier in this conversation:");
    for (const turn of req.history) lines.push(`Q: ${turn.question}`, `A: ${turn.answer}`);
  }
  lines.push("", `Their question: ${req.question}`);
  return [text(lines.filter((line, i) => line !== "" || i > 0).join("\n"))];
}
