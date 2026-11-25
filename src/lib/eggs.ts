"use client";

import { useSyncExternalStore } from "react";
import { eggs, tracked, type Egg, type EggId } from "@/content/eggs";

// What this visitor has found, kept in their own browser. Nothing leaves it.
// A blocked or full storage only means finds don't outlive the page.

const KEY = "eggs-found";
const EMPTY: ReadonlySet<EggId> = new Set();
const ids = new Set<string>(eggs.map((egg) => egg.id));

let seen: ReadonlySet<EggId> | null = null;
const listeners = new Set<() => void>();
const finders = new Set<(find: Find) => void>();

/** One fresh find, for the toast: the egg, and how many tracked eggs are found now out of how many. */
export type Find = { egg: Egg; count: number; total: number };

function read(): ReadonlySet<EggId> {
  if (seen) return seen;
  let stored: unknown = [];
  try {
    stored = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
  } catch {
    // Storage blocked or garbled: start empty.
  }
  seen = new Set(Array.isArray(stored) ? stored.filter((id): id is EggId => ids.has(id)) : []);
  return seen;
}

const notify = () => {
  for (const listener of [...listeners]) listener();
};

/** Counts the tracked eggs in a set of finds. */
export const countFound = (set: ReadonlySet<EggId>) => tracked.filter((egg) => set.has(egg.id)).length;

/** How many have been found and out of how many, right now. For code outside React, such as the console. */
export const tally = () => ({ count: countFound(read()), total: tracked.length });

/** Records a find. Only the first one ever toasts; after that it does nothing. */
export function found(id: EggId) {
  if (typeof window === "undefined") return;
  const now = read();
  if (now.has(id)) return;
  const next = new Set(now).add(id);
  seen = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...next]));
  } catch {
    // Kept for this page only.
  }
  notify();
  const egg = eggs.find((item) => item.id === id);
  if (!egg) return;
  const find = { egg, count: countFound(next), total: tracked.length };
  for (const finder of [...finders]) finder(find);
}

/** Calls back on every fresh find. Returns the unsubscribe. */
export function onFind(finder: (find: Find) => void) {
  finders.add(finder);
  return () => {
    finders.delete(finder);
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab found one.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    seen = null;
    notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// Eggs that can be set off from anywhere: typed keys today, later the terminal,
// the console and the context menu. EggHost listens and plays them.

export type Summon = "rury" | "parade" | "terminal" | "qr";
const SUMMON = "egg:summon";

export function summon(name: Summon) {
  window.dispatchEvent(new CustomEvent<Summon>(SUMMON, { detail: name }));
}

/** Calls back whenever an egg is summoned. Returns the unsubscribe. */
export function onSummon(listener: (name: Summon) => void) {
  const handle = (event: Event) => listener((event as CustomEvent<Summon>).detail);
  window.addEventListener(SUMMON, handle);
  return () => window.removeEventListener(SUMMON, handle);
}

/** The finds so far. Empty on the server and until hydration. */
export function useEggs() {
  const set = useSyncExternalStore(subscribe, read, () => EMPTY);
  const count = countFound(set);
  return { found: set, count, total: tracked.length, complete: count === tracked.length };
}
