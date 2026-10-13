import { STORAGE_PREFIX } from "../config";
import { DEFAULT_STAPLES, emptyGroceryList } from "../grocery";
import { SEED_RECIPES } from "../seed";
import type { AppSnapshot, GroceryList, Profile, Recipe, Scan } from "../types";
import type { DataRepository } from "./repository";

const KEYS = {
  profile: `${STORAGE_PREFIX}profile`,
  scans: `${STORAGE_PREFIX}scans`,
  recipes: `${STORAGE_PREFIX}recipes`,
  grocery: `${STORAGE_PREFIX}grocery`,
  imageIndex: `${STORAGE_PREFIX}img-index`,
  seeded: `${STORAGE_PREFIX}seeded`,
  image: (id: string) => `${STORAGE_PREFIX}img:${id}`,
};

const SEED_VERSION = "1";
/** Keep at most this many unsaved recipes around (saved ones are never pruned). */
const MAX_UNSAVED_RECIPES = 40;
const MAX_SCANS = 60;

export const DEFAULT_PROFILE: Profile = {
  name: "",
  avatar: null,
  units: "us",
  diet: [],
  staples: DEFAULT_STAPLES,
};

// ---------- low-level helpers (every access is wrapped: storage can throw) ----------

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = storage()?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED" || error.code === 22)
  );
}

interface ImageIndexEntry {
  id: string;
  at: number;
}

/** Ids of images that must survive eviction: anything shown by a saved recipe. */
function protectedImageIds(): Set<string> {
  const recipes = readJSON<Recipe[]>(KEYS.recipes, []);
  const scans = readJSON<Scan[]>(KEYS.scans, []);
  const ids = new Set<string>();
  for (const r of recipes) {
    if (!r.saved) continue;
    if (r.imageId) ids.add(r.imageId);
    const scan = scans.find((s) => s.id === r.scanId);
    if (scan) {
      ids.add(scan.mealImageId);
      if (scan.menuImageId) ids.add(scan.menuImageId);
    }
  }
  return ids;
}

/** Drops the oldest unprotected image. Returns false if nothing could be freed. */
function evictOldestImage(keep: Set<string>): boolean {
  const index = readJSON<ImageIndexEntry[]>(KEYS.imageIndex, []);
  const protectedIds = protectedImageIds();
  const victim = [...index].sort((a, b) => a.at - b.at).find((e) => !protectedIds.has(e.id) && !keep.has(e.id));
  if (!victim) return false;
  try {
    storage()?.removeItem(KEYS.image(victim.id));
    storage()?.setItem(KEYS.imageIndex, JSON.stringify(index.filter((e) => e.id !== victim.id)));
  } catch {
    return false;
  }
  return true;
}

/** setItem that frees space (old images first) and retries when storage is full. */
function safeSet(key: string, value: string, keep: Set<string> = new Set()): boolean {
  const store = storage();
  if (!store) return false;
  for (let attempt = 0; attempt < 25; attempt++) {
    try {
      store.setItem(key, value);
      return true;
    } catch (error) {
      if (!isQuotaError(error) || !evictOldestImage(keep)) {
        console.warn(`[storage] could not write ${key}`, error);
        return false;
      }
    }
  }
  return false;
}

function writeJSON(key: string, value: unknown): boolean {
  try {
    return safeSet(key, JSON.stringify(value));
  } catch {
    return false;
  }
}

function pruneRecipes(recipes: Recipe[], grocery: GroceryList): Recipe[] {
  const inGrocery = new Set(grocery.sources.map((s) => s.recipeId));
  const unsaved = recipes
    .filter((r) => !r.saved && !r.isExample && !inGrocery.has(r.id))
    .sort((a, b) => b.createdAt - a.createdAt);
  const drop = new Set(unsaved.slice(MAX_UNSAVED_RECIPES).map((r) => r.id));
  return drop.size ? recipes.filter((r) => !drop.has(r.id)) : recipes;
}

// ---------- repository ----------

