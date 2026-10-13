import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  tone?: "white" | "chip" | "dark" | "glass";
  size?: "sm" | "md" | "lg";
  /** Small orange notification dot. */
  dot?: boolean;
}

const TONES = {
  white: "bg-white text-ink shadow-soft hover:bg-canvas",
  chip: "bg-chip text-ink hover:bg-line",
  dark: "bg-night text-white hover:bg-black",
  glass: "bg-white/85 text-ink backdrop-blur hover:bg-white",
};

const SIZES = { sm: "h-11 w-11", md: "h-12 w-12", lg: "h-14 w-14" };

/** Circular icon-only button. `label` becomes the accessible name. */
export function IconButton({ label, children, tone = "white", size = "md", dot, className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full transition motion-safe:active:scale-95",
        // Needed for the dot, unless the caller already positions the button.
        !/\b(absolute|fixed|sticky)\b/.test(className ?? "") && "relative",
        TONES[tone],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
      {dot && (
        <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-rust ring-2 ring-white" aria-hidden />
      )}
    </button>
  );
}
