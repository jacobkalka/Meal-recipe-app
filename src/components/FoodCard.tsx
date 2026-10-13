"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { FoodImage } from "./FoodImage";
import { TimeBadge } from "./ui/Badges";

interface FoodCardProps {
  href: string;
  title: string;
  imageId?: string | null;
  imageUrl?: string | null;
  minutes?: number;
  likes?: number | null;
  saved?: boolean;
  /** Renders the heart badge as a save toggle. */
  onToggleSave?: () => void;
  subtitle?: string;
  className?: string;
  priority?: boolean;
}

/** Full-bleed food photo card with heart pill, orange time badge and title overlay. */
export function FoodCard({
  href,
  title,
  imageId,
  imageUrl,
  minutes,
  likes,
  saved,
  onToggleSave,
  subtitle,
  className,
}: FoodCardProps) {
  const heart = (
    <>
      <Heart className={cn("h-4 w-4", saved ? "fill-rust text-rust" : "text-olive")} aria-hidden />
      <span>{saved ? "Saved" : likes != null ? likes : "Save"}</span>
    </>
  );

  return (
    <article
      className={cn(
        "group relative aspect-[4/5] overflow-hidden rounded-card-lg bg-chip shadow-soft sm:aspect-[4/5]",
        className,
      )}
    >
      <FoodImage
        imageId={imageId}
        imageUrl={imageUrl}
        alt={title}
        className="absolute inset-0 h-full w-full transition duration-500 motion-safe:group-hover:scale-[1.03]"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
      <Link href={href} className="absolute inset-0 z-[1] rounded-card-lg" aria-label={title} />
      <div className="absolute left-4 top-4 z-[2]">
        {onToggleSave ? (
          <button
            type="button"
            onClick={onToggleSave}
            aria-pressed={!!saved}
            aria-label={saved ? `Remove ${title} from saved` : `Save ${title}`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-3.5 text-sm font-semibold text-ink shadow-sm transition motion-safe:active:scale-95"
          >
            {heart}
          </button>
        ) : likes != null || saved ? (
          <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-sm font-semibold text-ink shadow-sm">
            {heart}
          </span>
        ) : null}
      </div>
      {minutes ? <TimeBadge minutes={minutes} className="absolute right-4 top-4 z-[2]" /> : null}
      <div className="pointer-events-none absolute inset-x-5 bottom-5 z-[2]">
        {subtitle && <p className="mb-1 text-sm font-medium text-white/85">{subtitle}</p>}
        <h3 className="text-[22px] font-bold leading-tight text-white [text-wrap:balance]">{title}</h3>
      </div>
    </article>
  );
}
