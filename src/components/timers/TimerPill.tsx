"use client";

import { BellRing, Pause, Play, Plus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatClock, remainingMs, useTimers, type KitchenTimer } from "./TimerProvider";

/** One running/paused/finished timer with its controls. */
export function TimerPill({ timer, className }: { timer: KitchenTimer; className?: string }) {
  const { now, pause, resume, addMinute, cancel } = useTimers();
  const left = remainingMs(timer, now);
  const paused = timer.pausedRemaining != null;
  const progress = timer.durationMs ? 1 - left / timer.durationMs : 1;

  return (
    <div
      className={cn(
        "relative flex items-center gap-2 overflow-hidden rounded-full py-1.5 pl-4 pr-1.5 shadow-float",
        timer.done ? "bg-rust text-white" : "bg-night text-white",
        className,
      )}
      role="timer"
      aria-label={`${timer.label}: ${timer.done ? "done" : `${formatClock(left)} left${paused ? ", paused" : ""}`}`}
    >
      {!timer.done && (
        <span
          className="absolute inset-y-0 left-0 bg-olive/35 transition-[width] duration-500"
          style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          aria-hidden
        />
      )}
      <span className="relative flex min-w-0 flex-1 items-center gap-2">
        {timer.done && <BellRing className="h-4 w-4 shrink-0 motion-safe:animate-ring" aria-hidden />}
        <span className="truncate text-sm font-medium opacity-90">{timer.label}</span>
        <span className="ml-auto text-base font-bold tabular-nums">{timer.done ? "Done!" : formatClock(left)}</span>
      </span>
      <span className="relative flex shrink-0 gap-1">
        <button
          type="button"
          onClick={() => addMinute(timer.id)}
          aria-label={`Add a minute to ${timer.label}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
        >
          <Plus className="h-4 w-4" />
        </button>
        {!timer.done && (
          <button
            type="button"
            onClick={() => (paused ? resume(timer.id) : pause(timer.id))}
            aria-label={paused ? `Resume ${timer.label}` : `Pause ${timer.label}`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
        )}
        <button
          type="button"
          onClick={() => cancel(timer.id)}
          aria-label={timer.done ? `Dismiss ${timer.label}` : `Cancel ${timer.label}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
        >
          <X className="h-4 w-4" />
        </button>
      </span>
    </div>
  );
}

/** Floating stack of timers shown on every screen except cooking mode. */
export function TimerTray({ bottomOffset }: { bottomOffset: string }) {
  const { timers } = useTimers();
  if (!timers.length) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex flex-col items-center gap-2 px-4"
      style={{ bottom: bottomOffset }}
      aria-label="Kitchen timers"
    >
      {timers.slice(-3).map((t) => (
        <TimerPill key={t.id} timer={t} className="pointer-events-auto w-full max-w-sm motion-safe:animate-slide-up" />
      ))}
    </div>
  );
}
