import type { Analysis, FollowUp, RecipeAI, Section, Units } from "./schemas";

export type { Analysis, FollowUp, RecipeAI, Section, Units };
export type { Ingredient, Step, SuggestedAction, ActionType } from "./schemas";

export interface Profile {
  name: string;
  /** Small data-URL avatar, or null for an initials avatar. */
  avatar: string | null;
  units: Units;
  diet: string[];
  /** Things the user usually has at home (used by "Hide things I usually have"). */
  staples: string[];
}

export interface QA {
  id: string;
  question: string;
  answer: string;
  followUps: FollowUp[];
  createdAt: number;
}

export interface Scan {
  id: string;
  createdAt: number;
  mealImageId: string;
  menuImageId: string | null;
  note: string;
  analysis: Analysis;
  /** The dish the user confirmed (or the AI's first guess until they do). */
  dishName: string;
  confirmed: boolean;
  /** Visible ingredients after the user's edits. */
  ingredients: string[];
  /** Most recent recipe generated from this scan. */
  recipeId: string | null;
  qa: QA[];
}

export interface Recipe extends RecipeAI {
  id: string;
  createdAt: number;
  scanId: string | null;
  /** Stored image id (user photo) or a static image URL (examples). */
  imageId: string | null;
  imageUrl: string | null;
  /** Previous version when this recipe was produced by a modification. */
  parentId: string | null;
  modifier: string | null;
  saved: boolean;
  savedAt: number | null;
  /** Display-only like count for the bundled examples. */
  likes: number | null;
  isExample: boolean;
  qa: QA[];
}

export interface GrocerySource {
  recipeId: string;
  title: string;
  servings: number;
}

export interface GroceryItem {
  id: string;
  /** Normalized name used to merge items and remember checked state. */
  key: string;
  name: string;
  quantity: number | null;
  unit: string;
  section: Section;
  checked: boolean;
  staple: boolean;
  custom: boolean;
  from: string[];
}

export interface GroceryList {
  sources: GrocerySource[];
  items: GroceryItem[];
  /** Keys of generated items the user removed, so re-merges don't bring them back. */
  removedKeys: string[];
  hideStaples: boolean;
  /** Fingerprint of the sources the AI last tidied, to avoid repeat calls. */
  tidiedKey: string | null;
  updatedAt: number;
}

export interface AppSnapshot {
  profile: Profile;
  scans: Scan[];
  recipes: Recipe[];
  grocery: GroceryList;
}
