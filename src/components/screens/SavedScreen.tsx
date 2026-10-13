"use client";

import { BookOpen } from "lucide-react";
import { useMemo, useState } from "react";
import { FilterChips } from "@/components/FilterChips";
import { FilterSheet } from "@/components/FilterSheet";
import { FoodCard } from "@/components/FoodCard";
import { SearchBar } from "@/components/SearchBar";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useActions, useAppState } from "@/lib/data/store";
import {
  activeFilterCount,
  applyFilters,
  isHealthy,
  isQuick,
  matchesQuery,
  NO_FILTERS,
  recipeSearchText,
  totalMinutes,
} from "@/lib/selectors";
import type { Recipe } from "@/lib/types";

type SavedFilter = "all" | "quick" | "healthy" | "vegetarian";

const FILTERS: { value: SavedFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "quick", label: "Quick & Easy" },
  { value: "healthy", label: "Healthy" },
  { value: "vegetarian", label: "Vegetarian" },
];

const MATCHERS: Record<SavedFilter, (r: Recipe) => boolean> = {
  all: () => true,
  quick: isQuick,
  healthy: isHealthy,
  vegetarian: (r) => r.tags.includes("vegetarian") || r.tags.includes("vegan"),
};

export function SavedScreen() {
  const { hydrated, recipes } = useAppState();
  const { toggleSaved } = useActions();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SavedFilter>("all");
  const [filters, setFilters] = useState(NO_FILTERS);
  const [sheet, setSheet] = useState(false);

  const saved = useMemo(
    () => recipes.filter((r) => r.saved).sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0)),
    [recipes],
  );
  const shown = saved.filter((r) => MATCHERS[filter](r) && applyFilters(r, filters) && matchesQuery(recipeSearchText(r), query));
  const examples = recipes.filter((r) => r.isExample && !r.saved);

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-36 pt-[max(1.25rem,env(safe-area-inset-top))] sm:max-w-3xl lg:max-w-5xl">
      <section className="rounded-card-lg bg-white p-5 shadow-soft">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">Saved recipes</h1>
        <div className="mt-4">
          <SearchBar
            value={query}
            onChange={setQuery}
            onOpenFilters={() => setSheet(true)}
            filterCount={activeFilterCount(filters)}
            placeholder="Search saved recipes"
          />
        </div>
        <FilterChips className="mt-4" label="Filter saved recipes" options={FILTERS} value={filter} onChange={setFilter} />
      </section>

      {!hydrated ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="aspect-[4/5] rounded-card-lg" />
        </div>
      ) : saved.length === 0 ? (
        <div className="mt-6 rounded-card-lg bg-white p-8 text-center shadow-soft">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-olive-50 text-olive-700">
            <BookOpen className="h-7 w-7" aria-hidden />
          </div>
          <h2 className="text-lg font-bold">No saved recipes yet</h2>
          <p className="mx-auto mt-1 max-w-xs text-[15px] text-subtle">Tap the heart on any recipe and it will live here, even offline.</p>
          <ButtonLink href="/scan" variant="primary" className="mt-6">
            Scan a meal
          </ButtonLink>
        </div>
      ) : shown.length ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((r) => (
            <FoodCard
              key={r.id}
              href={`/recipe?id=${r.id}`}
              title={r.title}
              imageId={r.imageId}
              imageUrl={r.imageUrl}
              minutes={totalMinutes(r)}
              saved
              onToggleSave={() => toggleSaved(r.id)}
            />
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-card bg-white p-6 text-center text-[15px] text-subtle shadow-soft">
          No saved recipes match that. Try another word or filter.
        </p>
      )}

      {hydrated && examples.length > 0 && saved.length < 3 && (
        <section className="mt-10" aria-labelledby="ex-title">
          <h2 id="ex-title" className="mb-4 text-xl font-bold">
            Examples you can save
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {examples.map((r) => (
              <FoodCard
                key={r.id}
                href={`/recipe?id=${r.id}`}
                title={r.title}
                imageUrl={r.imageUrl}
                minutes={totalMinutes(r)}
                likes={r.likes}
                onToggleSave={() => toggleSaved(r.id)}
              />
            ))}
          </div>
        </section>
      )}

      <FilterSheet open={sheet} onClose={() => setSheet(false)} value={filters} onChange={setFilters} />
    </main>
  );
}
