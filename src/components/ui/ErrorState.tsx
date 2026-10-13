import { RotateCcw, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  children?: ReactNode;
  className?: string;
}

/** Friendly error card. Never shows raw errors. */
export function ErrorState({
  title = "That didn't work",
  message,
  onRetry,
  retryLabel = "Try again",
  children,
  className,
}: ErrorStateProps) {
  return (
    <div role="alert" className={cn("animate-fade-in rounded-card bg-white p-6 text-center shadow-soft", className)}>
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rust-50 text-rust">
        <TriangleAlert className="h-6 w-6" aria-hidden />
      </div>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mx-auto mt-1 max-w-sm text-[15px] text-subtle">{message}</p>
      {(onRetry || children) && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {onRetry && (
            <Button variant="dark" onClick={onRetry} icon={<RotateCcw className="h-4 w-4" aria-hidden />}>
              {retryLabel}
            </Button>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
