import { X } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Selected chips are orange with white text. */
  selected?: boolean;
  tone?: "gray" | "white";
  size?: "sm" | "md";
  icon?: ReactNode;
  /** Shows a small "×" and announces the chip as a remove action. */
  removable?: boolean;
  /** Set for on/off filter chips so screen readers hear the state. */
  toggle?: boolean;
}

export function Chip({
  selected,
  tone = "gray",
  size = "md",
  icon,
  removable,
  toggle,
  className,
  children,
  ...rest
}: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={toggle ? !!selected : undefined}
      className={cn(
        "inline-flex shrink-0 select-none items-center gap-1.5 rounded-full font-medium transition",
        "motion-safe:active:scale-95",
        size === "md" ? "min-h-11 px-4 text-[15px]" : "min-h-9 px-3 text-sm",
        selected
          ? "bg-rust text-white hover:bg-rust-600"
          : tone === "white"
            ? "border border-line bg-white text-ink hover:bg-canvas"
            : "bg-chip text-ink hover:bg-line",
        className,
      )}
      {...rest}
    >
      {icon}
      <span>{children}</span>
      {removable && <X className="h-3.5 w-3.5 opacity-70" aria-hidden />}
    </button>
  );
}
