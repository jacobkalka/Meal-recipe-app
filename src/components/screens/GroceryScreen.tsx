"use client";

import { Copy, ListChecks, Plus, Share2, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CheckCircle } from "@/components/ui/CheckCircle";
import { Chip } from "@/components/ui/Chip";
import { Skeleton } from "@/components/ui/Skeleton";
import { useOnline } from "@/hooks/useOnline";
import { cn } from "@/lib/cn";
import { useActions, useAppState } from "@/lib/data/store";
import { removeRecipeFromGrocery, tidyGroceryList } from "@/lib/flows";
import { groupBySection, itemKey, sourcesKey } from "@/lib/grocery";
import { uid } from "@/lib/id";
import type { GroceryItem } from "@/lib/types";
import { formatAmount } from "@/lib/units";

function itemLabel(item: GroceryItem): string {
  const amount = item.quantity == null ? "" : formatAmount({ quantity: item.quantity, unit: item.unit });
  return amount ? `${amount} ${item.name}` : item.name;
}

export function GroceryScreen() {
  const { hydrated, grocery } = useAppState();
  const actions = useActions();
  const online = useOnline();
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const key = sourcesKey(grocery.sources);
  const needsTidy = hydrated && online && grocery.sources.length > 0 && grocery.tidiedKey !== key && failedKey !== key;
  const tidying = needsTidy;

  useEffect(() => {
    if (!needsTidy) return;
    // On failure the local merge simply stays; remember not to retry this exact list.
    tidyGroceryList(actions).catch(() => setFailedKey(key));
  }, [needsTidy, key, actions]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  const visible = useMemo(
    () => grocery.items.filter((i) => !(grocery.hideStaples && i.staple)),
    [grocery.items, grocery.hideStaples],
  );
  const sections = useMemo(() => groupBySection(visible), [visible]);
  const hiddenCount = grocery.items.length - visible.length;
  const remaining = visible.filter((i) => !i.checked).length;

  const toggle = (id: string) =>
    actions.updateGrocery((l) => ({ ...l, items: l.items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)) }));

  const remove = (item: GroceryItem) =>
    actions.updateGrocery((l) => ({
      ...l,
      items: l.items.filter((i) => i.id !== item.id),
      removedKeys: item.custom ? l.removedKeys : [...new Set([...l.removedKeys, item.key])],
    }));

  const add = (event: FormEvent) => {
    event.preventDefault();
    const name = newItem.trim();
    if (name) {
      actions.updateGrocery((l) => ({
        ...l,
        items: [
          ...l.items,
          { id: uid(), key: `custom:${itemKey(name)}:${uid()}`, name, quantity: null, unit: "", section: "Other", checked: false, staple: false, custom: true, from: [] },
        ],
      }));
    }
    setNewItem("");
  };

  const asText = () =>
    sections
      .map((s) => `${s.section}\n${s.items.map((i) => `${i.checked ? "✓" : "•"} ${itemLabel(i)}`).join("\n")}`)
      .join("\n\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(asText());
      setToast("List copied");
    } catch {
      setToast("Couldn't copy. Try Share instead.");
    }
  };

  const share = async () => {
    const text = asText();
    try {
      if (navigator.share) {
        await navigator.share({ title: "Grocery list", text });
        return;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
    await copy();
  };

  if (!hydrated) {
    return (
      <main className="mx-auto max-w-xl space-y-4 px-4 pt-6" aria-busy="true">
        <Skeleton className="h-10 w-1/2 rounded-full" />
        <Skeleton className="h-56 w-full rounded-card-lg" />
      </main>
    );
  }

  const empty = grocery.items.length === 0;

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-36 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="flex items-start justify-between gap-3 px-1">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight">Grocery list</h1>
          {!empty && (
            <p className="mt-1 text-[15px] text-subtle">
              {remaining} to buy{grocery.sources.length ? ` · from ${grocery.sources.length} recipe${grocery.sources.length === 1 ? "" : "s"}` : ""}
            </p>
          )}
        </div>
      </header>

      {empty ? (
        <div className="mt-6 rounded-card-lg bg-white p-8 text-center shadow-soft">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-olive-50 text-olive-700">
            <ListChecks className="h-7 w-7" aria-hidden />
          </div>
          <h2 className="text-lg font-bold">Your list is empty</h2>
          <p className="mx-auto mt-1 max-w-xs text-[15px] text-subtle">
            Open any recipe and tap <span className="font-semibold text-ink">Grocery list</span>, or add items yourself.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/saved" variant="dark">
              Browse recipes
            </ButtonLink>
            <Button variant="secondary" onClick={() => setAdding(true)} icon={<Plus className="h-4 w-4" aria-hidden />}>
              Add an item
            </Button>
          </div>
        </div>
      ) : (
        <>
          {grocery.sources.length > 0 && (
            <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4" aria-label="Recipes in this list">
              {grocery.sources.map((s) => (
                <Chip
                  key={s.recipeId}
                  size="sm"
                  tone="white"
                  removable
                  onClick={() => removeRecipeFromGrocery(actions, s.recipeId)}
                  aria-label={`Remove ${s.title} from the list`}
                >
                  {s.title} · {s.servings} serv.
                </Chip>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3 rounded-full bg-white py-1.5 pl-5 pr-1.5 shadow-soft">
            <span id="staples-label" className="text-[15px] font-semibold">
              Hide things I usually have
              {grocery.hideStaples && hiddenCount > 0 && <span className="font-medium text-subtle"> ({hiddenCount} hidden)</span>}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={grocery.hideStaples}
              aria-labelledby="staples-label"
              onClick={() => actions.updateGrocery((l) => ({ ...l, hideStaples: !l.hideStaples }))}
              className={cn("relative h-11 w-[4.25rem] shrink-0 rounded-full transition", grocery.hideStaples ? "bg-olive" : "bg-chip")}
            >
              <span
                className={cn(
                  "absolute top-1 h-9 w-9 rounded-full bg-white shadow transition-all",
                  grocery.hideStaples ? "left-[calc(100%-2.5rem)]" : "left-1",
                )}
                aria-hidden
              />
            </button>
          </div>

          {tidying && (
            <p role="status" className="mt-3 flex items-center gap-2 px-2 text-sm text-subtle">
              <Sparkles className="h-4 w-4 animate-pulse-soft text-olive" aria-hidden /> Tidying up your list…
            </p>
          )}

          <div className="mt-5 space-y-5">
            {sections.map(({ section, items }) => (
              <section key={section} aria-labelledby={`sec-${section}`} className="rounded-card-lg bg-white p-5 shadow-soft">
                <h2 id={`sec-${section}`} className="text-sm font-bold uppercase tracking-[0.12em] text-rust">
                  {section}
                </h2>
                <ul className="mt-2 divide-y divide-line">
                  {items.map((item) => (
                    <SwipeRow key={item.id} onRemove={() => remove(item)}>
                      <label className="flex min-h-14 flex-1 cursor-pointer items-center gap-3 py-2">
                        <input type="checkbox" className="peer sr-only" checked={item.checked} onChange={() => toggle(item.id)} />
                        <CheckCircle checked={item.checked} />
                        <span className="min-w-0 flex-1">
                          <span className={cn("block text-[15px] leading-snug", item.checked && "text-muted line-through")}>
                            {item.quantity != null && (
                              <span className="font-bold">{formatAmount({ quantity: item.quantity, unit: item.unit })} </span>
                            )}
                            {item.name}
                          </span>
                          {item.from.length > 0 && grocery.sources.length > 1 && (
                            <span className="block truncate text-xs text-subtle">{item.from.join(", ")}</span>
                          )}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => remove(item)}
                        aria-label={`Remove ${item.name}`}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-subtle hover:bg-chip"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </SwipeRow>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      <div className="mt-5">
        {adding || !empty ? (
          <form onSubmit={add} className="flex items-center gap-2 rounded-full bg-white p-1.5 pl-5 shadow-soft">
            <label htmlFor="new-item" className="sr-only">
              Add an item
            </label>
            <input
              id="new-item"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add an item"
              maxLength={80}
              autoFocus={adding}
              className="min-h-11 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted"
            />
            <button
              type="submit"
              aria-label="Add item"
              disabled={!newItem.trim()}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-olive text-white disabled:bg-chip disabled:text-muted"
            >
              <Plus className="h-5 w-5" />
            </button>
          </form>
        ) : null}
      </div>

      {!empty && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button variant="secondary" size="lg" onClick={copy} icon={<Copy className="h-5 w-5" aria-hidden />}>
              Copy list
            </Button>
            <Button variant="dark" size="lg" onClick={share} icon={<Share2 className="h-5 w-5" aria-hidden />}>
              Share
            </Button>
          </div>
          <div className="mt-4 flex justify-center gap-2">
            <Chip
              size="sm"
              tone="white"
              onClick={() => actions.updateGrocery((l) => ({ ...l, items: l.items.filter((i) => !i.checked), removedKeys: [...new Set([...l.removedKeys, ...l.items.filter((i) => i.checked && !i.custom).map((i) => i.key)])] }))}
            >
              Clear checked
            </Chip>
            <Chip
              size="sm"
              tone="white"
              onClick={() => {
                if (window.confirm("Clear the whole grocery list?")) {
                  actions.updateGrocery((l) => ({ ...l, sources: [], items: [], removedKeys: [], tidiedKey: null }));
                }
              }}
            >
              Clear list
            </Chip>
          </div>
        </>
      )}

      {toast && (
        <p role="status" className="fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-50 -translate-x-1/2 rounded-full bg-night px-4 py-2.5 text-sm font-semibold text-white shadow-float motion-safe:animate-slide-up">
          {toast}
        </p>
      )}
    </main>
  );
}

/** List row that can be swiped left to remove (the × button does the same). */
function SwipeRow({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number; locked: boolean | null } | null>(null);

  return (
    <li className="relative overflow-hidden">
      <span
        className="absolute inset-y-0 right-0 flex items-center rounded-l-full bg-rust px-5 text-sm font-semibold text-white"
        style={{ opacity: Math.min(1, -dx / 90) }}
        aria-hidden
      >
        Remove
      </span>
      <div
        className="relative flex items-center gap-1 bg-white transition-transform duration-150"
        style={{ transform: `translateX(${dx}px)` }}
        onTouchStart={(e) => (start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, locked: null })}
        onTouchMove={(e) => {
          const s = start.current;
          if (!s) return;
          const mx = e.touches[0].clientX - s.x;
          const my = e.touches[0].clientY - s.y;
          if (s.locked === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) s.locked = Math.abs(mx) > Math.abs(my);
          if (s.locked) setDx(Math.min(0, mx));
        }}
        onTouchEnd={() => {
          const remove = dx < -90;
          start.current = null;
          setDx(0);
          if (remove) onRemove();
        }}
      >
        {children}
      </div>
    </li>
  );
}
