"use client";

import { ChefHat, MessageCircle, Scale, ShoppingBasket, WandSparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type BubbleKind = "recipe" | "grocery" | "modify" | "question" | "scale";

export interface Bubble {
  id: string;
  label: string;
  kind: BubbleKind;
}

const ICONS: Record<BubbleKind, LucideIcon> = {
  recipe: ChefHat,
  grocery: ShoppingBasket,
  modify: WandSparkles,
  question: MessageCircle,
  scale: Scale,
};

const STYLES: Record<BubbleKind, string> = {
  recipe: "bg-olive text-white hover:bg-olive-600",
  grocery: "bg-night text-white hover:bg-black",
  modify: "bg-white text-ink shadow-soft hover:bg-canvas",
  question: "bg-white text-ink shadow-soft hover:bg-canvas",
  scale: "bg-white text-ink shadow-soft hover:bg-canvas",
};

interface SuggestionBubblesProps {
  bubbles: Bubble[];
  onSelect: (bubble: Bubble) => void;
  /** Id of the bubble whose action is running (shows a spinner). */
  busyId?: string | null;
  disabled?: boolean;
  size?: "lg" | "md";
  label?: string;
  className?: string;
}

/** Big tappable suggestion pills. The primary way to move forward without typing. */
export function SuggestionBubbles({
  bubbles,
  onSelect,
  busyId,
  disabled,
  size = "lg",
  label = "Suggestions",
  className,
}: SuggestionBubblesProps) {
  return (
    <ul aria-label={label} className={cn("flex flex-wrap gap-2.5", className)}>
      {bubbles.map((bubble, index) => {
        const Icon = ICONS[bubble.kind];
        const busy = busyId === bubble.id;
        return (
          <li key={bubble.id} className="max-w-full motion-safe:animate-slide-up" style={{ animationDelay: `${index * 45}ms` }}>
            <button
              type="button"
              onClick={() => onSelect(bubble)}
              disabled={disabled || !!busyId}
              aria-busy={busy || undefined}
              className={cn(
                "inline-flex max-w-full items-center gap-2.5 rounded-full text-left font-semibold leading-snug transition",
                "motion-safe:active:scale-[0.97] disabled:cursor-default",
                size === "lg" ? "min-h-13 px-5 py-3 text-[15px]" : "min-h-11 px-4 py-2.5 text-sm",
                STYLES[bubble.kind],
                busyId && !busy && "opacity-45",
              )}
            >
              {busy ? (
                <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />
              ) : (
                <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
              )}
              <span>{bubble.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function BubblesSkeleton({ count = 5 }: { count?: number }) {
  const widths = ["w-64", "w-56", "w-44", "w-52", "w-40", "w-48", "w-36"];
  return (
    <div className="flex flex-wrap gap-2.5" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn("skeleton h-12 rounded-full", widths[i % widths.length])} />
      ))}
    </div>
  );
}
