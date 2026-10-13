"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { STORAGE_PREFIX } from "@/lib/config";
import { uid } from "@/lib/id";

export interface KitchenTimer {
  id: string;
  label: string;
  recipeId: string | null;
  step: number | null;
  durationMs: number;
  /** Epoch ms when it rings (while running). */
  endsAt: number | null;
  /** Remaining ms while paused. */
  pausedRemaining: number | null;
  done: boolean;
}

interface TimerApi {
  timers: KitchenTimer[];
  now: number;
  start(input: { label: string; minutes: number; recipeId?: string | null; step?: number | null }): string;
  pause(id: string): void;
  resume(id: string): void;
  addMinute(id: string): void;
  cancel(id: string): void;
}

const KEY = `${STORAGE_PREFIX}timers`;
const TimerContext = createContext<TimerApi | null>(null);

// ---------- sound ----------

let audioContext: AudioContext | null = null;

/** Must run inside a user gesture at least once so browsers allow sound later. */
function unlockAudio() {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioContext ??= new Ctor();
    if (audioContext.state === "suspended") void audioContext.resume();
  } catch {
    audioContext = null;
  }
}

function chime() {
  try {
    if (!audioContext) return;
    const t0 = audioContext.currentTime;
    for (let i = 0; i < 6; i++) {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = "sine";
      osc.frequency.value = i % 2 ? 660 : 880;
      const start = t0 + i * 0.28;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);
      osc.connect(gain).connect(audioContext.destination);
      osc.start(start);
      osc.stop(start + 0.26);
    }
  } catch {
    // sound is best-effort
  }
}

function buzz() {
  try {
    navigator.vibrate?.([350, 120, 350, 120, 600]);
  } catch {
    // vibration is best-effort
  }
}

// ---------- persistence ----------

function load(): KitchenTimer[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as KitchenTimer[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(timers: KitchenTimer[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(timers));
  } catch {
    // ignore: timers still work in memory
  }
}

export function remainingMs(timer: KitchenTimer, now: number): number {
  if (timer.done) return 0;
  if (timer.pausedRemaining != null) return timer.pausedRemaining;
  return Math.max(0, (timer.endsAt ?? now) - now);
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  return h ? `${h}:${mm}:${String(s).padStart(2, "0")}` : `${mm}:${String(s).padStart(2, "0")}`;
}

/** App-wide timers: keep running while you navigate, ring with sound + vibration. */
export function TimerProvider({ children }: { children: ReactNode }) {
  const [timers, setTimers] = useState<KitchenTimer[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const timersRef = useRef<KitchenTimer[]>([]);

  const update = useCallback((next: KitchenTimer[]) => {
    timersRef.current = next;
    setTimers(next);
    persist(next);
  }, []);

  useEffect(() => {
    // Storage only exists in the browser, so timers are restored after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    update(load());
  }, [update]);

  const running = timers.some((t) => !t.done && t.pausedRemaining == null);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      const finished = timersRef.current.filter((x) => !x.done && x.pausedRemaining == null && (x.endsAt ?? 0) <= t);
      if (finished.length) {
        update(timersRef.current.map((x) => (finished.includes(x) ? { ...x, done: true, endsAt: null } : x)));
        chime();
        buzz();
      }
    };
    tick();
    const interval = window.setInterval(tick, 500);
    return () => window.clearInterval(interval);
  }, [running, update]);

  const api = useMemo<TimerApi>(
    () => ({
      timers,
      now,
      start({ label, minutes, recipeId = null, step = null }) {
        unlockAudio();
        const id = uid();
        const durationMs = Math.round(minutes * 60_000);
        update([
          ...timersRef.current,
          { id, label, recipeId, step, durationMs, endsAt: Date.now() + durationMs, pausedRemaining: null, done: false },
        ]);
        setNow(Date.now());
        return id;
      },
      pause(id) {
        const t = Date.now();
        update(
          timersRef.current.map((x) =>
            x.id === id && x.endsAt ? { ...x, pausedRemaining: Math.max(0, x.endsAt - t), endsAt: null } : x,
          ),
        );
      },
      resume(id) {
        unlockAudio();
        update(
          timersRef.current.map((x) =>
            x.id === id && x.pausedRemaining != null
              ? { ...x, endsAt: Date.now() + x.pausedRemaining, pausedRemaining: null }
              : x,
          ),
        );
      },
      addMinute(id) {
        unlockAudio();
        update(
          timersRef.current.map((x) => {
            if (x.id !== id) return x;
            if (x.done) return { ...x, done: false, endsAt: Date.now() + 60_000, durationMs: x.durationMs + 60_000 };
            if (x.pausedRemaining != null) return { ...x, pausedRemaining: x.pausedRemaining + 60_000 };
            return { ...x, endsAt: (x.endsAt ?? Date.now()) + 60_000, durationMs: x.durationMs + 60_000 };
          }),
        );
      },
      cancel(id) {
        update(timersRef.current.filter((x) => x.id !== id));
      },
    }),
    [timers, now, update],
  );

  return <TimerContext.Provider value={api}>{children}</TimerContext.Provider>;
}

export function useTimers(): TimerApi {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimers must be used inside <TimerProvider>");
  return ctx;
}
