"use client";

import { useRef } from "react";
import { Decode } from "@/components/motion/Text";
import { SINCE, type Chapter } from "@/content/about";
import { ScrollTrigger, useGSAP } from "@/lib/gsap";
import { reducedMotion } from "@/lib/motion";

/** Share of each step of the scroll the counter holds still on a chapter before it rolls on. */
const HOLD = 0.4;

const ease = (t: number) => t * t * (3 - 2 * t);

/**
 * The years, as one held screen: a huge counter in dots rolls from the first
 * year to this one as the page scrolls, stopping on each chapter while its
 * words are up. A rail of ticks, one per year, fills behind it: lime for the
 * years done, blue for the one it is on.
 *
 * Under reduced motion nothing is held: the chapters are a plain list.
 */
export function AboutYears({ chapters }: { chapters: Chapter[] }) {
  const ref = useRef<HTMLElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const section = ref.current;
      const number = numberRef.current;
      if (!section || !number || reducedMotion()) return;

      const now = new Date().getFullYear();
      const years = chapters.map((chapter) => chapter.year ?? now);
      const panels = Array.from(section.querySelectorAll<HTMLElement>("[data-chapter]"));
      const rail = section.querySelector<HTMLElement>("[data-rail]");
      if (!rail) return;

      // One tick per year, drawn here because the last year is only known in the browser.
      const ticks = Array.from({ length: now - SINCE + 1 }, (_, i) => {
        const tick = document.createElement("span");
        tick.className = "about-tick";
        if (years.includes(SINCE + i)) tick.dataset.mark = String(SINCE + i).slice(2);
        rail.append(tick);
        return tick;
      });

      let shown = -1;
      let active = -1;
      const show = (progress: number) => {
        const at = progress * (years.length - 1);
        const i = Math.min(Math.floor(at), years.length - 2);
        const roll = ease(Math.min(Math.max((at - i - HOLD) / (1 - HOLD), 0), 1));
        const year = Math.round(years[i] + (years[i + 1] - years[i]) * roll);
        const chapter = year >= years[i + 1] ? i + 1 : i;
        if (year !== shown) {
          shown = year;
          number.textContent = String(year);
          ticks.forEach((tick, n) => (tick.dataset.state = SINCE + n < year ? "past" : SINCE + n === year ? "on" : ""));
        }
        if (chapter !== active) {
          active = chapter;
          panels.forEach((panel, n) => (panel.dataset.state = n < chapter ? "past" : n === chapter ? "on" : "next"));
        }
        number.style.transform = `translate3d(${(3 - progress * 6).toFixed(2)}%, 0, 0)`;
      };

      section.dataset.held = "";
      show(0);
      const trigger = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => show(self.progress),
      });

      return () => {
        trigger.kill();
        ticks.forEach((tick) => tick.remove());
        delete section.dataset.held;
        number.textContent = String(SINCE);
        number.style.transform = "";
        panels.forEach((panel) => delete panel.dataset.state);
      };
    },
    { scope: ref, dependencies: [chapters] },
  );

  return (
    <section ref={ref} aria-labelledby="years-title" className="about-years" style={{ "--chapters": chapters.length } as React.CSSProperties}>
      <div className="about-years-stick px-[var(--gutter)]">
        <div className="flex items-baseline justify-between gap-6">
          <Decode as="p" className="kicker">
            02 / Years
          </Decode>
          <h2 id="years-title" className="kicker !text-ink">
            Since {SINCE}
          </h2>
        </div>

        <span ref={numberRef} aria-hidden="true" className="about-year dot-ink">
          {SINCE}
        </span>

        <div className="grid items-end gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <ol className="about-chapters">
            {chapters.map((chapter, i) => (
              <li key={i} data-chapter className="about-chapter flex flex-col gap-3">
                <p className="kicker tabular-nums">
                  {String(i + 1).padStart(2, "0")} <span className="px-1.5">/</span> {chapter.year ?? "Now"}
                  {chapter.where && <span className="pl-3">{chapter.where}</span>}
                </p>
                <p className="text-[clamp(28px,3.4vw,52px)] font-medium leading-[1.04] tracking-[-0.03em]">{chapter.title}</p>
                {chapter.text && <p className="max-w-[30rem] text-[18px] leading-[1.45] text-body">{chapter.text}</p>}
              </li>
            ))}
          </ol>
          <div data-rail aria-hidden="true" className="about-rail" />
        </div>
      </div>
    </section>
  );
}
