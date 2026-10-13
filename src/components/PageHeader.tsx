"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconButton } from "./ui/IconButton";

interface PageHeaderProps {
  title?: string;
  /** Where "back" goes when there is no history (e.g. opened from a link). */
  fallbackHref?: string;
  actions?: ReactNode;
  overlay?: boolean;
  className?: string;
}

/** Back button + optional title + trailing actions. */
export function PageHeader({ title, fallbackHref = "/", actions, overlay, className }: PageHeaderProps) {
  const router = useRouter();
  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push(fallbackHref);
  };
  return (
    <header className={cn("flex items-center justify-between gap-3", overlay && "absolute inset-x-4 top-4 z-10", className)}>
      <IconButton label="Go back" tone={overlay ? "glass" : "white"} onClick={goBack}>
        <ChevronLeft className="h-6 w-6" />
      </IconButton>
      {title && <h1 className="min-w-0 flex-1 truncate text-center text-lg font-bold">{title}</h1>}
      <div className="flex min-w-12 items-center justify-end gap-2">{actions}</div>
    </header>
  );
}
