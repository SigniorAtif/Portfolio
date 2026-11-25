"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { found, summon, tally } from "@/lib/eggs";
import { travel, whenStageOpen } from "@/lib/stage";

/** "ATIF" in dots, for the banner. */
const BANNER = [
  " ●●●   ●●●●●  ●●●●●  ●●●●●",
  "●   ●    ●      ●    ●    ",
  "●●●●●    ●      ●    ●●●● ",
  "●   ●    ●      ●    ●    ",
  "●   ●    ●    ●●●●●  ●    ",
].join("\n");

const LIME = "color:#c8f169";
const MONO = "font-family:ui-monospace,'JetBrains Mono',monospace;line-height:1.35";
const DIM = "color:#9aa3af";

// Once per full load: a page change keeps the module, so the banner is not printed again.
let greeted = false;

/**
 * An easter egg for whoever opens DevTools. Once per full load, after the
 * page has opened, the console shows a banner and an invitation, and a few
 * bare words (help, neofetch, hire, eggs, parade, terminal) come alive as
 * getters on `window`: typing one runs it through the terminal's commands and
 * prints the answer here. `clear` is left to the console. The commands are
 * fetched only once the page is open, so they never weigh on the first load.
 * The first word run counts as finding it. Renders nothing.
 */
export function Console() {
  const router = useRouter();

  useEffect(() => {
    if (greeted) return;
    void whenStageOpen()
      .then(() => import("@/content/terminal"))
      .then(({ run, CONSOLE_WORDS }) => {
        // Claimed here, not above: in development the effect runs twice, and either run may win.
        if (greeted) return;
        greeted = true;
        console.log(`%c${BANNER}`, `${LIME};${MONO};font-size:11px`);
        console.log("%cYou opened the hood. Type %chelp%c.", `${MONO};${DIM}`, `${MONO};${LIME}`, `${MONO};${DIM}`);

        for (const word of CONSOLE_WORDS) {
          if (word in window) continue;
          Object.defineProperty(window, word, {
            configurable: true,
            get() {
              found("console");
              const { count, total } = tally();
              const result = run(word, { found: count, total, now: new Date(), host: "console" });
              if (result.lines.length) console.log(`%c${result.lines.join("\n")}`, MONO);
              const action = result.action;
              if (action?.kind === "open") window.open(action.href, "_blank", "noopener,noreferrer");
              if (action?.kind === "go" && !travel(action.href)) router.push(action.href);
              if (action?.kind === "summon") summon(action.egg);
              // Nothing to show after the answer, rather than "undefined".
              return "·";
            },
          });
        }
      });
  }, [router]);

  return null;
}
