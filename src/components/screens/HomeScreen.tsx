"use client";

import { ArrowRight, Bell, Camera, ListChecks, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { FilterChips } from "@/components/FilterChips";
import { FilterSheet } from "@/components/FilterSheet";
import { FoodCard } from "@/components/FoodCard";
import { SearchBar } from "@/components/SearchBar";
import { TimerPill } from "@/components/timers/TimerPill";
import { useTimers } from "@/components/timers/TimerProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ButtonLink } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { APP_TAGLINE } from "@/lib/config";
import { useActions, useAppState } from "@/lib/data/store";
import {
  activeFilterCount,
  applyFilters,
  isHealthy,
  isQuick,
  libraryRecipes,
  matchesQuery,
  NO_FILTERS,
  recipeSearchText,
  shortDate,
  totalMinutes,
} from "@/lib/selectors";
import type { Recipe, Scan } from "@/lib/types";

type HomeFilter = "recent" | "saved" | "quick" | "healthy";

const FILTERS: { value: HomeFilter; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "saved", label: "Saved" },
  { value: "quick", label: "Quick & Easy" },
  { value: "healthy", label: "Healthy" },
];

const GRID = "grid gap-5 sm:grid-cols-2 lg:grid-cols-3";

export function HomeScreen() {
  const { hydrated, profile, scans, recipes, grocery } = useAppState();
  const { toggleSaved } = useActions();
  const { timers } = useTimers();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<HomeFilter>("recent");
  const [filters, setFilters] = useState(NO_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  const library = useMemo(() => libraryRecipes(recipes, scans), [recipes, scans]);
  const recipeById = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const examples = library.filter((r) => r.isExample);
  const searching = query.trim().length > 0 || activeFilterCount(filters) > 0;
  const openItems = grocery.items.filter((i) => !i.checked).length;

  const filteredRecipes = useMemo(() => {
    const base =
      filter === "saved"
        ? library.filter((r) => r.saved)
        : filter === "quick"
          ? library.filter(isQuick)
          : filter === "healthy"
            ? library.filter(isHealthy)
            : library;
    return base.filter((r) => applyFilters(r, filters) && matchesQuery(recipeSearchText(r), query));
  }, [library, filter, filters, query]);

  const name = profile.name.trim().split(/\s+/)[0];

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-36 pt-[max(1rem,env(safe-area-inset-top))] sm:max-w-3xl lg:max-w-5xl">
      <section className="rounded-card-lg bg-white p-5 shadow-soft" aria-label="Search and filters">
        <div className="flex items-center gap-4">
          <Link href="/profile" aria-label="Your profile" className="rounded-full">
            <Avatar name={profile.name} src={profile.avatar} />
          </Link>
          <h1 className="min-w-0 flex-1 text-[28px] font-bold leading-tight tracking-tight">
            Hello{name ? ` ${name}` : " there"}
          </h1>
          <IconButton label="Notifications" tone="white" onClick={() => setBellOpen(true)} dot={timers.length > 0 || openItems > 0} className="ring-1 ring-line">
            <Bell className="h-5 w-5" />
          </IconButton>
        </div>
        <div className="mt-5">
          <SearchBar
            value={query}
            onChange={setQuery}
            onOpenFilters={() => setFiltersOpen(true)}
            filterCount={activeFilterCount(filters)}
          />
        </div>
        <FilterChips className="mt-4" label="Show" options={FILTERS} value={filter} onChange={setFilter} />
      </section>

      <ScanCTA />

      {!hydrated ? (
        <div className={`${GRID} mt-8`}>
          <Skeleton className="aspect-[4/5] rounded-card-lg" />
          <Skeleton className="hidden aspect-[4/5] rounded-card-lg sm:block" />
        </div>
      ) : searching || filter !== "recent" ? (
        <section className="mt-8" aria-labelledby="results-title">
          <h2 id="results-title" className="mb-4 text-xl font-bold">
            {searching ? "Results" : FILTERS.find((f) => f.value === filter)?.label}
          </h2>
          {filteredRecipes.length ? (
            <div className={GRID}>
              {filteredRecipes.map((r) => (
                <RecipeCard key={r.id} recipe={r} onToggleSave={() => toggleSaved(r.id)} />
              ))}
            </div>
          ) : (
            <p className="rounded-card bg-white p-6 text-center text-[15px] text-subtle shadow-soft">
              {filter === "saved" && !searching
                ? "Nothing saved yet. Tap the heart on any recipe to keep it here."
                : "No recipes match that yet. Try another word or filter."}
            </p>
          )}
        </section>
      ) : (
        <>
          <section className="mt-8" aria-labelledby="recent-title">
            <h2 id="recent-title" className="mb-4 text-xl font-bold">
              Recent scans
            </h2>
            {scans.length ? (
              <div className={GRID}>
                {scans.slice(0, 9).map((scan) => (
                  <ScanCard key={scan.id} scan={scan} recipe={scan.recipeId ? recipeById.get(scan.recipeId) : undefined} onToggleSave={toggleSaved} />
                ))}
              </div>
            ) : (
              <EmptyScans />
            )}
          </section>

          {examples.length > 0 && (
            <section className="mt-10" aria-labelledby="examples-title">
              <div className="mb-4 flex items-end justify-between gap-3">
                <h2 id="examples-title" className="text-xl font-bold">
                  {scans.length ? "Ideas to try" : "Try an example"}
                </h2>
                <span className="text-sm text-subtle">Tap to open the full recipe</span>
              </div>
              <div className={GRID}>
                {examples.map((r) => (
                  <RecipeCard key={r.id} recipe={r} onToggleSave={() => toggleSaved(r.id)} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <FilterSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} value={filters} onChange={setFilters} />

      <BottomSheet open={bellOpen} onClose={() => setBellOpen(false)} title="Notifications">
        <div className="space-y-3 pt-1">
          {timers.map((t) => (
            <TimerPill key={t.id} timer={t} />
          ))}
          {openItems > 0 && (
            <Link
              href="/grocery"
              onClick={() => setBellOpen(false)}
              className="flex min-h-14 items-center gap-3 rounded-3xl bg-canvas p-4 text-[15px] font-medium"
            >
              <ListChecks className="h-5 w-5 text-olive" aria-hidden />
              {openItems} item{openItems === 1 ? "" : "s"} left on your grocery list
              <ArrowRight className="ml-auto h-4 w-4" aria-hidden />
            </Link>
          )}
          {!timers.length && !openItems && (
            <p className="flex items-center gap-3 rounded-3xl bg-canvas p-4 text-[15px] text-subtle">
              <Sparkles className="h-5 w-5 text-olive" aria-hidden /> You&apos;re all caught up.
            </p>
          )}
        </div>
      </BottomSheet>
    </main>
  );
}

function ScanCTA() {
  return (
    <Link
      href="/scan"
      className="group relative mt-5 flex items-center gap-4 overflow-hidden rounded-card-lg bg-night p-5 text-white shadow-soft transition motion-safe:active:scale-[0.99]"
    >
      <span className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-rust/30 blur-2xl" aria-hidden />
      <span className="pointer-events-none absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-olive/30 blur-2xl" aria-hidden />
      <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-olive">
        <Camera className="h-7 w-7" aria-hidden />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block text-xl font-bold">Scan a meal</span>
        <span className="block text-[15px] text-white/75">{APP_TAGLINE}</span>
      </span>
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ink transition motion-safe:group-hover:translate-x-0.5">
        <ArrowRight className="h-5 w-5" aria-hidden />
      </span>
    </Link>
  );
}

function EmptyScans() {
  return (
    <div className="rounded-card-lg bg-white p-8 text-center shadow-soft">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-olive-50 text-olive-700">
        <Camera className="h-7 w-7" aria-hidden />
      </div>
      <h3 className="text-lg font-bold">No scans yet</h3>
      <p className="mx-auto mt-1 max-w-xs text-[15px] text-subtle">
        Take a photo of a restaurant dish and we&apos;ll turn it into a recipe you can cook at home.
      </p>
      <ButtonLink href="/scan" variant="primary" size="lg" className="mt-6" icon={<Camera className="h-5 w-5" aria-hidden />}>
        Scan your first meal
      </ButtonLink>
    </div>
  );
}

function RecipeCard({ recipe, onToggleSave }: { recipe: Recipe; onToggleSave: () => void }) {
  return (
    <FoodCard
      href={`/recipe?id=${recipe.id}`}
      title={recipe.title}
      imageId={recipe.imageId}
      imageUrl={recipe.imageUrl}
      minutes={totalMinutes(recipe)}
      likes={recipe.likes}
      saved={recipe.saved}
      onToggleSave={onToggleSave}
    />
  );
}

function ScanCard({ scan, recipe, onToggleSave }: { scan: Scan; recipe?: Recipe; onToggleSave: (id: string) => void }) {
  return (
    <FoodCard
      href={`/results?id=${scan.id}`}
      title={recipe?.title ?? scan.dishName}
      subtitle={`Scanned ${shortDate(scan.createdAt)}`}
      imageId={scan.mealImageId}
      minutes={recipe ? totalMinutes(recipe) : undefined}
      saved={recipe?.saved}
      onToggleSave={recipe ? () => onToggleSave(recipe.id) : undefined}
    />
  );
}
