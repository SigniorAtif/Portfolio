"use client";

import { useSyncExternalStore } from "react";

// The stage is what the veil (the loader and the page transition) covers.
// It is "closed" while the veil hides the page and "open" once the veil is
// leaving. Every intro on the site waits for the stage to open, so nothing
// plays unseen behind the veil and nothing starts before the reveal.

let open = false;
let navigated = false;

/** Only the initial home entry owns the loader-to-portrait handoff. */
export const isHomeIntro = () => !navigated && window.location.pathname === "/";

export function endHomeIntro() {
  navigated = true;
}

const listeners = new Set<() => void>();

export const stageOpen = () => open;

export function setStage(next: boolean) {
  if (open === next) return;
  open = next;
  for (const listener of [...listeners]) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Resolves once the stage is open; straight away when it already is. */
export function whenStageOpen(): Promise<void> {
  if (open) return Promise.resolve();
  return new Promise((resolve) => {
    const stop = subscribe(() => {
      if (!open) return;
      stop();
      resolve();
    });
  });
}

/** True once the veil is leaving. False on the server and while the veil covers the page. */
export function useStageOpen(): boolean {
  return useSyncExternalStore(subscribe, stageOpen, () => false);
}

// Downloads the veil should wait for. A component that fetches something the
// first screen needs takes a reporter here and feeds it its progress (0 to 1).

const loads = new Map<symbol, number>();
const loadListeners = new Set<() => void>();

const loadsChanged = () => {
  for (const listener of [...loadListeners]) listener();
};

/** Called whenever a tracked download moves, starts or the list is cleared. */
export function onLoads(listener: () => void) {
  loadListeners.add(listener);
  return () => {
    loadListeners.delete(listener);
  };
}

export function trackLoad(): (fraction: number) => void {
  const key = Symbol();
  loads.set(key, 0);
  loadsChanged();
  return (fraction) => {
    loads.set(key, Math.max(0, Math.min(1, fraction)));
    loadsChanged();
  };
}

/** Share of the tracked downloads that has arrived. 1 when nothing is tracked. */
export function loadFraction(): number {
  if (!loads.size) return 1;
  let sum = 0;
  for (const value of loads.values()) sum += value;
  return sum / loads.size;
}

export function resetLoads() {
  loads.clear();
  loadsChanged();
}

// The veil registers itself as the way to change page. Links ask it; when it
// is not there, they fall back to a plain navigation.

export type Point = { x: number; y: number };
type Navigator = (href: string, from?: Point) => boolean;

let navigator: Navigator | null = null;

export function setNavigator(next: Navigator | null) {
  navigator = next;
}

/** Ask for an animated page change. False means "not handled, navigate normally". */
export function travel(href: string, from?: Point): boolean {
  return navigator ? navigator(href, from) : false;
}
