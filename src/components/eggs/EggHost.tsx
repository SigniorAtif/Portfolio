"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { onSummon, summon, type Summon } from "@/lib/eggs";

// Each egg's code is its own chunk, fetched the first time it is set off.
const RuryBar = dynamic(() => import("./RuryBar").then((mod) => mod.RuryBar), { ssr: false });
const ToonParade = dynamic(() => import("./ToonParade").then((mod) => mod.ToonParade), { ssr: false });

/** Typed sequences, as lowercased `KeyboardEvent.key` values, and the egg each one sets off. */
const SEQUENCES: { keys: string[]; egg: Summon }[] = [
  { keys: [..."rury"], egg: "rury" },
  // The Konami code: up up down down left right left right B A.
  { keys: ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"], egg: "parade" },
];
const LONGEST = Math.max(...SEQUENCES.map((sequence) => sequence.keys.length));

/** Keys typed here belong to the field, never to an egg. */
const EDITABLE = "input, textarea, select, [contenteditable]:not([contenteditable='false'])";

/**
 * Listens for the typed easter eggs on every page and plays whichever is
 * summoned, by keys or by anything else that calls `summon`. Keys in a text
 * field, in the site menu, or with a modifier held are ignored. Keys typed
 * while a timed sequence holds the page still still count: the Konami code's
 * own ArrowDown can start the work opening, which holds the page. Mounted
 * once, in the root layout.
 */
export function EggHost() {
  // The rury bar is mounted while `shown`, and slides away once `open` turns false.
  const [rury, setRury] = useState({ shown: false, open: false });
  // Each summon of the parade is a new one, so a second summon starts it over. 0 while none is on.
  const [parade, setParade] = useState(0);

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
      if (egg === "parade") setParade((count) => count + 1);
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      stop();
    };
  }, []);

  const ruryClosed = useCallback(() => setRury({ shown: false, open: false }), []);
  const paradeDone = useCallback(() => setParade(0), []);

  return (
    <>
      {rury.shown && <RuryBar open={rury.open} onClosed={ruryClosed} />}
      {parade > 0 && <ToonParade key={parade} onDone={paradeDone} />}
    </>
  );
}
