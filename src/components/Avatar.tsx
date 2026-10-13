/* eslint-disable @next/next/no-img-element -- avatars are small data URLs */
import { ChefHat } from "lucide-react";
import { cn } from "@/lib/cn";

export function Avatar({ name, src, className }: { name: string; src: string | null; className?: string }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
  return (
    <span
      className={cn(
        "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-olive-50 text-lg font-bold text-olive-700 ring-2 ring-white",
        className,
      )}
      aria-hidden
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initials || <ChefHat className="h-6 w-6" />
      )}
    </span>
  );
}
