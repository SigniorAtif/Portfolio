"use client";

import { useState } from "react";
import { featured } from "@/content/projects";
import { jumpTo } from "@/lib/scrollLock";
import { BACKDROPS, WorkIntro } from "./WorkIntro";
import { useBackdrop } from "./useBackdrop";

/** The test bench for the work opening: pick a backdrop, play it again. */
export function WorkIntroLab() {
  const [backdrop, setBackdrop] = useBackdrop("day");
  // Bumped to remount the opening; anything above zero plays without waiting for a scroll.
  const [run, setRun] = useState(0);

  const pill = "h-9 rounded-full px-4 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors duration-200";

  return (
    <main>
      <WorkIntro key={run} projects={featured} backdrop={backdrop} autoplay={run > 0} />

      <section className="px-[var(--gutter)] py-[clamp(72px,12vh,128px)]">
        <p className="kicker">Test page</p>
        <p className="mt-4 max-w-[52ch] text-[clamp(20px,2.2vw,30px)] leading-[1.25] text-body">
          The rest of the landing goes here. This block is only tall so there is something to scroll into once the opening lets go.
        </p>
        <div className="h-[120vh]" />
      </section>

      <div
        role="group"
        aria-label="Backdrop"
        className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-line-strong bg-ground/80 p-1 backdrop-blur"
      >
        {BACKDROPS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={backdrop === item.id}
            onClick={() => setBackdrop(item.id)}
            className={`${pill} ${backdrop === item.id ? "bg-ink text-ground" : "text-muted hover:text-ink"}`}
          >
            {item.label}
          </button>
        ))}
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-line-strong" />
        <button
          type="button"
          onClick={() => {
            jumpTo(0);
            setRun((value) => value + 1);
          }}
          className={`${pill} text-ink hover:bg-panel`}
        >
          Replay
        </button>
      </div>
    </main>
  );
}
