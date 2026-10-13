"use client";

import { Sparkles } from "lucide-react";
import type { QA } from "@/lib/types";
import { SuggestionBubbles, type Bubble } from "./SuggestionBubbles";

function AnswerText({ text }: { text: string }) {
  const blocks: { type: "p" | "ul"; lines: string[] }[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const isItem = /^[-•*]\s+/.test(line);
    const content = line.replace(/^[-•*]\s+/, "").replace(/\*\*(.+?)\*\*/g, "$1");
    const last = blocks[blocks.length - 1];
    if (isItem && last?.type === "ul") last.lines.push(content);
    else blocks.push({ type: isItem ? "ul" : "p", lines: [content] });
  }
  return (
    <div className="space-y-2 text-[15px] leading-relaxed text-ink">
      {blocks.map((b, i) =>
        b.type === "ul" ? (
          <ul key={i} className="list-disc space-y-1 pl-5 marker:text-olive">
            {b.lines.map((l, j) => (
              <li key={j}>{l}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{b.lines[0]}</p>
        ),
      )}
    </div>
  );
}

interface AnswerThreadProps {
  items: QA[];
  pendingQuestion?: string | null;
  onFollowUp: (bubble: Bubble) => void;
  busyId?: string | null;
}

/** Q&A history. Only the latest answer shows follow-up bubbles. */
export function AnswerThread({ items, pendingQuestion, onFollowUp, busyId }: AnswerThreadProps) {
  if (!items.length && !pendingQuestion) return null;
  return (
    <section aria-label="Answers" className="space-y-4" aria-live="polite">
      {items.map((qa, index) => {
        const latest = index === items.length - 1 && !pendingQuestion;
        return (
          <div key={qa.id} className="space-y-3 motion-safe:animate-slide-up">
            <p className="ml-auto w-fit max-w-[85%] rounded-3xl rounded-br-lg bg-night px-4 py-2.5 text-[15px] font-medium text-white">
              {qa.question}
            </p>
            <div className="rounded-card bg-white p-5 shadow-soft">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-olive-700">
                <Sparkles className="h-4 w-4" aria-hidden /> Kitchen helper
              </div>
              <AnswerText text={qa.answer} />
            </div>
            {latest && qa.followUps.length > 0 && (
              <SuggestionBubbles
                size="md"
                label="Follow-up suggestions"
                bubbles={qa.followUps.map((f, i) => ({ id: `${qa.id}-${i}`, label: f.label, kind: f.type }))}
                onSelect={onFollowUp}
                busyId={busyId}
              />
            )}
          </div>
        );
      })}
      {pendingQuestion && (
        <div className="space-y-3">
          <p className="ml-auto w-fit max-w-[85%] rounded-3xl rounded-br-lg bg-night px-4 py-2.5 text-[15px] font-medium text-white">
            {pendingQuestion}
          </p>
          <div className="space-y-2 rounded-card bg-white p-5 shadow-soft" aria-label="Thinking…">
            <div className="skeleton h-4 w-11/12 rounded-full" />
            <div className="skeleton h-4 w-4/5 rounded-full" />
            <div className="skeleton h-4 w-2/3 rounded-full" />
          </div>
        </div>
      )}
    </section>
  );
}
