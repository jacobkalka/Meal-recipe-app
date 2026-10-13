"use client";

import {
  ArrowLeftRight,
  ChefHat,
  Clock,
  Flame,
  Heart,
  History,
  Info,
  Lightbulb,
  ListChecks,
  Share2,
  TriangleAlert,
  Users,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnswerThread } from "@/components/AnswerThread";
import { AskBar } from "@/components/AskBar";
import { FoodImage } from "@/components/FoodImage";
import { PageHeader } from "@/components/PageHeader";
import { SuggestionBubbles, type Bubble } from "@/components/SuggestionBubbles";
import { TimeBadge } from "@/components/ui/Badges";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CheckCircle } from "@/components/ui/CheckCircle";
import { ErrorState } from "@/components/ui/ErrorState";
import { IconButton } from "@/components/ui/IconButton";
import { Segmented } from "@/components/ui/Segmented";
import { Skeleton } from "@/components/ui/Skeleton";
import { Stepper } from "@/components/ui/Stepper";
import { api, friendlyMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useActions, useAppState, useRecipe, useScan } from "@/lib/data/store";
import { addRecipeToGrocery, generateRecipeFromScan, modifyRecipe, once, recipeForAI, scaleIntent } from "@/lib/flows";
import { uid } from "@/lib/id";
import { totalMinutes } from "@/lib/selectors";
import type { Recipe, Units } from "@/lib/types";
import { convertAmount, formatAmount, localizeTemperatures } from "@/lib/units";

const UNIT_OPTIONS: { value: Units; label: string }[] = [
  { value: "us", label: "US" },
  { value: "metric", label: "Metric" },
];

export function RecipeScreen() {
  const params = useSearchParams();
  const id = params.get("id");
  const scanId = params.get("scan");
  const modifier = params.get("mod");
  const router = useRouter();
  const { hydrated, profile } = useAppState();
  const actions = useActions();
  const recipe = useRecipe(id);
  const scan = useScan(recipe?.scanId ?? scanId);
  const [attempt, setAttempt] = useState(0);
  const [jobError, setJobError] = useState<string | null>(null);

  const generating = hydrated && !jobError && (!!modifier || (!id && !!scanId));

  // Create a recipe from a scan, or apply a modifier to an existing recipe.
  useEffect(() => {
    if (!hydrated || jobError) return;
    let cancelled = false;
    const done = (next: Recipe) => {
      actions.saveRecipe(next);
      if (next.scanId) actions.updateScan(next.scanId, (s) => ({ ...s, recipeId: next.id, confirmed: true }));
      if (!cancelled) router.replace(`/recipe?id=${next.id}`);
    };
    const fail = (e: unknown) => !cancelled && setJobError(friendlyMessage(e));

    if (modifier && id) {
      const base = actions.getState().recipes.find((r) => r.id === id);
      if (!base) return;
      const baseScan = base.scanId ? actions.getState().scans.find((s) => s.id === base.scanId) ?? null : null;
      once(`mod:${id}:${modifier}`, () => modifyRecipe(base, modifier, baseScan, actions.getState().profile)).then(done, fail);
    } else if (!id && scanId) {
      const source = actions.getState().scans.find((s) => s.id === scanId);
      if (!source) return;
      once(`gen:${scanId}:${modifier ?? ""}`, () => generateRecipeFromScan(source, actions.getState().profile, modifier)).then(done, fail);
    }
    return () => {
      cancelled = true;
    };
  }, [hydrated, id, scanId, modifier, attempt, jobError, actions, router]);

  if (!hydrated) return <RecipeSkeleton />;

  if (jobError) {
    return (
      <main className="mx-auto max-w-xl px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <PageHeader fallbackHref={scanId ? `/results?id=${scanId}` : "/"} />
        <ErrorState
          className="mt-6"
          title={modifier ? "We couldn't update the recipe" : "We couldn't write the recipe"}
          message={jobError}
          onRetry={() => {
            setJobError(null);
            setAttempt((a) => a + 1);
          }}
        >
          {modifier && id && (
            <Button variant="secondary" onClick={() => router.replace(`/recipe?id=${id}`)}>
              Keep the current one
            </Button>
          )}
        </ErrorState>
      </main>
    );
  }

  if (generating) {
    const missing = (modifier && id && !recipe) || (!id && scanId && !scan);
    if (!missing) return <RecipeSkeleton message={modifier ? `Updating: ${modifier}` : undefined} />;
  }

  if (!recipe) {
    return (
      <main className="mx-auto max-w-xl px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <PageHeader />
        <ErrorState className="mt-6" title="We couldn't find that recipe" message="It may have been deleted.">
          <ButtonLink href="/" variant="dark">
            Go home
          </ButtonLink>
        </ErrorState>
      </main>
    );
  }

  return <RecipeView key={recipe.id} recipe={recipe} defaultUnits={profile.units} />;
}

