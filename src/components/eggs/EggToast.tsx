"use client";

import { useEffect, useRef, useState } from "react";
import { onFind, type Find } from "@/lib/eggs";

const SHOW_MS = 4200; // how long a find stays up
const LEAVE_MS = 220; // the fade out, as in .egg-toast[data-leaving]

/**
 * The quiet line that says an egg was found: "Egg 2 of 7" and its name, at
 * the bottom of the screen for a few seconds. It never takes focus or a
 * click; Esc sends it away early. The live region is always there, so screen
 * readers hear each find. Styles are `.egg-toast` in globals.css.
 */
export function EggToast() {
  const [toast, setToast] = useState<(Find & { key: number }) | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const clear = () => {
      for (const id of timers.current) window.clearTimeout(id);
      timers.current = [];
    };
    const hide = () => {
      clear();
      setLeaving(true);
      timers.current.push(window.setTimeout(() => setToast(null), LEAVE_MS));
    };
    const stop = onFind((find) => {
      clear();
      setLeaving(false);
      setToast({ ...find, key: performance.now() });
      timers.current.push(window.setTimeout(hide, SHOW_MS));
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && timers.current.length) hide();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      stop();
      clear();
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div role="status" aria-live="polite" className="egg-toasts">
      {toast && (
        <p key={toast.key} className="egg-toast" data-leaving={leaving || undefined}>
          <span aria-hidden="true" className="egg-toast-dot" />
          <span className="egg-toast-count">
            Egg {toast.count} of {toast.total}
          </span>
          <span className="sr-only">: </span>
          <span>{toast.egg.name}</span>
        </p>
      )}
    </div>
  );
}
