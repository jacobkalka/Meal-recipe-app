"use client";

import { Camera, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Segmented } from "@/components/ui/Segmented";
import { Skeleton } from "@/components/ui/Skeleton";
import { useActions, useAppState } from "@/lib/data/store";
import { prepareAvatar } from "@/lib/images";
import type { Profile, Units } from "@/lib/types";

export const DIET_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Pescatarian",
  "No pork",
  "No beef",
  "Dairy-free",
  "Gluten-free",
  "Nut-free",
  "Shellfish-free",
  "Halal",
  "Kosher",
  "Low-carb",
];

export function ProfileScreen() {
  const { hydrated, profile } = useAppState();
  if (!hydrated) {
    return (
      <main className="mx-auto max-w-xl space-y-4 px-4 pt-6" aria-busy="true">
        <Skeleton className="h-10 w-1/2 rounded-full" />
        <Skeleton className="h-72 w-full rounded-card-lg" />
      </main>
    );
  }
  return <ProfileForm key={JSON.stringify(profile)} initial={profile} />;
}

function ProfileForm({ initial }: { initial: Profile }) {
  const router = useRouter();
  const actions = useActions();
  const [draft, setDraft] = useState<Profile>(initial);
  const [staple, setStaple] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  useEffect(() => {
    if (!status) return;
    const t = window.setTimeout(() => setStatus(null), 2400);
    return () => window.clearTimeout(t);
  }, [status]);

  const set = (patch: Partial<Profile>) => setDraft((d) => ({ ...d, ...patch }));

  const toggleDiet = (option: string) =>
    set({ diet: draft.diet.includes(option) ? draft.diet.filter((d) => d !== option) : [...draft.diet, option] });

  const pickAvatar = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      set({ avatar: await prepareAvatar(file) });
    } catch {
      setStatus("We couldn't read that image.");
    }
  };

  const addStaple = (e: FormEvent) => {
    e.preventDefault();
    const value = staple.trim().toLowerCase();
    if (value && !draft.staples.includes(value)) set({ staples: [...draft.staples, value] });
    setStaple("");
  };

  const save = () => {
    actions.updateProfile({ ...draft, name: draft.name.trim() });
    setStatus("Saved");
  };

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-40 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <h1 className="px-1 text-[28px] font-bold leading-tight tracking-tight">Profile</h1>

      <section className="mt-5 rounded-card-lg bg-white p-5 shadow-soft" aria-label="About you">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar name={draft.name} src={draft.avatar} className="h-20 w-20 text-2xl" />
            <label className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-night text-white ring-2 ring-white focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink">
              <input type="file" accept="image/*" className="sr-only" onChange={pickAvatar} aria-label="Change profile photo" />
              <Camera className="h-4 w-4" aria-hidden />
            </label>
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="name" className="text-sm font-semibold text-subtle">
              Your name
            </label>
            <input
              id="name"
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="What should we call you?"
              maxLength={40}
              autoComplete="given-name"
              className="mt-1 min-h-12 w-full rounded-full bg-canvas px-5 text-[16px] font-semibold outline-none focus:ring-2 focus:ring-olive"
            />
          </div>
        </div>
        {draft.avatar && (
          <button type="button" onClick={() => set({ avatar: null })} className="mt-3 min-h-9 text-sm font-semibold text-subtle underline underline-offset-4">
            Remove photo
          </button>
        )}
      </section>

      <section className="mt-4 rounded-card-lg bg-white p-5 shadow-soft" aria-labelledby="units-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="units-title" className="text-lg font-bold">
            Units
          </h2>
          <Segmented<Units>
            label="Preferred units"
            value={draft.units}
            options={[
              { value: "us", label: "US" },
              { value: "metric", label: "Metric" },
            ]}
            onChange={(units) => set({ units })}
          />
        </div>
      </section>

      <section className="mt-4 rounded-card-lg bg-white p-5 shadow-soft" aria-labelledby="diet-title">
        <h2 id="diet-title" className="text-lg font-bold">
          Dietary preferences
        </h2>
        <p className="mt-0.5 text-sm text-subtle">Recipes and suggestions will respect these.</p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {DIET_OPTIONS.map((option) => (
            <Chip key={option} toggle selected={draft.diet.includes(option)} onClick={() => toggleDiet(option)}>
              {option}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-card-lg bg-white p-5 shadow-soft" aria-labelledby="staples-title">
        <h2 id="staples-title" className="text-lg font-bold">
          Things I usually have
        </h2>
        <p className="mt-0.5 text-sm text-subtle">Hidden from grocery lists when you turn on &ldquo;Hide things I usually have&rdquo;.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {draft.staples.map((s) => (
            <Chip key={s} size="sm" removable onClick={() => set({ staples: draft.staples.filter((x) => x !== s) })} aria-label={`Remove ${s}`}>
              {s}
            </Chip>
          ))}
        </div>
        <form onSubmit={addStaple} className="mt-3 flex items-center gap-2 rounded-full bg-canvas p-1 pl-4">
          <label htmlFor="staple" className="sr-only">
            Add something you usually have
          </label>
          <input
            id="staple"
            value={staple}
            onChange={(e) => setStaple(e.target.value)}
            placeholder="e.g. garlic"
            maxLength={40}
            className="min-h-10 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted"
          />
          <button type="submit" aria-label="Add staple" disabled={!staple.trim()} className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm disabled:opacity-50">
            <Plus className="h-4 w-4" />
          </button>
        </form>
      </section>

      <section className="mt-4 rounded-card-lg bg-white p-5 shadow-soft" aria-labelledby="data-title">
        <h2 id="data-title" className="text-lg font-bold">
          Your data
        </h2>
        <p className="mt-0.5 text-sm text-subtle">Everything is stored on this device only.</p>
        <Button
          variant="secondary"
          className="mt-4 text-rust-600"
          icon={<Trash2 className="h-4 w-4" aria-hidden />}
          onClick={() => setConfirmClear(true)}
        >
          Clear all data
        </Button>
      </section>

      {/* Save / Cancel: only while there are unsaved changes */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.25rem)] z-30 px-4 motion-safe:animate-slide-up">
          <div className="mx-auto flex max-w-xl gap-3 rounded-full bg-white/90 p-1.5 shadow-float backdrop-blur">
            <Button variant="secondary" size="lg" full onClick={() => setDraft(initial)}>
              Cancel
            </Button>
            <Button variant="dark" size="lg" full onClick={save}>
              Save
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Clear all data?"
        message="This deletes every scan, recipe, grocery list and setting stored on this device."
        confirmLabel="Delete everything"
        onConfirm={async () => {
          setConfirmClear(false);
          await actions.clearAll();
          router.push("/");
        }}
        onCancel={() => setConfirmClear(false)}
      />

      {status && (
        <p role="status" className="fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-50 -translate-x-1/2 rounded-full bg-night px-4 py-2.5 text-sm font-semibold text-white shadow-float">
          {status}
        </p>
      )}
    </main>
  );
}
