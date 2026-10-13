import type { Analysis, AskAI, FollowUp, GroceryAI, RecipeAI, SuggestedAction } from "../schemas";

/**
 * Clean-up applied to every model response before it reaches the client:
 * trims strings, clamps list lengths, dedupes, and guarantees the invariants
 * the UI relies on (e.g. the recipe and grocery actions always come first).
 */

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

function dedupe(values: string[], { lower = false } = {}): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = lower ? clean(raw).toLowerCase() : clean(raw);
    const k = v.toLowerCase();
    if (!v || seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

function shortLabel(label: string, max = 64): string {
  const v = clean(label).replace(/[.!]+$/, "");
  if (v.length <= max) return v;
  // Cut at a word boundary so labels never end mid-word.
  const cut = v.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max / 2)).trimEnd()}…`;
}

function kebab(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "action"
  );
}

/** "Lasagna Bolognese" -> "lasagna bolognese" for use inside a sentence. */
export function dishNoun(dishName: string): string {
  const v = clean(dishName);
  return v ? v.charAt(0).toLowerCase() + v.slice(1) : "dish";
}

export function defaultRecipeAction(dishName: string): SuggestedAction {
  return { id: "find-recipe", type: "recipe", label: shortLabel(`Find the recipe to make this ${dishNoun(dishName)}`) };
}

export const DEFAULT_GROCERY_ACTION: SuggestedAction = {
  id: "grocery-list",
  type: "grocery",
  label: "Make me a grocery list for this",
};

/** Guarantees recipe + grocery actions first, unique ids, at most 7 actions. */
export function normalizeActions(actions: SuggestedAction[], dishName: string): SuggestedAction[] {
  const usedIds = new Set<string>();
  const cleaned = actions
    .map((a) => ({ ...a, label: shortLabel(a.label) }))
    .filter((a) => a.label.length > 0);

  const recipe = cleaned.find((a) => a.type === "recipe") ?? defaultRecipeAction(dishName);
  const grocery = cleaned.find((a) => a.type === "grocery") ?? DEFAULT_GROCERY_ACTION;
  const rest = cleaned.filter((a) => a.type !== "recipe" && a.type !== "grocery");

  const seenLabels = new Set<string>();
  return [recipe, grocery, ...rest]
    .filter((a) => {
      const k = a.label.toLowerCase();
      if (seenLabels.has(k)) return false;
      seenLabels.add(k);
      return true;
    })
    .slice(0, 7)
    .map((a) => {
      let id = kebab(a.id || a.label);
      while (usedIds.has(id)) id = `${id}-x`;
      usedIds.add(id);
      return { ...a, id };
    });
}

export function normalizeAnalysis(a: Analysis, dishHint?: string | null): Analysis {
  const dishName = clean(dishHint || a.dish_name);
  if (a.not_food) {
    return { ...a, dish_name: dishName, alternatives: [], visible_ingredients: [], suggested_actions: [], likely_cooking_methods: [] };
  }
  return {
    dish_name: dishName,
    cuisine: clean(a.cuisine),
    confidence: dishHint ? "high" : a.confidence,
    alternatives: dedupe(a.alternatives)
      .filter((alt) => alt.toLowerCase() !== dishName.toLowerCase())
      .slice(0, 3),
    visible_ingredients: dedupe(a.visible_ingredients, { lower: true }).slice(0, 15),
    likely_cooking_methods: dedupe(a.likely_cooking_methods, { lower: true }).slice(0, 5),
    suggested_actions: normalizeActions(a.suggested_actions, dishName),
    not_food: false,
  };
}

export function normalizeFollowUps(items: FollowUp[], max: number): FollowUp[] {
  const seen = new Set<string>();
  return items
    .map((f) => ({ ...f, label: shortLabel(f.label, 48) }))
    .filter((f) => {
      const k = f.label.toLowerCase();
      if (!f.label || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, max);
}

const round = (n: number, step = 1) => Math.round(n / step) * step;

export function normalizeRecipe(r: RecipeAI): RecipeAI {
  return {
    ...r,
    title: clean(r.title),
    description: clean(r.description),
    servings: Math.min(24, Math.max(1, Math.round(r.servings) || 4)),
    prep_minutes: Math.max(0, round(r.prep_minutes || 0)),
    cook_minutes: Math.max(0, round(r.cook_minutes || 0)),
    equipment: dedupe(r.equipment).slice(0, 10),
    ingredients: r.ingredients
      .filter((i) => clean(i.name))
      .slice(0, 40)
      .map((i) => ({
        ...i,
        name: clean(i.name),
        unit: clean(i.unit ?? ""),
        quantity: typeof i.quantity === "number" && i.quantity > 0 ? i.quantity : null,
        notes: i.notes ? clean(i.notes) || null : null,
      })),
    steps: r.steps
      .filter((s) => clean(s.instruction))
      .slice(0, 16)
      .map((s, idx) => ({
        ...s,
        number: idx + 1,
        instruction: clean(s.instruction),
        duration_minutes:
          typeof s.duration_minutes === "number" && s.duration_minutes > 0
            ? Math.min(600, s.duration_minutes)
            : null,
        temperature: s.temperature ? clean(s.temperature) || null : null,
        ingredients_used: dedupe(s.ingredients_used),
      })),
    tips: dedupe(r.tips).slice(0, 4),
    substitutions: r.substitutions
      .filter((s) => clean(s.ingredient) && clean(s.swap))
      .slice(0, 5)
      .map((s) => ({ ingredient: clean(s.ingredient), swap: clean(s.swap) })),
    tags: dedupe(r.tags, { lower: true }).slice(0, 6),
    follow_up_actions: normalizeFollowUps(r.follow_up_actions, 6),
    change_summary: r.change_summary ? clean(r.change_summary) || null : null,
  };
}

export function normalizeGrocery(g: GroceryAI): GroceryAI {
  return {
    items: g.items
      .filter((i) => clean(i.name))
      .slice(0, 150)
      .map((i) => ({
        ...i,
        name: clean(i.name),
        unit: clean(i.unit ?? ""),
        quantity: typeof i.quantity === "number" && i.quantity > 0 ? i.quantity : null,
        from: dedupe(i.from),
      })),
  };
}

export function normalizeAsk(a: AskAI): AskAI {
  return {
    answer: a.answer.trim().slice(0, 4000),
    follow_ups: normalizeFollowUps(a.follow_ups, 3),
  };
}
