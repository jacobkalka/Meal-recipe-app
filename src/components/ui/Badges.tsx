import { Heart } from "lucide-react";
import { cn } from "@/lib/cn";

/** Orange pill with total cook time, e.g. "25min". */
export function TimeBadge({ minutes, className }: { minutes: number; className?: string }) {
  if (!minutes) return null;
  const label = minutes >= 60 ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}` : `${minutes}min`;
  return (
    <span
      className={cn("inline-flex items-center rounded-full bg-rust px-3.5 py-1.5 text-sm font-semibold text-white", className)}
      aria-label={`${minutes} minutes`}
    >
      {label}
    </span>
  );
}

/** White pill with heart: like count, or "Saved". */
export function HeartBadge({ count, saved, className }: { count?: number | null; saved?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-ink shadow-sm",
        className,
      )}
    >
      <Heart className={cn("h-4 w-4", saved ? "fill-rust text-rust" : "text-olive")} aria-hidden />
      {saved ? "Saved" : count != null ? count : null}
    </span>
  );
}
