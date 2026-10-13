"use client";

import { ArrowUp } from "lucide-react";
import { useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";

interface AskBarProps {
  onAsk: (question: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Sticky at the bottom of the viewport (results screen). */
  sticky?: boolean;
  className?: string;
}

/** Chat-style input pill for people who'd rather type. Always optional. */
export function AskBar({ onAsk, placeholder = "Or ask anything about this dish…", disabled, sticky, className }: AskBarProps) {
  const [value, setValue] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const question = value.trim();
    if (!question || disabled) return;
    onAsk(question);
    setValue("");
  };

  const form = (
    <form
      onSubmit={submit}
      className={cn(
        "flex items-center gap-2 rounded-full bg-white p-1.5 pl-5 shadow-float ring-1 ring-black/5",
        !sticky && className,
      )}
    >
      <label htmlFor="ask-input" className="sr-only">
        Ask a question about this dish
      </label>
      <input
        id="ask-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        maxLength={500}
        autoComplete="off"
        enterKeyHint="send"
        className="min-h-11 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label="Send question"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-olive text-white transition hover:bg-olive-600 disabled:bg-chip disabled:text-muted motion-safe:active:scale-95"
      >
        <ArrowUp className="h-5 w-5" strokeWidth={2.4} />
      </button>
    </form>
  );

  if (!sticky) return form;
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-canvas via-canvas/95 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6",
        className,
      )}
    >
      <div className="mx-auto max-w-xl">{form}</div>
    </div>
  );
}
