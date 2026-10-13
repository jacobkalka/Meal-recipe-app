"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

interface StepNavigatorProps {
  count: number;
  current: number;
  onSelect: (index: number) => void;
}

/** Row of circular numbered step buttons. Active = green, done = tinted, rest = gray. */
export function StepNavigator({ count, current, onSelect }: StepNavigatorProps) {
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const active = listRef.current?.children[current] as HTMLElement | undefined;
    active?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [current]);

  return (
    <nav aria-label="Steps">
      <ol ref={listRef} className="no-scrollbar flex gap-3 overflow-x-auto px-1 py-2">
        {Array.from({ length: count }, (_, i) => {
          const active = i === current;
          const done = i < current;
          return (
            <li key={i} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-current={active ? "step" : undefined}
                aria-label={`Step ${i + 1}${done ? " (done)" : ""}`}
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold transition-all motion-safe:active:scale-95",
                  active
                    ? "scale-105 bg-olive text-white shadow-soft"
                    : done
                      ? "bg-olive-50 text-olive-700"
                      : "bg-chip text-ink hover:bg-line",
                )}
              >
                {i + 1}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
