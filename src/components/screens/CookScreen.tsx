"use client";

import { ChevronLeft, ChevronRight, Lightbulb, PartyPopper, ShoppingBasket, Sun, Thermometer, Timer, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StepNavigator } from "@/components/StepNavigator";
import { TimerPill } from "@/components/timers/TimerPill";
import { useTimers } from "@/components/timers/TimerProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { useWakeLock } from "@/hooks/useWakeLock";
import { cn } from "@/lib/cn";
import { useActions, useAppState, useRecipe } from "@/lib/data/store";
import { itemKey } from "@/lib/grocery";
import type { Recipe, Units } from "@/lib/types";
import { convertAmount, formatAmount, localizeTemperatures } from "@/lib/units";

function splitSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+["')]?|[^.!?]+$/g)?.map((s) => s.trim()) ?? [text];
}

export function CookScreen() {
  const params = useSearchParams();
  const { hydrated, profile } = useAppState();
  const recipe = useRecipe(params.get("id"));
  const servings = Number(params.get("s")) || recipe?.servings || 1;
  const units = (params.get("u") as Units | null) ?? profile.units;

  if (!hydrated) {
    return (
      <main className="mx-auto max-w-2xl space-y-6 px-5 pt-8" aria-busy="true">
        <Skeleton className="h-8 w-1/2 rounded-full" />
        <Skeleton className="h-40 w-full" />
      </main>
    );
  }
  if (!recipe) {
    return (
      <main className="mx-auto max-w-xl px-4 pt-8">
        <ErrorState title="We couldn't find that recipe" message="Open a recipe and tap Start cooking.">
          <ButtonLink href="/" variant="dark">
            Go home
          </ButtonLink>
        </ErrorState>
      </main>
    );
  }
  return <CookingMode recipe={recipe} servings={servings} units={units} />;
}

