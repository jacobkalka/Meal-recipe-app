"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { STORAGE_PREFIX } from "../config";
import { emptyGroceryList } from "../grocery";
import type { AppSnapshot, GroceryList, Profile, Recipe, Scan } from "../types";
import { DEFAULT_PROFILE, repository } from "./local-repository";

export interface AppState extends AppSnapshot {
  /** False until data has been read from storage (render skeletons until then). */
  hydrated: boolean;
}

export interface AppActions {
  updateProfile(patch: Partial<Profile>): void;
  saveScan(scan: Scan): void;
  updateScan(id: string, update: (scan: Scan) => Scan): void;
  deleteScan(id: string): void;
  saveRecipe(recipe: Recipe): void;
  updateRecipe(id: string, update: (recipe: Recipe) => Recipe): void;
  toggleSaved(id: string): void;
  deleteRecipe(id: string): void;
  updateGrocery(update: (list: GroceryList) => GroceryList): void;
  /** Synchronous read of the latest state (for async flows after awaits). */
  getState(): AppState;
  clearAll(): Promise<void>;
}

const INITIAL: AppState = {
  hydrated: false,
  profile: DEFAULT_PROFILE,
  scans: [],
  recipes: [],
  grocery: emptyGroceryList(),
};

const StateContext = createContext<AppState>(INITIAL);
const ActionsContext = createContext<AppActions | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(INITIAL);
  const ref = useRef<AppState>(INITIAL);

  const commit = useCallback((next: AppState) => {
    ref.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    let alive = true;
    const reload = () =>
      repository.load().then((snapshot) => {
        if (alive) commit({ ...snapshot, hydrated: true });
      });
    reload();

    // Keep multiple tabs in sync.
    const onStorage = (event: StorageEvent) => {
      if (event.key?.startsWith(STORAGE_PREFIX) && !event.key.includes("img")) reload();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      alive = false;
      window.removeEventListener("storage", onStorage);
    };
  }, [commit]);

  const actions = useMemo<AppActions>(() => {
    const patch = (partial: Partial<AppState>) => commit({ ...ref.current, ...partial });

    const updateRecipe = (id: string, update: (recipe: Recipe) => Recipe) => {
      const current = ref.current.recipes.find((r) => r.id === id);
      if (!current) return;
      const next = update(current);
      patch({ recipes: ref.current.recipes.map((r) => (r.id === id ? next : r)) });
      void repository.upsertRecipe(next);
    };

    return {
      updateProfile(p) {
        const profile = { ...ref.current.profile, ...p };
        patch({ profile });
        void repository.saveProfile(profile);
      },
      saveScan(scan) {
        patch({ scans: [scan, ...ref.current.scans.filter((s) => s.id !== scan.id)] });
        void repository.upsertScan(scan);
      },
      updateScan(id, update) {
        const current = ref.current.scans.find((s) => s.id === id);
        if (!current) return;
        const next = update(current);
        patch({ scans: ref.current.scans.map((s) => (s.id === id ? next : s)) });
        void repository.upsertScan(next);
      },
      deleteScan(id) {
        patch({ scans: ref.current.scans.filter((s) => s.id !== id) });
        void repository.deleteScan(id);
      },
      saveRecipe(recipe) {
        patch({ recipes: [recipe, ...ref.current.recipes.filter((r) => r.id !== recipe.id)] });
        void repository.upsertRecipe(recipe);
      },
      updateRecipe,
      toggleSaved(id) {
        updateRecipe(id, (r) => ({ ...r, saved: !r.saved, savedAt: r.saved ? null : Date.now() }));
      },
      deleteRecipe(id) {
        patch({ recipes: ref.current.recipes.filter((r) => r.id !== id) });
        void repository.deleteRecipe(id);
      },
      updateGrocery(update) {
        const grocery = { ...update(ref.current.grocery), updatedAt: Date.now() };
        patch({ grocery });
        void repository.saveGrocery(grocery);
      },
      getState() {
        return ref.current;
      },
      async clearAll() {
        await repository.clearAll();
        const snapshot = await repository.load();
        commit({ ...snapshot, hydrated: true });
      },
    };
  }, [commit]);

  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </ActionsContext.Provider>
  );
}

export function useAppState(): AppState {
  return useContext(StateContext);
}

export function useActions(): AppActions {
  const actions = useContext(ActionsContext);
  if (!actions) throw new Error("useActions must be used inside <AppDataProvider>");
  return actions;
}

export function useRecipe(id: string | null): Recipe | null {
  const { recipes } = useAppState();
  return useMemo(() => (id ? recipes.find((r) => r.id === id) ?? null : null), [recipes, id]);
}

export function useScan(id: string | null): Scan | null {
  const { scans } = useAppState();
  return useMemo(() => (id ? scans.find((s) => s.id === id) ?? null : null), [scans, id]);
}
