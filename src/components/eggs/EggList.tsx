"use client";

import { useState } from "react";
import { SwapLabel } from "@/components/ui/SwapLabel";
import { eggs } from "@/content/eggs";
import { useEggs } from "@/lib/eggs";

/**
 * The /eggs page body: how many of the tracked eggs this browser has found,
 * then every egg as a ruled row. Found ones show their name; the rest stay
 * "???" and, with hints on, say where to look. Untracked eggs can't be seen
 * being found, so they are listed without counting.
 */
export function EggList() {
  const { found, count, total, complete } = useEggs();
  const [hints, setHints] = useState(false);

  return (
    // A screen tall at least, so the footer's curtain only rises once the list is read.
    <section aria-labelledby="eggs-title" className="min-h-svh px-[var(--gutter)] pb-[clamp(88px,14vh,180px)] pt-[clamp(136px,24vh,260px)]">
      <div className="grid items-end gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="flex flex-col gap-4">
          <p className="kicker">Eggs / Found</p>
          <h1 id="eggs-title" className="text-[clamp(56px,11vw,176px)] font-medium leading-[0.92] tracking-[-0.045em] tabular-nums">
            {count} of {total}
          </h1>
        </div>
        <div className="flex flex-col items-start gap-6 pb-3">
          <p className="text-[19px] leading-[1.5] text-body">
            {complete
              ? "Every one of them. The footer noticed."
              : "Hidden around the site. What you find stays found in this browser."}
          </p>
          <button
            type="button"
            aria-pressed={hints}
            onClick={() => setHints((on) => !on)}
            className="hit inline-flex h-11 items-center rounded-full border border-line-strong px-5 text-[15px] transition-colors duration-300 ease-[var(--ease-hover)] hover:border-ink"
          >
            <SwapLabel>{hints ? "Hide hints" : "Show hints"}</SwapLabel>
          </button>
        </div>
      </div>

      <ol className="mt-[clamp(40px,6vw,88px)] border-t border-line-strong">
        {eggs.map((egg, i) => {
          const got = egg.tracked && found.has(egg.id);
          return (
            <li
              key={egg.id}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-2 border-b border-line-strong py-5 sm:grid-cols-[4rem_minmax(0,1fr)_auto]"
            >
              <span className="kicker">{String(i + 1).padStart(2, "0")}</span>
              <span
                className={`flex items-center gap-3 text-[clamp(22px,2.4vw,32px)] font-medium leading-tight tracking-[-0.02em] ${got ? "text-ink" : "text-muted"}`}
              >
                {got && <span aria-hidden="true" className="egg-toast-dot shrink-0" />}
                {got ? egg.name : "???"}
                <span className="sr-only">{got ? ", found" : ", not found yet"}</span>
              </span>
              <span className="kicker">{egg.tracked ? egg.where : "Untracked"}</span>
              {hints && !got && <p className="col-start-2 col-end-4 text-[17px] leading-[1.5] text-body">{egg.hint}</p>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
