import { useCallback, useSyncExternalStore } from "react";
import { BACKDROPS, type Backdrop } from "./WorkIntro";

const KEY = "work-backdrop";
const CHANGED = "work-backdrop-change";

function read(): Backdrop | null {
  try {
    const saved = window.localStorage.getItem(KEY);
    return BACKDROPS.some((item) => item.id === saved) ? (saved as Backdrop) : null;
  } catch {
    return null;
  }
}

function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(CHANGED, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(CHANGED, notify);
  };
}

/** The backdrop the visitor picked last, kept in the browser; `fallback` until they pick one. */
export function useBackdrop(fallback: Backdrop): [Backdrop, (next: Backdrop) => void] {
  const backdrop = useSyncExternalStore(
    subscribe,
    () => read() ?? fallback,
    () => fallback,
  );

  const pick = useCallback((next: Backdrop) => {
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // Storage blocked: the choice simply does not outlive the page.
    }
    window.dispatchEvent(new Event(CHANGED));
  }, []);

  return [backdrop, pick];
}
