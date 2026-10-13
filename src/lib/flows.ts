"use client";

import { api } from "./api";
import type { AppActions } from "./data/store";
import { applyMerged, fromAI, groceryPayload, mergeRecipes, sourcesKey } from "./grocery";
import { uid } from "./id";
import { imageForAI } from "./images";
import type { Profile, Recipe, RecipeAI, Scan } from "./types";

/**
 * Multi-step flows shared by several screens (scan -> recipe -> grocery).
 * Kept outside components so screens stay mostly presentational.
 */

const inflight = new Map<string, Promise<unknown>>();

/** Dedupes concurrent identical requests (e.g. React strict-mode double effects). */
export function once<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const promise = run().finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

export function toRecipe(ai: RecipeAI, extra: Partial<Recipe>): Recipe {
  return {
    ...ai,
    id: uid(),
    createdAt: Date.now(),
    scanId: null,
    imageId: null,
    imageUrl: null,
    parentId: null,
    modifier: null,
    saved: false,
    savedAt: null,
    likes: null,
    isExample: false,
    qa: [],
    ...extra,
  };
}

/** Only the fields the model needs to see when modifying a recipe. */
export function recipeForAI(r: Recipe): RecipeAI {
  return {
    title: r.title,
    description: r.description,
    servings: r.servings,
    prep_minutes: r.prep_minutes,
    cook_minutes: r.cook_minutes,
    difficulty: r.difficulty,
    equipment: r.equipment,
    ingredients: r.ingredients,
    steps: r.steps,
    tips: r.tips,
    substitutions: r.substitutions,
    tags: r.tags,
    follow_up_actions: r.follow_up_actions,
    change_summary: null,
  };
}

export async function generateRecipeFromScan(scan: Scan, profile: Profile, modifier: string | null): Promise<Recipe> {
  const [mealImage, menuImage] = await Promise.all([imageForAI(scan.mealImageId), imageForAI(scan.menuImageId)]);
  const ai = await api.recipe({
    dishName: scan.dishName,
    cuisine: scan.analysis.cuisine || null,
    ingredients: scan.ingredients,
    mealImage,
    menuImage,
    note: scan.note || null,
    diet: profile.diet,
    units: profile.units,
    modifier,
    baseRecipe: null,
  });
  return toRecipe(ai, { scanId: scan.id, imageId: scan.mealImageId, modifier });
}

/** Rewrites an existing recipe ("make it spicier"). Returns a new version linked to the old one. */
export async function modifyRecipe(recipe: Recipe, modifier: string, scan: Scan | null, profile: Profile): Promise<Recipe> {
  const ai = await api.recipe({
    dishName: recipe.title,
    cuisine: scan?.analysis.cuisine ?? null,
    ingredients: scan?.ingredients ?? [],
    // The current recipe already carries what the photo told us; skip re-sending images.
    mealImage: null,
    menuImage: null,
    note: scan?.note || null,
    diet: profile.diet,
    units: profile.units,
    modifier,
    baseRecipe: recipeForAI(recipe),
  });
  return toRecipe(ai, {
    scanId: recipe.scanId,
    imageId: recipe.imageId,
    imageUrl: recipe.imageUrl,
    parentId: recipe.id,
    modifier,
    likes: null,
  });
}

/** "Double it", "halve the recipe"... handled instantly on-device. */
export function scaleIntent(label: string): number | null {
  const l = label.toLowerCase();
  if (/\b(double|twice|2x)\b/.test(l)) return 2;
  if (/\b(triple|3x)\b/.test(l)) return 3;
  if (/\b(halve|half)\b/.test(l)) return 0.5;
  return null;
}

// ---------- grocery list ----------

function remerge(actions: AppActions, sources: { recipeId: string; title: string; servings: number }[]) {
  actions.updateGrocery((list) => {
    const { recipes, profile } = actions.getState();
    const merged = mergeRecipes(sources, recipes, profile.units, profile.staples);
    const next = { ...list, sources };
    return { ...next, items: applyMerged(next, merged) };
  });
}

export function addRecipeToGrocery(actions: AppActions, recipe: Recipe, servings: number) {
  const { grocery } = actions.getState();
  const sources = [
    ...grocery.sources.filter((s) => s.recipeId !== recipe.id),
    { recipeId: recipe.id, title: recipe.title, servings },
  ];
  remerge(actions, sources);
}

export function removeRecipeFromGrocery(actions: AppActions, recipeId: string) {
  const { grocery } = actions.getState();
  remerge(
    actions,
    grocery.sources.filter((s) => s.recipeId !== recipeId),
  );
}

export function setGroceryServings(actions: AppActions, recipeId: string, servings: number) {
  const { grocery } = actions.getState();
  remerge(
    actions,
    grocery.sources.map((s) => (s.recipeId === recipeId ? { ...s, servings } : s)),
  );
}

/**
 * Asks the AI to merge synonyms and convert to shoppable amounts. The local
 * merge is shown immediately; this upgrades it when online.
 */
export async function tidyGroceryList(actions: AppActions): Promise<void> {
  const { grocery, recipes, profile } = actions.getState();
  const key = sourcesKey(grocery.sources);
  if (!grocery.sources.length || grocery.tidiedKey === key) return;

  const payload = groceryPayload(grocery.sources, recipes, profile.units);
  if (!payload.length) throw new Error("No recipes to tidy");

  await once(`tidy:${key}`, async () => {
    const ai = await api.grocery({ recipes: payload, staples: profile.staples, units: profile.units });
    // Ignore the result if the list changed while we were waiting.
    if (sourcesKey(actions.getState().grocery.sources) !== key) return;
    actions.updateGrocery((list) => ({
      ...list,
      items: applyMerged(list, fromAI(ai, profile.staples)),
      tidiedKey: key,
    }));
  });
}
