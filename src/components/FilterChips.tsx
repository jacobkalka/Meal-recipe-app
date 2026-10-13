"use client";

import { cn } from "@/lib/cn";
import { Chip } from "./ui/Chip";

interface FilterChipsProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

/** Horizontally scrollable row of gray filter pills. */
export function FilterChips<T extends string>({ options, value, onChange, label, className }: FilterChipsProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn("no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5 py-0.5", className)}>
      {options.map((o) => (
        <Chip key={o.value} toggle selected={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </Chip>
      ))}
    </div>
  );
}
