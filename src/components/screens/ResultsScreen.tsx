"use client";

import { ArrowRight, Check, ChefHat, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AnswerThread } from "@/components/AnswerThread";
import { AskBar } from "@/components/AskBar";
import { FoodImage } from "@/components/FoodImage";
import { PageHeader } from "@/components/PageHeader";
import { BubblesSkeleton, SuggestionBubbles, type Bubble } from "@/components/SuggestionBubbles";
import { ButtonLink } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/ui/ErrorState";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { defaultRecipeAction } from "@/lib/ai/normalize";
import { api, friendlyMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useActions, useAppState, useRecipe, useScan } from "@/lib/data/store";
import { addRecipeToGrocery, generateRecipeFromScan, once, recipeForAI } from "@/lib/flows";
import { uid } from "@/lib/id";
import { imageForAI } from "@/lib/images";
import { totalMinutes } from "@/lib/selectors";
import type { Analysis } from "@/lib/types";

const CONFIDENCE: Record<Analysis["confidence"], { label: string; dot: string }> = {
  high: { label: "Pretty sure", dot: "bg-olive" },
  medium: { label: "Fairly sure", dot: "bg-[#d3a12a]" },
  low: { label: "Best guess", dot: "bg-rust" },
};

export function ResultsScreen() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const { hydrated, profile } = useAppState();
  const actions = useActions();
  const scan = useScan(id);
  const recipe = useRecipe(scan?.recipeId ?? null);

  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [reopened, setReopened] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [newIngredient, setNewIngredient] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!hydrated) return <ResultsSkeleton />;
  if (!scan) {
    return (
      <main className="mx-auto max-w-xl px-4 pt-6">
        <PageHeader />
        <ErrorState className="mt-6" title="We couldn't find that scan" message="It may have been deleted. Start a new scan from the home screen.">
          <ButtonLink href="/scan" variant="primary">
            Scan a meal
          </ButtonLink>
        </ErrorState>
      </main>
    );
  }

  const { analysis } = scan;
  const confidence = CONFIDENCE[analysis.confidence];
  const showConfirm = !scan.confirmed || reopened;
  const emphasize = analysis.confidence === "low" && !scan.confirmed;

  // ---------- dish confirmation ----------

  const chooseDish = async (name: string) => {
    const dish = name.trim();
    setEditing(false);
    setReopened(false);
    if (!dish) return;
    if (dish.toLowerCase() === scan.dishName.toLowerCase()) {
      actions.updateScan(scan.id, (s) => ({ ...s, confirmed: true }));
      return;
    }
    const previous = scan.dishName;
    setNotice(null);
    setRefreshing(true);
    // Optimistic: switch the dish now, refresh suggestions in the background.
    actions.updateScan(scan.id, (s) => ({
      ...s,
      dishName: dish,
      confirmed: true,
      recipeId: null,
      analysis: {
        ...s.analysis,
        suggested_actions: s.analysis.suggested_actions.map((a) => (a.type === "recipe" ? defaultRecipeAction(dish) : a)),
      },
    }));
    try {
      const [mealImage, menuImage] = await Promise.all([imageForAI(scan.mealImageId), imageForAI(scan.menuImageId)]);
      if (!mealImage) throw new Error("photo unavailable");
      const fresh = await api.analyze({ mealImage, menuImage, note: scan.note || null, diet: profile.diet, dishHint: dish });
      actions.updateScan(scan.id, (s) => ({
        ...s,
        dishName: fresh.dish_name,
        ingredients: fresh.visible_ingredients,
        analysis: {
          ...fresh,
          alternatives: [previous, ...fresh.alternatives].filter((a) => a.toLowerCase() !== fresh.dish_name.toLowerCase()).slice(0, 3),
        },
      }));
    } catch {
      setNotice(`We couldn't refresh the suggestions, but your recipe will be for ${dish}.`);
    } finally {
      setRefreshing(false);
    }
  };

  // ---------- ingredients ----------

  const removeIngredient = (name: string) =>
    actions.updateScan(scan.id, (s) => ({ ...s, ingredients: s.ingredients.filter((i) => i !== name) }));

  const addIngredient = (event: FormEvent) => {
    event.preventDefault();
    const value = newIngredient.trim().toLowerCase();
    if (value && !scan.ingredients.includes(value)) {
      actions.updateScan(scan.id, (s) => ({ ...s, ingredients: [...s.ingredients, value] }));
    }
    setNewIngredient("");
    setAdding(false);
  };

  // ---------- actions ----------

  const recipeHref = (modifier?: string) => {
    const mod = modifier ? `&mod=${encodeURIComponent(modifier)}` : "";
    return recipe ? `/recipe?id=${recipe.id}${mod}` : `/recipe?scan=${scan.id}${mod}`;
  };

  const groceryFlow = async (bubbleId: string) => {
    setBusyId(bubbleId);
    setError(null);
    try {
      let target = recipe;
      if (!target) {
        const created = await once(`gen:${scan.id}:`, () => generateRecipeFromScan(scan, profile, null));
        actions.saveRecipe(created);
        actions.updateScan(scan.id, (s) => ({ ...s, recipeId: created.id, confirmed: true }));
        target = created;
      }
      addRecipeToGrocery(actions, target, target.servings);
      router.push("/grocery");
    } catch (e) {
      setError({ message: friendlyMessage(e), retry: () => groceryFlow(bubbleId) });
    } finally {
      setBusyId(null);
    }
  };

  const ask = async (question: string, bubbleId = "ask") => {
    setPendingQuestion(question);
    setBusyId(bubbleId);
    setError(null);
    try {
      const res = await api.ask({
        question,
        dish: { name: scan.dishName, cuisine: analysis.cuisine || null, visible_ingredients: scan.ingredients },
        recipe: recipe ? recipeForAI(recipe) : null,
        history: scan.qa.slice(-3).map((q) => ({ question: q.question, answer: q.answer })),
        diet: profile.diet,
        units: profile.units,
      });
      actions.updateScan(scan.id, (s) => ({
        ...s,
        qa: [...s.qa, { id: uid(), question, answer: res.answer, followUps: res.follow_ups, createdAt: Date.now() }],
      }));
    } catch (e) {
      setError({ message: friendlyMessage(e), retry: () => ask(question, bubbleId) });
    } finally {
      setPendingQuestion(null);
      setBusyId(null);
    }
  };

  const onBubble = (bubble: Bubble) => {
    if (!scan.confirmed) actions.updateScan(scan.id, (s) => ({ ...s, confirmed: true }));
    if (bubble.kind === "recipe") router.push(recipeHref());
    else if (bubble.kind === "grocery") void groceryFlow(bubble.id);
    else if (bubble.kind === "modify") router.push(recipeHref(bubble.label));
    else void ask(bubble.label, bubble.id);
  };

  const deleteScan = () => {
    setConfirmDelete(false);
    actions.deleteScan(scan.id);
    router.replace("/");
  };

  const bubbles: Bubble[] = analysis.suggested_actions.map((a) => ({ id: a.id, label: a.label, kind: a.type }));

  const confirmCard = showConfirm && (
    <section
      aria-labelledby="confirm-title"
      className={cn(
        "rounded-card-lg p-5 shadow-soft transition",
        emphasize ? "bg-rust-50 ring-2 ring-rust" : "bg-white",
      )}
    >
      <h2 id="confirm-title" className="text-lg font-bold">
        {emphasize ? "Not 100% sure. Is this right?" : "Is this right?"}
      </h2>
      {emphasize && <p className="mt-0.5 text-sm text-subtle">Tap the dish it really is. You can also type it.</p>}
      <div className="mt-3 flex flex-wrap gap-2.5">
        <Chip selected onClick={() => chooseDish(scan.dishName)} icon={<Check className="h-4 w-4" aria-hidden />}>
          Yes
        </Chip>
        {analysis.alternatives.map((alt) => (
          <Chip key={alt} tone="white" onClick={() => chooseDish(alt)}>
            {alt}
          </Chip>
        ))}
        <Chip
          tone="white"
          onClick={() => {
            setEditValue(scan.dishName);
            setEditing(true);
          }}
          icon={<Pencil className="h-4 w-4" aria-hidden />}
        >
          Edit
        </Chip>
      </div>
      {editing && (
        <form
          className="mt-3 flex gap-2 motion-safe:animate-fade-in"
          onSubmit={(e) => {
            e.preventDefault();
            void chooseDish(editValue);
          }}
        >
          <label htmlFor="dish-edit" className="sr-only">
            Dish name
          </label>
          <input
            id="dish-edit"
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            maxLength={120}
            className="min-h-12 min-w-0 flex-1 rounded-full bg-canvas px-5 text-[16px] outline-none focus:ring-2 focus:ring-olive"
          />
          <button type="submit" className="min-h-12 rounded-full bg-night px-5 font-semibold text-white">
            Use this
          </button>
        </form>
      )}
    </section>
  );

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-40 pt-[max(1rem,env(safe-area-inset-top))]">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-card-lg bg-chip shadow-soft">
        <FoodImage imageId={scan.mealImageId} alt={`Photo of ${scan.dishName}`} className="aspect-[4/3] w-full sm:aspect-[16/10]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/10" />
        <PageHeader
          overlay
          fallbackHref="/"
          actions={
            <IconButton label="Delete scan" tone="glass" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-5 w-5" />
            </IconButton>
          }
        />
        <div className="absolute inset-x-5 bottom-5">
          <span className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-sm font-semibold text-ink">
            <span className={cn("h-2 w-2 rounded-full", scan.confirmed ? "bg-olive" : confidence.dot)} aria-hidden />
            {scan.confirmed ? "Confirmed" : confidence.label}
          </span>
          <h1 className="text-[28px] font-bold leading-tight text-white [text-wrap:balance]" aria-live="polite">
            {scan.dishName}
          </h1>
          {analysis.cuisine && <p className="mt-0.5 text-[15px] text-white/85">{analysis.cuisine}</p>}
        </div>
      </section>

      <div className="mt-5 space-y-5">
        {confirmCard}
        {!showConfirm && (
          <div className="flex items-center gap-3 rounded-full bg-white py-2 pl-4 pr-2 shadow-soft">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-olive text-white">
              <Check className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">Cooking: {scan.dishName}</span>
            <Chip size="sm" onClick={() => setReopened(true)}>
              Change
            </Chip>
          </div>
        )}
        {notice && (
          <p role="status" className="rounded-3xl bg-white px-4 py-3 text-sm text-subtle shadow-soft">
            {notice}
          </p>
        )}

        {recipe && (
          <Link
            href={`/recipe?id=${recipe.id}`}
            className="flex items-center gap-3 rounded-card bg-white p-3 pr-4 shadow-soft transition hover:bg-canvas"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-olive-50 text-olive-700">
              <ChefHat className="h-6 w-6" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-subtle">Your recipe</span>
              <span className="block truncate font-semibold">{recipe.title}</span>
            </span>
            <span className="text-sm font-semibold text-rust">{totalMinutes(recipe)}min</span>
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
        )}

        {/* What I can see */}
        <section aria-labelledby="seen-title" className="rounded-card-lg bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-olive" aria-hidden />
            <h2 id="seen-title" className="text-lg font-bold">
              What I can see
            </h2>
          </div>
          <p className="mt-0.5 text-sm text-subtle">Tap to remove anything that&apos;s wrong.</p>
          {refreshing ? (
            <div className="mt-3">
              <BubblesSkeleton count={4} />
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {scan.ingredients.map((ing) => (
                <Chip key={ing} size="sm" removable onClick={() => removeIngredient(ing)} aria-label={`Remove ${ing}`}>
                  {ing}
                </Chip>
              ))}
              {adding ? (
                <form onSubmit={addIngredient} className="flex items-center gap-1.5">
                  <label htmlFor="add-ingredient" className="sr-only">
                    Add an ingredient
                  </label>
                  <input
                    id="add-ingredient"
                    autoFocus
                    value={newIngredient}
                    onChange={(e) => setNewIngredient(e.target.value)}
                    onBlur={() => !newIngredient.trim() && setAdding(false)}
                    placeholder="e.g. capers"
                    maxLength={60}
                    className="min-h-9 w-36 rounded-full bg-canvas px-3 text-[16px] outline-none ring-2 ring-olive"
                  />
                  <button type="submit" className="min-h-9 rounded-full bg-night px-3 text-sm font-semibold text-white">
                    Add
                  </button>
                </form>
              ) : (
                <Chip size="sm" tone="white" onClick={() => setAdding(true)} icon={<Plus className="h-4 w-4" aria-hidden />} aria-label="Add an ingredient">
                  Add
                </Chip>
              )}
            </div>
          )}
        </section>

        {/* Suggested actions */}
        <section aria-labelledby="next-title">
          <h2 id="next-title" className="mb-3 px-1 text-lg font-bold">
            What would you like to do?
          </h2>
          {refreshing ? <BubblesSkeleton /> : <SuggestionBubbles bubbles={bubbles} onSelect={onBubble} busyId={busyId} label="Suggested actions" />}
          {busyId && bubbles.find((b) => b.id === busyId)?.kind === "grocery" && (
            <p role="status" className="mt-3 px-1 text-sm text-subtle">
              Writing the recipe first, then building your list…
            </p>
          )}
        </section>

        {error && <ErrorState message={error.message} onRetry={error.retry} />}

        <AnswerThread
          items={scan.qa}
          pendingQuestion={pendingQuestion}
          busyId={busyId}
          onFollowUp={(b) => (b.kind === "modify" ? router.push(recipeHref(b.label)) : void ask(b.label, b.id))}
        />
      </div>

      <AskBar sticky onAsk={(q) => void ask(q)} disabled={!!busyId} />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this scan?"
        message="The photo and its suggestions will be removed. Recipes you saved stay in your library."
        confirmLabel="Delete scan"
        onConfirm={deleteScan}
        onCancel={() => setConfirmDelete(false)}
      />
    </main>
  );
}

export function ResultsSkeleton() {
  return (
    <main className="mx-auto w-full max-w-xl space-y-5 px-4 pt-4" aria-busy="true">
      <Skeleton className="aspect-[4/3] w-full rounded-card-lg" />
      <Skeleton className="h-36 w-full rounded-card-lg" />
      <BubblesSkeleton />
    </main>
  );
}
