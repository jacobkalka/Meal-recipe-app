import type { Recipe, Scan } from "./types";

export function totalMinutes(r: Pick<Recipe, "prep_minutes" | "cook_minutes">): number {
  return Math.round((r.prep_minutes || 0) + (r.cook_minutes || 0));
}

export function isQuick(r: Recipe): boolean {
  return totalMinutes(r) <= 30 || r.tags.includes("quick");
}

export function isHealthy(r: Recipe): boolean {
  return r.tags.some((t) => ["healthy", "vegan", "high-protein"].includes(t));
}

/**
 * Recipes worth listing: saved ones, examples, and the newest version made
 * from each scan (older unsaved versions are history, not library items).
 */
export function libraryRecipes(recipes: Recipe[], scans: Scan[]): Recipe[] {
  const latestPerScan = new Set(scans.map((s) => s.recipeId).filter(Boolean) as string[]);
  return recipes
    .filter((r) => r.saved || r.isExample || latestPerScan.has(r.id))
    .sort((a, b) => Number(b.saved) - Number(a.saved) || (b.savedAt ?? b.createdAt) - (a.savedAt ?? a.createdAt));
}

export function matchesQuery(text: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return q.split(/\s+/).every((word) => text.toLowerCase().includes(word));
}

export function recipeSearchText(r: Recipe): string {
  return [r.title, r.description, r.tags.join(" "), r.ingredients.map((i) => i.name).join(" ")].join(" ");
}

export interface RecipeFilters {
  maxMinutes: number | null;
  difficulty: Recipe["difficulty"] | null;
}

export const NO_FILTERS: RecipeFilters = { maxMinutes: null, difficulty: null };

export function applyFilters(r: Recipe, f: RecipeFilters): boolean {
  if (f.maxMinutes && totalMinutes(r) > f.maxMinutes) return false;
  if (f.difficulty && r.difficulty !== f.difficulty) return false;
  return true;
}

export function activeFilterCount(f: RecipeFilters): number {
  return Number(!!f.maxMinutes) + Number(!!f.difficulty);
}

export function shortDate(ts: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(ts);
  } catch {
    return "";
  }
}
