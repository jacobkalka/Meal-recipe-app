"use client";

import type { Recipe } from "@/lib/types";
import { NO_FILTERS, type RecipeFilters } from "@/lib/selectors";
import { BottomSheet } from "./ui/BottomSheet";
import { Button } from "./ui/Button";
import { Chip } from "./ui/Chip";

const TIMES = [
  { value: null, label: "Any time" },
  { value: 15, label: "≤ 15 min" },
  { value: 30, label: "≤ 30 min" },
  { value: 60, label: "≤ 1 hour" },
];

const DIFFICULTIES: { value: Recipe["difficulty"] | null; label: string }[] = [
  { value: null, label: "Any" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  value: RecipeFilters;
  onChange: (value: RecipeFilters) => void;
}

export function FilterSheet({ open, onClose, value, onChange }: FilterSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Filters"
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" full onClick={() => onChange(NO_FILTERS)}>
            Reset
          </Button>
          <Button variant="dark" full onClick={onClose}>
            Show recipes
          </Button>
        </div>
      }
    >
      <fieldset className="mt-2">
        <legend className="mb-3 text-sm font-semibold text-subtle">Total time</legend>
        <div className="flex flex-wrap gap-2.5">
          {TIMES.map((t) => (
            <Chip key={t.label} toggle selected={value.maxMinutes === t.value} onClick={() => onChange({ ...value, maxMinutes: t.value })}>
              {t.label}
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-6">
        <legend className="mb-3 text-sm font-semibold text-subtle">Difficulty</legend>
        <div className="flex flex-wrap gap-2.5">
          {DIFFICULTIES.map((d) => (
            <Chip key={d.label} toggle selected={value.difficulty === d.value} onClick={() => onChange({ ...value, difficulty: d.value })}>
              {d.label}
            </Chip>
          ))}
        </div>
      </fieldset>
    </BottomSheet>
  );
}
