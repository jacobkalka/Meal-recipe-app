import type { GroceryAI, Section, Units } from "./schemas";
import { STORE_SECTIONS } from "./schemas";
import type { GroceryItem, GroceryList, GrocerySource, Recipe } from "./types";
import { canonicalUnit, convertAmount, fromBase, unitInfo } from "./units";
import { uid } from "./id";

/** Common pantry items hidden by "Hide things I usually have". */
export const DEFAULT_STAPLES = ["salt", "black pepper", "olive oil", "neutral oil", "vegetable oil", "water"];

const DESCRIPTORS =
  /\b(fresh|freshly|large|small|medium|chopped|minced|diced|sliced|grated|ground|whole|boneless|skinless|finely|roughly|thinly|cold|warm|cooked|to serve|for serving|optional)\b/g;

function singular(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (word.endsWith("ss") || word.endsWith("us")) return word;
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
}

/** "Fresh Leeks (sliced)" -> "leek". Used to merge items and remember checks. */
export function itemKey(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/,.*$/, " ")
    .replace(DESCRIPTORS, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = base.split(" ").filter(Boolean);
  if (!words.length) return name.toLowerCase().trim();
  words[words.length - 1] = singular(words[words.length - 1]);
  return words.join(" ");
}

export function isStaple(name: string, staples: string[]): boolean {
  const key = itemKey(name);
  return staples.some((s) => {
    const sk = itemKey(s);
    return sk === key || key === `${sk}s` || (sk.length > 3 && key.endsWith(` ${sk}`));
  });
}

export function sourcesKey(sources: GrocerySource[]): string {
  return sources
    .map((s) => `${s.recipeId}:${s.servings}`)
    .sort()
    .join("|");
}

interface Bucket {
  key: string;
  name: string;
  section: Section;
  dim: "volume" | "weight" | null;
  unit: string;
  total: number | null;
  from: Set<string>;
}

/**
 * Deterministic, offline-friendly merge of several recipes into one list.
 * Same-named ingredients are summed when their units are compatible.
 */
export function mergeRecipes(
  sources: GrocerySource[],
  recipes: Recipe[],
  units: Units,
  staples: string[],
): Omit<GroceryItem, "id" | "checked" | "custom">[] {
  const buckets = new Map<string, Bucket>();

  for (const source of sources) {
    const recipe = recipes.find((r) => r.id === source.recipeId);
    if (!recipe) continue;
    const factor = source.servings / (recipe.servings || 1);

    for (const ing of recipe.ingredients) {
      const key = itemKey(ing.name);
      if (key === "water") continue;
      const info = unitInfo(ing.unit);
      const bucketId = info ? `${key}::${info.dim}` : `${key}::${canonicalUnit(ing.unit).toLowerCase()}`;
      const existing = buckets.get(bucketId);
      const qty = ing.quantity == null ? null : ing.quantity * factor;
      const amount = qty == null ? null : info ? qty * info.base : qty;

      if (existing) {
        existing.total = existing.total == null || amount == null ? existing.total ?? amount : existing.total + amount;
        existing.from.add(recipe.title);
      } else {
        buckets.set(bucketId, {
          key,
          name: ing.name,
          section: ing.section,
          dim: info?.dim ?? null,
          unit: info ? "" : ing.unit,
          total: amount,
          from: new Set([recipe.title]),
        });
      }
    }
  }

  return [...buckets.values()].map((b) => {
    let quantity = b.total;
    let unit = b.unit;
    if (b.dim && b.total != null) {
      const amount = fromBase(b.total, b.dim, units);
      quantity = amount.quantity;
      unit = amount.unit;
    }
    return {
      key: b.key,
      name: b.name,
      quantity,
      unit: quantity == null && !unit ? "" : unit,
      section: b.section,
      staple: isStaple(b.name, staples),
      from: [...b.from],
    };
  });
}

/** Applies freshly merged items while keeping checks, custom items and removals. */
export function applyMerged(
  list: GroceryList,
  merged: Omit<GroceryItem, "id" | "checked" | "custom">[],
): GroceryItem[] {
  const previous = new Map(list.items.map((i) => [i.key, i]));
  const removed = new Set(list.removedKeys);
  const next: GroceryItem[] = merged
    .filter((m) => !removed.has(m.key))
    .map((m) => {
      const old = previous.get(m.key);
      return { ...m, id: old?.id ?? uid(), checked: old?.checked ?? false, custom: false };
    });
  const mergedKeys = new Set(next.map((i) => i.key));
  const custom = list.items.filter((i) => i.custom && !mergedKeys.has(i.key));
  return [...next, ...custom];
}

/** Converts the AI's tidy list into merge rows (keys computed locally). */
export function fromAI(ai: GroceryAI, staples: string[]): Omit<GroceryItem, "id" | "checked" | "custom">[] {
  const seen = new Set<string>();
  const rows: Omit<GroceryItem, "id" | "checked" | "custom">[] = [];
  for (const item of ai.items) {
    let key = itemKey(item.name);
    while (seen.has(key)) key = `${key}+`;
    seen.add(key);
    rows.push({
      key,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      section: item.section,
      staple: item.staple || isStaple(item.name, staples),
      from: item.from,
    });
  }
  return rows;
}

export function groupBySection(items: GroceryItem[]): { section: Section; items: GroceryItem[] }[] {
  return STORE_SECTIONS.map((section) => ({
    section,
    items: items
      .filter((i) => i.section === section)
      .sort((a, b) => Number(a.checked) - Number(b.checked) || a.name.localeCompare(b.name)),
  })).filter((g) => g.items.length > 0);
}

/** Scaled ingredient payload for /api/grocery. */
export function groceryPayload(sources: GrocerySource[], recipes: Recipe[], units: Units) {
  return sources.flatMap((source) => {
    const recipe = recipes.find((r) => r.id === source.recipeId);
    if (!recipe) return [];
    const factor = source.servings / (recipe.servings || 1);
    return [
      {
        title: recipe.title,
        servings: source.servings,
        ingredients: recipe.ingredients.map((i) => {
          const amount = convertAmount({ quantity: i.quantity, unit: i.unit }, factor, units);
          return { name: i.name, quantity: amount.quantity, unit: amount.unit, section: i.section };
        }),
      },
    ];
  });
}

export function emptyGroceryList(): GroceryList {
  return { sources: [], items: [], removedKeys: [], hideStaples: false, tidiedKey: null, updatedAt: 0 };
}
