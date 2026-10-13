import { Minus, Plus } from "lucide-react";
import { IconButton } from "./IconButton";

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  /** e.g. (n) => `${n} servings` */
  format?: (value: number) => string;
}

export function Stepper({ value, onChange, min = 1, max = 24, label, format = String }: StepperProps) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <IconButton label={`Decrease ${label}`} tone="chip" size="sm" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className="disabled:opacity-40">
        <Minus className="h-4 w-4" />
      </IconButton>
      <output className="min-w-[6.5rem] text-center text-[15px] font-semibold tabular-nums" aria-live="polite">
        {format(value)}
      </output>
      <IconButton label={`Increase ${label}`} tone="chip" size="sm" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className="disabled:opacity-40">
        <Plus className="h-4 w-4" />
      </IconButton>
    </div>
  );
}