export class LocalStorageRepository implements DataRepository {
  async load(): Promise<AppSnapshot> {
    const profile = { ...DEFAULT_PROFILE, ...readJSON<Partial<Profile>>(KEYS.profile, {}) };
    const scans = asArray<Scan>(readJSON(KEYS.scans, []));
    let recipes = asArray<Recipe>(readJSON(KEYS.recipes, []));
    const grocery = { ...emptyGroceryList(), ...readJSON<Partial<GroceryList>>(KEYS.grocery, {}) };

    if (readJSON<string | null>(KEYS.seeded, null) !== SEED_VERSION) {
      const existing = new Set(recipes.map((r) => r.id));
      recipes = [...recipes, ...SEED_RECIPES.filter((r) => !existing.has(r.id))];
      writeJSON(KEYS.recipes, recipes);
      writeJSON(KEYS.seeded, SEED_VERSION);
    }

    return { profile, scans, recipes, grocery };
  }

  async saveProfile(profile: Profile): Promise<void> {
    writeJSON(KEYS.profile, profile);
  }

  async upsertScan(scan: Scan): Promise<void> {
    const scans = asArray<Scan>(readJSON(KEYS.scans, []));
    const next = [scan, ...scans.filter((s) => s.id !== scan.id)]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_SCANS);
    writeJSON(KEYS.scans, next);
  }

  async deleteScan(id: string): Promise<void> {
    const scans = asArray<Scan>(readJSON(KEYS.scans, []));
    const scan = scans.find((s) => s.id === id);
    writeJSON(
      KEYS.scans,
      scans.filter((s) => s.id !== id),
    );
    if (scan) {
      await this.deleteImage(scan.mealImageId);
      if (scan.menuImageId) await this.deleteImage(scan.menuImageId);
    }
  }

  async upsertRecipe(recipe: Recipe): Promise<void> {
    const recipes = asArray<Recipe>(readJSON(KEYS.recipes, []));
    const exists = recipes.some((r) => r.id === recipe.id);
    const next = exists ? recipes.map((r) => (r.id === recipe.id ? recipe : r)) : [recipe, ...recipes];
    const grocery = readJSON<GroceryList>(KEYS.grocery, emptyGroceryList());
    writeJSON(KEYS.recipes, pruneRecipes(next, grocery));
  }

  async deleteRecipe(id: string): Promise<void> {
    const recipes = asArray<Recipe>(readJSON(KEYS.recipes, []));
    writeJSON(
      KEYS.recipes,
      recipes.filter((r) => r.id !== id),
    );
  }

  async saveGrocery(list: GroceryList): Promise<void> {
    writeJSON(KEYS.grocery, list);
  }

  async getImage(id: string): Promise<string | null> {
    try {
      return storage()?.getItem(KEYS.image(id)) ?? null;
    } catch {
      return null;
    }
  }

  async putImage(id: string, dataUrl: string): Promise<boolean> {
    const ok = safeSet(KEYS.image(id), dataUrl, new Set([id]));
    if (ok) {
      const index = readJSON<ImageIndexEntry[]>(KEYS.imageIndex, []).filter((e) => e.id !== id);
      writeJSON(KEYS.imageIndex, [...index, { id, at: Date.now() }]);
    }
    return ok;
  }

  async deleteImage(id: string): Promise<void> {
    try {
      storage()?.removeItem(KEYS.image(id));
      const index = readJSON<ImageIndexEntry[]>(KEYS.imageIndex, []);
      writeJSON(
        KEYS.imageIndex,
        index.filter((e) => e.id !== id),
      );
    } catch {
      // ignore: nothing else to clean up
    }
  }

  async clearAll(): Promise<void> {
    const store = storage();
    if (!store) return;
    try {
      const keys: string[] = [];
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
      }
      keys.forEach((k) => store.removeItem(k));
    } catch (error) {
      console.warn("[storage] clear failed", error);
    }
  }
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/** The repository the app uses. Swap this line to change persistence. */
export const repository: DataRepository = new LocalStorageRepository();

export const STORAGE_KEYS = KEYS;
