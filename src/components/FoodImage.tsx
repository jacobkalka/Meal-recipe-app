"use client";
/* eslint-disable @next/next/no-img-element -- images are user photos stored as data URLs */

import { UtensilsCrossed } from "lucide-react";
import { useStoredImage } from "@/lib/images";
import { cn } from "@/lib/cn";

interface FoodImageProps {
  imageId?: string | null;
  imageUrl?: string | null;
  alt: string;
  className?: string;
}

/** Shows a stored user photo (by id) or a static image URL, with skeleton + fallback. */
export function FoodImage({ imageId, imageUrl, alt, className }: FoodImageProps) {
  const stored = useStoredImage(imageUrl ? null : (imageId ?? null));
  const src = imageUrl ?? stored.src;

  if (!src && stored.loading) return <div className={cn("skeleton", className)} aria-hidden />;
  if (!src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn("flex items-center justify-center bg-gradient-to-br from-olive-50 to-rust-50 text-olive", className)}
      >
        <UtensilsCrossed className="h-10 w-10 opacity-60" aria-hidden />
      </div>
    );
  }
  return <img src={src} alt={alt} className={cn("object-cover", className)} draggable={false} />;
}
