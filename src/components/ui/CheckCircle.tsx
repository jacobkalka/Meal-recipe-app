import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

/** Visual round checkbox; pair with a real <input type="checkbox" className="sr-only"> in a <label>. */
export function CheckCircle({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition",
        "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink",
        checked ? "border-olive bg-olive text-white" : "border-[#cfcfca] bg-white",
        className,
      )}
    >
      {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </span>
  );
}
