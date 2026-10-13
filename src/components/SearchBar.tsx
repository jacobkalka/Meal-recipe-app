"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useId } from "react";
import { IconButton } from "./ui/IconButton";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onOpenFilters?: () => void;
  filterCount?: number;
  placeholder?: string;
}

/** Wide gray pill with a white circular search button, plus a separate filter button. */
export function SearchBar({ value, onChange, onOpenFilters, filterCount = 0, placeholder = "Search recipes" }: SearchBarProps) {
  const id = useId();
  return (
    <div className="flex items-center gap-2.5">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          (document.activeElement as HTMLElement | null)?.blur();
        }}
        className="flex min-w-0 flex-1 items-center rounded-full bg-chip p-1 pl-5"
      >
        <label htmlFor={id} className="sr-only">
          {placeholder}
        </label>
        <input
          id={id}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          enterKeyHint="search"
          autoComplete="off"
          className="min-h-11 min-w-0 flex-1 bg-transparent text-[16px] font-medium text-ink outline-none placeholder:text-subtle [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="mr-1 flex h-9 w-9 items-center justify-center rounded-full text-subtle hover:bg-line"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          aria-label="Search"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-sm"
        >
          <Search className="h-5 w-5" />
        </button>
      </form>
      {onOpenFilters && (
        <IconButton label={filterCount ? `Filters (${filterCount} active)` : "Filters"} tone="chip" onClick={onOpenFilters} dot={filterCount > 0}>
          <SlidersHorizontal className="h-5 w-5" />
        </IconButton>
      )}
    </div>
  );
}
