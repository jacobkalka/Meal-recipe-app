import type { AppSnapshot, GroceryList, Profile, Recipe, Scan } from "../types";

/**
 * Persistence boundary for the app. Everything above this interface works with
 * plain objects and promises, so the localStorage implementation can be swapped
 * for a real database (behind API routes) without touching the UI.
 */
export interface DataRepository {
  load(): Promise<AppSnapshot>;

  saveProfile(profile: Profile): Promise<void>;

  upsertScan(scan: Scan): Promise<void>;
  deleteScan(id: string): Promise<void>;

  upsertRecipe(recipe: Recipe): Promise<void>;
  deleteRecipe(id: string): Promise<void>;

  saveGrocery(list: GroceryList): Promise<void>;

  /** Images are stored separately from records because they are large. */
  getImage(id: string): Promise<string | null>;
  /** Returns false if the image couldn't be stored (e.g. storage is full). */
  putImage(id: string, dataUrl: string): Promise<boolean>;
  deleteImage(id: string): Promise<void>;

  clearAll(): Promise<void>;
}