// ---------------------------------------------------------------------------

function RecipeView({ recipe, defaultUnits }: { recipe: Recipe; defaultUnits: Units }) {
  const router = useRouter();
  const actions = useActions();
  const { profile, grocery } = useAppState();
  const scan = useScan(recipe.scanId);
  const [servings, setServings] = useState(recipe.servings);
  const [units, setUnits] = useState<Units>(defaultUnits);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const factor = servings / recipe.servings;
  const inGrocery = grocery.sources.some((s) => s.recipeId === recipe.id);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const ingredients = useMemo(
    () =>
      recipe.ingredients.map((ing) => ({
        ...ing,
        amount: formatAmount(convertAmount({ quantity: ing.quantity, unit: ing.unit }, factor, units)),
      })),
    [recipe.ingredients, factor, units],
  );

  const bubbles: Bubble[] = useMemo(() => {
    const list: Bubble[] = recipe.follow_up_actions.map((f, i) => ({
      id: `f${i}`,
      label: f.label,
      kind: scaleIntent(f.label) ? "scale" : f.type,
    }));
    if (!list.some((b) => b.kind === "scale")) list.push({ id: "double", label: "Double it", kind: "scale" });
    const explain = recipe.steps.length >= 3 ? `Explain step ${Math.min(3, recipe.steps.length)}` : null;
    if (explain && !list.some((b) => /explain step/i.test(b.label))) list.push({ id: "explain", label: explain, kind: "question" });
    return list;
  }, [recipe.follow_up_actions, recipe.steps.length]);

  const ask = async (question: string, bubbleId = "ask") => {
    setPendingQuestion(question);
    setBusyId(bubbleId);
    setError(null);
    try {
      const res = await api.ask({
        question,
        dish: { name: recipe.title, cuisine: scan?.analysis.cuisine ?? null, visible_ingredients: scan?.ingredients ?? [] },
        recipe: recipeForAI(recipe),
        history: recipe.qa.slice(-3).map((q) => ({ question: q.question, answer: q.answer })),
        diet: profile.diet,
        units,
      });
      actions.updateRecipe(recipe.id, (r) => ({
        ...r,
        qa: [...r.qa, { id: uid(), question, answer: res.answer, followUps: res.follow_ups, createdAt: Date.now() }],
      }));
    } catch (e) {
      setError({ message: friendlyMessage(e), retry: () => ask(question, bubbleId) });
    } finally {
      setPendingQuestion(null);
      setBusyId(null);
    }
  };

  const onBubble = (bubble: Bubble) => {
    if (bubble.kind === "scale") {
      const f = scaleIntent(bubble.label) ?? 2;
      const next = Math.min(24, Math.max(1, Math.round(servings * f)));
      setServings(next);
      setToast(`Scaled to ${next} servings`);
      return;
    }
    if (bubble.kind === "modify" || bubble.kind === "recipe") {
      router.push(`/recipe?id=${recipe.id}&mod=${encodeURIComponent(bubble.label)}`);
      return;
    }
    void ask(bubble.label, bubble.id);
  };

  const addToGrocery = () => {
    addRecipeToGrocery(actions, recipe, servings);
    router.push("/grocery");
  };

  const share = async () => {
    const text = `${recipe.title}\n\n${recipe.ingredients.map((i) => `• ${formatAmount(convertAmount({ quantity: i.quantity, unit: i.unit }, factor, units))} ${i.name}`).join("\n")}\n\n${recipe.steps.map((s) => `${s.number}. ${localizeTemperatures(s.instruction, units)}`).join("\n")}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: recipe.title, text });
        return;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return; // user closed the share sheet
    }
    try {
      await navigator.clipboard.writeText(text);
      setToast("Recipe copied");
    } catch {
      setToast("Couldn't share or copy from here");
    }
  };

  const cookHref = `/cook?id=${recipe.id}&s=${servings}&u=${units}`;

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-40 pt-[max(1rem,env(safe-area-inset-top))] lg:max-w-3xl">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-card-lg bg-chip shadow-soft">
        <FoodImage imageId={recipe.imageId} imageUrl={recipe.imageUrl} alt={recipe.title} className="aspect-[4/3] w-full sm:aspect-[16/10]" />
        <PageHeader
          overlay
          fallbackHref={recipe.scanId ? `/results?id=${recipe.scanId}` : "/"}
          actions={
            <IconButton label="Share recipe" tone="glass" onClick={share}>
              <Share2 className="h-5 w-5" />
            </IconButton>
          }
        />
        <TimeBadge minutes={totalMinutes(recipe)} className="absolute bottom-4 right-4" />
      </section>

      <header className="mt-5 px-1">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight [text-wrap:balance]">{recipe.title}</h1>
        <p className="mt-1.5 flex items-start gap-1.5 text-sm text-subtle">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          A home version inspired by this dish — not the restaurant&apos;s exact recipe.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2 text-sm font-semibold" aria-label="Recipe facts">
          <li className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 shadow-sm">
            <Clock className="h-4 w-4 text-rust" aria-hidden /> {recipe.prep_minutes} min prep · {recipe.cook_minutes} min cook
          </li>
          <li className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 capitalize shadow-sm">
            <Flame className="h-4 w-4 text-rust" aria-hidden /> {recipe.difficulty}
          </li>
          <li className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 shadow-sm">
            <Users className="h-4 w-4 text-rust" aria-hidden /> Serves {recipe.servings}
          </li>
        </ul>
        <p className="mt-4 text-[16px] leading-relaxed text-ink/85">{recipe.description}</p>
      </header>

      {recipe.parentId && recipe.change_summary && (
        <div className="mt-4 flex items-start gap-3 rounded-card bg-olive-50 p-4">
          <WandSparkles className="mt-0.5 h-5 w-5 shrink-0 text-olive-700" aria-hidden />
          <div className="min-w-0 flex-1 text-[15px]">
            <p className="font-semibold text-olive-700">Updated{recipe.modifier ? `: ${recipe.modifier}` : ""}</p>
            <p className="text-ink/80">{recipe.change_summary}</p>
          </div>
          <Link
            href={`/recipe?id=${recipe.parentId}`}
            className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full bg-white px-3 text-sm font-semibold"
          >
            <History className="h-4 w-4" aria-hidden /> Previous
          </Link>
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        {/* Ingredients */}
        <section aria-labelledby="ing-title" className="rounded-card-lg bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="ing-title" className="text-xl font-bold">
              Ingredients
            </h2>
            <Segmented label="Units" value={units} options={UNIT_OPTIONS} onChange={setUnits} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-full bg-canvas p-1.5 pl-4">
            <span className="text-sm font-semibold text-subtle">Servings</span>
            <Stepper label="servings" value={servings} onChange={setServings} format={(n) => `${n} serving${n === 1 ? "" : "s"}`} />
          </div>
          <ul className="mt-3 divide-y divide-line">
            {ingredients.map((ing, i) => {
              const isChecked = checked.has(i);
              return (
                <li key={`${ing.name}-${i}`}>
                  <label className="flex min-h-14 cursor-pointer items-center gap-3 py-2.5">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={isChecked}
                      onChange={() =>
                        setChecked((prev) => {
                          const next = new Set(prev);
                          if (next.has(i)) next.delete(i);
                          else next.add(i);
                          return next;
                        })
                      }
                    />
                    <CheckCircle checked={isChecked} />
                    <span className={cn("min-w-0 flex-1 text-[15px] leading-snug", isChecked && "text-muted line-through")}>
                      <span className="font-bold">{ing.amount}</span> {ing.name}
                      {ing.notes && <span className="text-subtle">, {ing.notes}</span>}
                    </span>
                    {ing.inferred && (
                      <span
                        className="shrink-0 rounded-full bg-chip px-2.5 py-1 text-xs font-semibold text-subtle"
                        title="Not visible in the photo. We inferred it."
                      >
                        inferred
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
          {recipe.ingredients.some((i) => i.inferred) && (
            <p className="mt-2 text-xs text-subtle">
              <span className="font-semibold">inferred</span> = we couldn&apos;t see it in the photo, but dishes like this usually need it.
            </p>
          )}
          {recipe.equipment.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-subtle">Equipment</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {recipe.equipment.map((e) => (
                  <li key={e} className="rounded-full bg-chip px-3 py-1.5 text-sm font-medium">
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <div className="space-y-5">
          {/* Steps preview */}
          <section aria-labelledby="steps-title" className="rounded-card-lg bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <h2 id="steps-title" className="text-xl font-bold">
                Steps
              </h2>
              <Link href={cookHref} className="text-sm font-semibold text-olive-700 underline-offset-4 hover:underline">
                Cook step by step
              </Link>
            </div>
            <ol className="mt-4 space-y-4">
              {recipe.steps.map((step) => (
                <li key={step.number} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-chip text-sm font-bold">{step.number}</span>
                  <div className="min-w-0 pt-1 text-[15px] leading-relaxed">
                    <p>{localizeTemperatures(step.instruction, units)}</p>
                    {step.duration_minutes ? (
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-rust-50 px-2.5 py-0.5 text-xs font-semibold text-rust-600">
                        <Clock className="h-3.5 w-3.5" aria-hidden /> {step.duration_minutes} min
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {recipe.tips.length > 0 && (
            <section aria-labelledby="tips-title" className="rounded-card-lg bg-white p-5 shadow-soft">
              <h2 id="tips-title" className="text-lg font-bold">
                Where home cooks usually go wrong
              </h2>
              <ul className="mt-3 space-y-3">
                {recipe.tips.map((tip) => (
                  <li key={tip} className="flex gap-3 text-[15px] leading-relaxed">
                    <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-[#d3a12a]" aria-hidden />
                    {tip}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {recipe.substitutions.length > 0 && (
            <section aria-labelledby="subs-title" className="rounded-card-lg bg-white p-5 shadow-soft">
              <h2 id="subs-title" className="text-lg font-bold">
                Substitutions
              </h2>
              <ul className="mt-3 space-y-3">
                {recipe.substitutions.map((s) => (
                  <li key={s.ingredient} className="flex gap-3 text-[15px] leading-relaxed">
                    <ArrowLeftRight className="mt-0.5 h-5 w-5 shrink-0 text-olive" aria-hidden />
                    <span>
                      <span className="font-semibold">{s.ingredient}:</span> {s.swap}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <aside className="flex gap-3 rounded-card bg-rust-50 p-4 text-[15px] leading-relaxed text-ink" aria-label="Allergy notice">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rust" aria-hidden />
            <p>
              Ingredients are estimated from a photo. Don&apos;t rely on this for allergies — always check with the restaurant.
            </p>
          </aside>
        </div>
      </div>

      {/* Follow-ups */}
      <section aria-labelledby="followups-title" className="mt-8">
        <h2 id="followups-title" className="mb-3 px-1 text-lg font-bold">
          Make it your own
        </h2>
        <SuggestionBubbles bubbles={bubbles} onSelect={onBubble} busyId={busyId} size="md" label="Recipe suggestions" />
        <div className="mt-5 space-y-4">
          {error && <ErrorState message={error.message} onRetry={error.retry} />}
          <AnswerThread
            items={recipe.qa}
            pendingQuestion={pendingQuestion}
            busyId={busyId}
            onFollowUp={(b) => onBubble({ ...b, kind: scaleIntent(b.label) ? "scale" : b.kind })}
          />
          <AskBar onAsk={(q) => void ask(q)} disabled={!!busyId} placeholder="Ask anything about this recipe…" />
        </div>
      </section>

      {toast && (
        <p role="status" className="fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-50 -translate-x-1/2 rounded-full bg-night px-4 py-2.5 text-sm font-semibold text-white shadow-float motion-safe:animate-slide-up">
          {toast}
        </p>
      )}

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-canvas via-canvas/95 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
        <div className="mx-auto flex max-w-xl items-center gap-2 rounded-full bg-white p-1.5 shadow-float ring-1 ring-black/5">
          <ButtonLink href={cookHref} variant="primary" className="flex-1 px-4" icon={<ChefHat className="h-5 w-5" aria-hidden />}>
            Start cooking
          </ButtonLink>
          <Button
            variant="secondary"
            className="px-4"
            onClick={addToGrocery}
            icon={<ListChecks className="h-5 w-5" aria-hidden />}
            aria-label={inGrocery ? "Update grocery list" : "Add to grocery list"}
          >
            <span className="hidden min-[420px]:inline">Grocery list</span>
          </Button>
          <Button
            variant="dark"
            className="px-4"
            onClick={() => {
              actions.toggleSaved(recipe.id);
              setToast(recipe.saved ? "Removed from saved" : "Saved to your recipes");
            }}
            aria-pressed={recipe.saved}
            icon={<Heart className={cn("h-5 w-5", recipe.saved && "fill-rust text-rust")} aria-hidden />}
          >
            {recipe.saved ? "Saved" : "Save"}
          </Button>
        </div>
      </div>
    </main>
  );
}

const LOADING_LINES = ["Writing your recipe…", "Working out quantities…", "Timing each step…", "Adding a few chef tips…"];

function RecipeSkeleton({ message }: { message?: string }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setIndex((i) => (i + 1) % LOADING_LINES.length), 2000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <main className="mx-auto w-full max-w-xl space-y-5 px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top))]" aria-busy="true">
      <div className="relative">
        <Skeleton className="aspect-[4/3] w-full rounded-card-lg" />
        <p role="status" aria-live="polite" className="absolute bottom-4 left-4 rounded-full bg-white px-4 py-2.5 text-[15px] font-semibold shadow-soft">
          <span className="mr-2 inline-block h-2 w-2 animate-pulse-soft rounded-full bg-rust align-middle" aria-hidden />
          {message ?? LOADING_LINES[index]}
        </p>
      </div>
      <Skeleton className="h-9 w-3/4 rounded-full" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-40 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
      <div className="space-y-3 rounded-card-lg bg-white p-5 shadow-soft">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-5 rounded-full" />
        ))}
      </div>
    </main>
  );
}
