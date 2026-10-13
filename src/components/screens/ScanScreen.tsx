"use client";
/* eslint-disable @next/next/no-img-element -- previews are local data URLs */

import { Camera, FileText, ImagePlus, Plus, ScanSearch, StickyNote, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ErrorState } from "@/components/ui/ErrorState";
import { IconButton } from "@/components/ui/IconButton";
import { api, friendlyMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useActions, useAppState } from "@/lib/data/store";
import { uid } from "@/lib/id";
import { prepareImage, storeImage, type PreparedImage } from "@/lib/images";
import type { Scan } from "@/lib/types";

const NOTE_IDEAS = ["It was spicy", "Creamy sauce", "Smoky / grilled", "Had a crunchy topping", "Sweet and sour", "Very garlicky"];

type Status = { kind: "idle" } | { kind: "analyzing" } | { kind: "not_food" } | { kind: "error"; message: string };

export function ScanScreen() {
  const router = useRouter();
  const { profile } = useAppState();
  const { saveScan } = useActions();
  const [meal, setMeal] = useState<PreparedImage | null>(null);
  const [menu, setMenu] = useState<PreparedImage | null>(null);
  const [processing, setProcessing] = useState<"meal" | "menu" | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const pick = (which: "meal" | "menu") => async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPickError(null);
    setProcessing(which);
    try {
      const prepared = await prepareImage(file);
      if (which === "meal") {
        setMeal(prepared);
        setStatus({ kind: "idle" });
      } else {
        setMenu(prepared);
      }
    } catch {
      setPickError("We couldn't read that image. Try a JPG or PNG photo.");
    } finally {
      setProcessing(null);
    }
  };

  const analyze = async () => {
    if (!meal) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus({ kind: "analyzing" });
    try {
      const analysis = await api.analyze(
        { mealImage: meal.forAI, menuImage: menu?.forAI ?? null, note: note.trim() || null, diet: profile.diet, dishHint: null },
        controller.signal,
      );
      if (analysis.not_food) {
        setStatus({ kind: "not_food" });
        return;
      }
      const id = uid();
      const mealImageId = `${id}-meal`;
      const menuImageId = menu ? `${id}-menu` : null;
      // Storage can be full; the images stay in memory for this session either way.
      await storeImage(mealImageId, meal);
      if (menu && menuImageId) await storeImage(menuImageId, menu);
      const scan: Scan = {
        id,
        createdAt: Date.now(),
        mealImageId,
        menuImageId,
        note: note.trim(),
        analysis,
        dishName: analysis.dish_name,
        confirmed: false,
        ingredients: analysis.visible_ingredients,
        recipeId: null,
        qa: [],
      };
      saveScan(scan);
      router.push(`/results?id=${id}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus({ kind: "error", message: friendlyMessage(error) });
    }
  };

  const analyzing = status.kind === "analyzing";

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-36 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="px-1">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">Scan a meal</h1>
        <p className="mt-1 text-[15px] text-subtle">Snap the dish. We&apos;ll figure out how to make it at home.</p>
      </header>

      {/* 1. Meal photo (required) */}
      <section aria-labelledby="meal-photo" className="mt-5 rounded-card-lg bg-white p-4 shadow-soft">
        <h2 id="meal-photo" className="sr-only">
          Meal photo
        </h2>
        {meal ? (
          <div className="relative overflow-hidden rounded-card">
            <img src={meal.forStorage} alt="Your meal photo" className="aspect-[4/3] w-full object-cover" />
            {analyzing ? (
              <AnalyzingOverlay hasMenu={!!menu} />
            ) : (
              <IconButton
                label="Remove meal photo"
                tone="glass"
                size="sm"
                className="absolute right-3 top-3"
                onClick={() => {
                  setMeal(null);
                  setStatus({ kind: "idle" });
                }}
              >
                <X className="h-5 w-5" />
              </IconButton>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "flex aspect-[4/3] flex-col items-center justify-center rounded-card border-2 border-dashed border-line bg-canvas px-6 text-center",
              processing === "meal" && "skeleton border-transparent",
            )}
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-olive-700 shadow-soft">
              <Camera className="h-7 w-7" aria-hidden />
            </span>
            <p className="mt-4 text-lg font-bold">{processing === "meal" ? "Preparing photo…" : "Photo of your meal"}</p>
            <p className="mt-1 text-sm text-subtle">Shoot from above in good light for the best results.</p>
          </div>
        )}
        {!meal && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <FilePickButton label="Take photo" icon={<Camera className="h-5 w-5" aria-hidden />} capture variant="primary" onChange={pick("meal")} disabled={!!processing} />
            <FilePickButton label="Upload" icon={<ImagePlus className="h-5 w-5" aria-hidden />} variant="secondary" onChange={pick("meal")} disabled={!!processing} />
          </div>
        )}
      </section>

      {/* 2. Menu photo (optional) */}
      <section aria-labelledby="menu-photo" className="mt-4 rounded-card bg-white p-4 shadow-soft">
        <div className="flex items-center gap-3">
          {menu ? (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
              <img src={menu.forStorage} alt="Menu description photo" className="h-full w-full object-cover" />
            </div>
          ) : (
            <span className={cn("flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-canvas text-subtle", processing === "menu" && "skeleton")}>
              <FileText className="h-6 w-6" aria-hidden />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 id="menu-photo" className="text-[15px] font-bold">
              {menu ? "Menu description added" : "Add the menu description"}
              <span className="font-medium text-subtle"> (optional)</span>
            </h2>
            <p className="text-sm text-subtle">Improves accuracy.</p>
          </div>
          {menu ? (
            <IconButton label="Remove menu photo" tone="chip" size="sm" onClick={() => setMenu(null)} disabled={analyzing}>
              <X className="h-5 w-5" />
            </IconButton>
          ) : (
            <FilePickButton label="Add" iconOnly icon={<Plus className="h-5 w-5" aria-hidden />} variant="secondary" onChange={pick("menu")} disabled={!!processing || analyzing} ariaLabel="Add a photo of the menu description" />
          )}
        </div>
      </section>

      {/* 3. Note (optional) */}
      <section aria-label="Note" className="mt-4">
        {noteOpen ? (
          <div className="rounded-card bg-white p-4 shadow-soft motion-safe:animate-fade-in">
            <label htmlFor="note" className="text-[15px] font-bold">
              Anything we can&apos;t see? <span className="font-medium text-subtle">(optional)</span>
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. it was spicy, had a creamy sauce"
              rows={2}
              maxLength={600}
              className="mt-2 w-full resize-none rounded-3xl bg-canvas px-4 py-3 text-[16px] outline-none placeholder:text-muted focus:ring-2 focus:ring-olive"
            />
            <div className="mt-2 flex flex-wrap gap-2" aria-label="Quick notes">
              {NOTE_IDEAS.map((idea) => (
                <Chip
                  key={idea}
                  size="sm"
                  tone="white"
                  onClick={() => setNote((n) => (n.trim() ? `${n.trim().replace(/[.,]$/, "")}, ${idea.toLowerCase()}` : idea))}
                  icon={<Plus className="h-3.5 w-3.5" aria-hidden />}
                >
                  {idea}
                </Chip>
              ))}
            </div>
          </div>
        ) : (
          <Chip tone="white" onClick={() => setNoteOpen(true)} icon={<StickyNote className="h-4 w-4" aria-hidden />}>
            Add a note
          </Chip>
        )}
      </section>

      {pickError && (
        <p role="alert" className="mt-4 rounded-3xl bg-rust-50 px-4 py-3 text-[15px] text-rust-600">
          {pickError}
        </p>
      )}

      {status.kind === "not_food" && (
        <ErrorState
          className="mt-5"
          title="That doesn't look like a meal"
          message="Try another photo of the dish, shot from above in good light."
          onRetry={() => {
            setMeal(null);
            setStatus({ kind: "idle" });
          }}
          retryLabel="Choose another photo"
        />
      )}
      {status.kind === "error" && <ErrorState className="mt-5" message={status.message} onRetry={analyze} />}

      {status.kind !== "not_food" && (
        <Button
          variant="primary"
          size="lg"
          full
          className="mt-6"
          onClick={analyze}
          disabled={!meal || !!processing}
          loading={analyzing}
          icon={<ScanSearch className="h-5 w-5" aria-hidden />}
        >
          {analyzing ? "Analyzing…" : "Analyze"}
        </Button>
      )}
      {!meal && <p className="mt-3 text-center text-sm text-subtle">Add a meal photo to continue.</p>}
    </main>
  );
}

interface FilePickButtonProps {
  label: string;
  icon: React.ReactNode;
  variant: "primary" | "secondary";
  capture?: boolean;
  iconOnly?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

/** A styled <label> wrapping a hidden file input (works with keyboard + screen readers). */
function FilePickButton({ label, icon, variant, capture, iconOnly, ariaLabel, disabled, onChange }: FilePickButtonProps) {
  return (
    <label
      className={cn(
        "relative inline-flex cursor-pointer select-none items-center justify-center gap-2 rounded-full font-semibold transition",
        "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink motion-safe:active:scale-[0.97]",
        iconOnly ? "h-12 w-12 shrink-0" : "min-h-14 px-5 text-base",
        variant === "primary" ? "bg-olive text-white hover:bg-olive-600" : "bg-chip text-ink hover:bg-line",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <input
        type="file"
        accept="image/*"
        capture={capture ? "environment" : undefined}
        className="sr-only"
        onChange={onChange}
        disabled={disabled}
        aria-label={ariaLabel ?? label}
      />
      {icon}
      {!iconOnly && <span>{label}</span>}
    </label>
  );
}

const MESSAGES = ["Identifying the dish…", "Spotting ingredients…", "Thinking about how it was cooked…", "Lining up your next steps…"];

function AnalyzingOverlay({ hasMenu }: { hasMenu: boolean }) {
  const messages = hasMenu ? [MESSAGES[0], "Reading the menu…", ...MESSAGES.slice(1)] : MESSAGES;
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setIndex((i) => (i + 1) % messages.length), 1900);
    return () => window.clearInterval(t);
  }, [messages.length]);
  return (
    <div className="absolute inset-0 flex items-end bg-black/35">
      <div
        className="absolute inset-0 animate-shimmer bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.35)_50%,transparent_75%)] bg-[length:200%_100%]"
        aria-hidden
      />
      <p role="status" aria-live="polite" className="relative m-4 rounded-full bg-white/95 px-4 py-2.5 text-[15px] font-semibold text-ink shadow-soft">
        <span className="mr-2 inline-block h-2 w-2 animate-pulse-soft rounded-full bg-rust align-middle" aria-hidden />
        {messages[index]}
      </p>
    </div>
  );
}