function CookingMode({ recipe, servings, units }: { recipe: Recipe; servings: number; units: Units }) {
  const router = useRouter();
  const actions = useActions();
  const { timers, start } = useTimers();
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [peekOpen, setPeekOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const wake = useWakeLock(!finished);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const steps = recipe.steps;
  const step = steps[index];
  const factor = servings / recipe.servings;
  const isLast = index === steps.length - 1;

  const go = useCallback(
    (next: number) => {
      if (next < 0) return;
      if (next >= steps.length) {
        setFinished(true);
        return;
      }
      setIndex(next);
    },
    [steps.length],
  );

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (peekOpen || (e.target as HTMLElement)?.closest("input, textarea")) return;
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, peekOpen]);

  const stepIngredients = useMemo(() => {
    if (!step) return [];
    const wanted = new Set(step.ingredients_used.map(itemKey));
    const list = showAll ? recipe.ingredients : recipe.ingredients.filter((i) => wanted.has(itemKey(i.name)));
    return list.map((i) => ({
      ...i,
      amount: formatAmount(convertAmount({ quantity: i.quantity, unit: i.unit }, factor, units)),
    }));
  }, [step, showAll, recipe.ingredients, factor, units]);

  const exit = () => router.replace(`/recipe?id=${recipe.id}`);

  if (finished) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-olive text-white">
          <PartyPopper className="h-9 w-9" aria-hidden />
        </span>
        <h1 className="mt-6 text-3xl font-bold">Enjoy your meal!</h1>
        <p className="mt-2 text-[16px] text-subtle">You just made {recipe.title} at home.</p>
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
          {!recipe.saved && (
            <Button variant="dark" size="lg" full onClick={() => actions.toggleSaved(recipe.id)}>
              Save this recipe
            </Button>
          )}
          <Button variant="secondary" size="lg" full onClick={exit}>
            Back to recipe
          </Button>
          <Button variant="ghost" full onClick={() => { setFinished(false); setIndex(0); }}>
            Start over
          </Button>
        </div>
      </main>
    );
  }

  const prev = steps[index - 1];
  const next = steps[index + 1];
  const prevTail = prev ? splitSentences(localizeTemperatures(prev.instruction, units)).slice(-1)[0] : null;
  const nextHead = next ? splitSentences(localizeTemperatures(next.instruction, units))[0] : null;
  const stepTimer = timers.find((t) => t.recipeId === recipe.id && t.step === step.number);
  const otherTimers = timers.filter((t) => t !== stepTimer);

  return (
    <main
      className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        if (!touch.current) return;
        const dx = e.changedTouches[0].clientX - touch.current.x;
        const dy = e.changedTouches[0].clientY - touch.current.y;
        touch.current = null;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      <header className="flex items-center gap-3">
        <IconButton label="Exit cooking mode" onClick={exit}>
          <X className="h-5 w-5" />
        </IconButton>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-semibold text-subtle">{recipe.title}</p>
          {wake === "active" && (
            <p className="inline-flex items-center gap-1 text-xs text-olive-700">
              <Sun className="h-3.5 w-3.5" aria-hidden /> Screen stays on
            </p>
          )}
        </div>
        <IconButton label="Ingredients for this step" onClick={() => setPeekOpen(true)}>
          <ShoppingBasket className="h-5 w-5" />
        </IconButton>
      </header>

      <section className="flex flex-1 flex-col justify-center py-8" aria-live="polite">
        <h1 ref={headingRef} tabIndex={-1} className="mb-5 text-sm font-bold uppercase tracking-[0.14em] text-rust outline-none">
          Step {step.number} of {steps.length}
        </h1>
        <div className="text-[26px] font-semibold leading-snug tracking-tight sm:text-[32px]">
          {prevTail && (
            <p className="mb-3 line-clamp-2 text-[#c9c9c4]" aria-hidden>
              {prevTail}
            </p>
          )}
          <p key={index} className="text-ink motion-safe:animate-fade-in">
            {localizeTemperatures(step.instruction, units)}
          </p>
          {nextHead && (
            <p className="mt-3 line-clamp-2 text-[#c9c9c4]" aria-hidden>
              {nextHead}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          {step.duration_minutes ? (
            stepTimer ? (
              <TimerPill timer={stepTimer} className="w-full max-w-sm" />
            ) : (
              <Button
                variant="primary"
                onClick={() =>
                  start({
                    label: `Step ${step.number}`,
                    minutes: step.duration_minutes ?? 1,
                    recipeId: recipe.id,
                    step: step.number,
                  })
                }
                icon={<Timer className="h-5 w-5" aria-hidden />}
              >
                Start timer · {step.duration_minutes} min
              </Button>
            )
          ) : null}
          {step.temperature && (
            <span className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-chip px-4 text-[15px] font-semibold">
              <Thermometer className="h-4 w-4 text-rust" aria-hidden /> {localizeTemperatures(step.temperature, units)}
            </span>
          )}
        </div>

        {isLast && recipe.tips[0] && (
          <p className="mt-6 flex gap-2 rounded-3xl bg-white p-4 text-[15px] shadow-soft">
            <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-[#d3a12a]" aria-hidden /> {recipe.tips[0]}
          </p>
        )}
      </section>

      {otherTimers.length > 0 && (
        <div className="mb-4 space-y-2" aria-label="Other timers">
          {otherTimers.map((t) => (
            <TimerPill key={t.id} timer={t} />
          ))}
        </div>
      )}

      <StepNavigator count={steps.length} current={index} onSelect={go} />

      <div className="mt-4 flex gap-3">
        <Button
          variant="secondary"
          size="lg"
          className="px-6"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          icon={<ChevronLeft className="h-5 w-5" aria-hidden />}
        >
          Back
        </Button>
        <Button variant={isLast ? "primary" : "dark"} size="lg" className="flex-1" onClick={() => go(index + 1)}>
          {isLast ? "Finish" : "Next step"}
          {!isLast && <ChevronRight className="h-5 w-5" aria-hidden />}
        </Button>
      </div>
      <p className="mt-3 text-center text-xs text-subtle">Swipe or use ← → keys to move between steps.</p>

      <BottomSheet open={peekOpen} onClose={() => setPeekOpen(false)} title={showAll ? "All ingredients" : `For step ${step.number}`}>
        {stepIngredients.length ? (
          <ul className="divide-y divide-line">
            {stepIngredients.map((i, k) => (
              <li key={`${i.name}-${k}`} className="flex min-h-12 items-center gap-3 py-2 text-[15px]">
                <span className="min-w-[5.5rem] font-bold">{i.amount}</span>
                <span className="min-w-0 flex-1">
                  {i.name}
                  {i.notes && <span className="text-subtle">, {i.notes}</span>}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-2 text-[15px] text-subtle">No new ingredients in this step.</p>
        )}
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className={cn("mt-4 min-h-11 rounded-full bg-chip px-4 text-sm font-semibold")}
        >
          {showAll ? "Only this step" : "Show all ingredients"}
        </button>
      </BottomSheet>
    </main>
  );
}
