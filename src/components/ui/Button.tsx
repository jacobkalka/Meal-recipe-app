import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "dark" | "secondary" | "white" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-olive text-white hover:bg-olive-600",
  dark: "bg-night text-white hover:bg-black",
  secondary: "bg-chip text-ink hover:bg-line",
  white: "bg-white text-ink shadow-soft hover:bg-canvas",
  ghost: "text-ink hover:bg-chip",
  danger: "bg-rust text-white hover:bg-rust-600",
};

const SIZES: Record<Size, string> = {
  sm: "min-h-11 px-4 text-sm",
  md: "min-h-12 px-5 text-[15px]",
  lg: "min-h-14 px-7 text-base",
};

export function buttonClass(variant: Variant = "dark", size: Size = "md", full = false) {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold transition",
    "motion-safe:active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    full && "w-full",
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  icon?: ReactNode;
  loading?: boolean;
}

export function Button({ variant, size, full, icon, loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(buttonClass(variant, size, full), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  icon?: ReactNode;
}

export function ButtonLink({ variant, size, full, icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={cn(buttonClass(variant, size, full), className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
