"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { onSummon, summon, type Summon } from "@/lib/eggs";

// Each egg's code is its own chunk, fetched the first time it is set off.
const RuryBar = dynamic(() => import("./RuryBar").then((mod) => mod.RuryBar), { ssr: false });

/** Typed sequences, as lowercased `KeyboardEvent.key` values, and the egg each one sets off. */
const SEQUENCES: { keys: string[]; egg: Summon }[] = [
  { keys: [..."rury"], egg: "rury" },
];
const LONGEST = Math.max(...SEQUENCES.map((sequence) => sequence.keys.length));

/** Keys typed here belong to the field, never to an egg. */
const EDITABLE = "input, textarea, select, [contenteditable]:not([contenteditable='false'])";

/**
 * Listens for the typed easter eggs on every page and plays whichever is
 * summoned, by keys or by anything else that calls `summon`. Keys in a text
 * field, in the site menu, or with a modifier held are ignored. Mounted once,
 * in the root layout.
 */
export function EggHost() {
  // The rury bar is mounted while `shown`, and slides away once `open` turns false.
  const [rury, setRury] = useState({ shown: false, open: false });

  useEffect(() => {
    let typed: string[] = [];
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(EDITABLE)) {
        typed = [];
        return;
      }
      if (target?.closest(".cmenu")) return;
      typed = [...typed, event.key.toLowerCase()].slice(-LONGEST);
      for (const { keys, egg } of SEQUENCES) {
        if (typed.length >= keys.length && keys.every((key, i) => typed[typed.length - keys.length + i] === key)) {
          // The last key belongs to the egg, not the page.
          event.preventDefault();
          typed = [];
          summon(egg);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    const stop = onSummon((egg) => {
      // Typing it again puts the bar away; only that or a reload does.
      if (egg === "rury") setRury((now) => (now.open ? { shown: true, open: false } : { shown: true, open: true }));
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      stop();
    };
  }, []);

  const ruryClosed = useCallback(() => setRury({ shown: false, open: false }), []);

  return (
    <>
      {rury.shown && <RuryBar open={rury.open} onClosed={ruryClosed} />}
    </>
  );
}
