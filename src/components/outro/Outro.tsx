"use client";

import { useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { quotes } from "@/content/quotes";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "@/lib/gsap";

/** Share of the section's scroll spent travelling sideways. The rest shrinks the line to fit. */
const TRAVEL = 0.75;
/** Px the line travels per px scrolled, so a long quote does not take a long scroll. */
const SPEED = 1.6;
/** A letter starts falling into place as it crosses this share of the viewport width... */
const LAND_FROM = 0.78;
/** ...and has landed this many viewport widths further left. */
const LAND_OVER = 0.4;
/** Where the end of the line is, as a share of the viewport width, when the travel stops. */
const STOP_AT = 0.6;
/** Least clear space, in px, above and below the line where it rests over the footer. */
const GAP = 24;

let picked = -1;
const noSubscribe = () => () => {};

/**
 * One quote per load, chosen on the client after hydration. The server (and
 * the hydration pass) gets -1, so the prerendered HTML never depends on a
 * random number.
 */
function useQuoteOfTheVisit(): number {
  return useSyncExternalStore(
    noSubscribe,
    () => {
      if (picked < 0) picked = Math.floor(Math.random() * quotes.length);
      return picked;
    },
    () => -1,
  );
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * The last words, in three movements tied to the scroll.
 *
 * 1. The quote, set huge on one line, travels in from the right. Each letter
 *    drops or rises into the line, spinning, as it crosses the screen.
 * 2. The line stops, shrinks until the whole of it fits the screen, and
 *    settles in the middle.
 * 3. The footer rises. The line drifts up ahead of it at a slower rate and
 *    comes to rest in the strip above the footer's top edge. Where the footer
 *    leaves no such strip (short or narrow screens), the line keeps rising and
 *    the footer covers it.
 *
 * The section itself is only scroll length. The line lives in a layer fixed
 * to the viewport and portalled to the body, above FooterCurtain's veil (so
 * the blur that takes the page never touches it) and below the footer.
 *
 * Reduced motion gets the quote set in the page as ordinary text.
 */
export function Outro({ id }: { id: string }) {
  const index = useQuoteOfTheVisit();
  const live = index >= 0;
  const quote = quotes[live ? index : 0];

  const sectionRef = useRef<HTMLElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const liftRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const layer = layerRef.current;
      const lift = liftRef.current;
      const line = lineRef.current;
      const footer = document.querySelector("footer");
      if (!live || !section || !layer || !lift || !line || !footer) return;

      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        const chars = SplitText.create(line, { type: "chars", aria: "none" }).chars as HTMLElement[];
        const land = gsap.parseEase("elastic.out(1.2, 1)");
        // Where each letter comes from: above or below the line, tilted either way.
        const from = chars.map(() => ({
          y: gsap.utils.random([-1.7, -1.45, 1.45, 1.7]),
          turn: gsap.utils.random([-60, -50, -40, 40, 50, 60]),
        }));

        // Everything below is measured again on every ScrollTrigger refresh.
        const size = { vw: 0, width: 0, run: 0, fit: 1, em: 0, rise: 0, lefts: [] as number[] };

        const measure = () => {
          size.vw = window.innerWidth;
          size.width = line.offsetWidth;
          size.em = parseFloat(getComputedStyle(line).fontSize);
          size.lefts = chars.map((char) => char.offsetLeft);
          size.run = size.width + (1 - STOP_AT) * size.vw;
          const gutter = parseFloat(getComputedStyle(section).paddingLeft);
          size.fit = Math.min(1, (size.vw - gutter * 2) / size.width);
          section.style.height = `calc(100svh + ${Math.round(size.run / TRAVEL / SPEED)}px)`;

          // Resting place over the footer: the middle of the strip it leaves, or off the top.
          const vh = window.innerHeight;
          const height = line.offsetHeight * size.fit;
          const strip = vh - footer.offsetHeight;
          const rest = strip >= height + GAP * 2 ? strip / 2 : -height;
          size.rise = vh / 2 - rest;
        };

        const draw = (progress: number) => {
          const { vw, width, run, fit, em, lefts } = size;
          // The sideways travel, carried on past the stop so late letters still land.
          const travelled = vw - (progress / TRAVEL) * run;
          const settle = gsap.parseEase("power2.inOut")(clamp01((progress - TRAVEL) / (1 - TRAVEL)));
          const stop = STOP_AT * vw - width;
          const x = progress < TRAVEL ? travelled : stop + ((vw - width * fit) / 2 - stop) * settle;
          const scale = 1 + (fit - 1) * settle;
          line.style.transform = `translate3d(${x.toFixed(1)}px, -50%, 0) scale(${scale.toFixed(4)})`;

          chars.forEach((char, i) => {
            const landed = clamp01((LAND_FROM * vw - (travelled + lefts[i])) / (LAND_OVER * vw));
            const left = 1 - land(landed);
            char.style.opacity = Math.min(1, landed * 4).toFixed(2);
            char.style.transform =
              landed >= 1 ? "" : `translate3d(0, ${(from[i].y * em * left).toFixed(1)}px, 0) rotate(${(from[i].turn * left).toFixed(1)}deg)`;
          });
        };

        const travel = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          onUpdate: ({ progress }) => draw(progress),
        });

        // The layer is on from the moment the section shows, through to the end of the page.
        const show = ScrollTrigger.create({
          trigger: section,
          start: "top bottom",
          end: "max",
          onEnter: () => gsap.set(layer, { autoAlpha: 1 }),
          onLeaveBack: () => gsap.set(layer, { autoAlpha: 0 }),
        });

        const rise = ScrollTrigger.create({
          trigger: footer,
          start: "top bottom",
          end: "bottom bottom",
          onUpdate: ({ progress }) => {
            lift.style.transform = `translate3d(0, ${(-size.rise * progress).toFixed(1)}px, 0)`;
          },
        });

        const redraw = () => {
          draw(travel.progress);
          lift.style.transform = `translate3d(0, ${(-size.rise * rise.progress).toFixed(1)}px, 0)`;
          gsap.set(layer, { autoAlpha: show.progress > 0 ? 1 : 0 });
        };

        ScrollTrigger.addEventListener("refreshInit", measure);
        ScrollTrigger.addEventListener("refresh", redraw);
        // The height just set moves every trigger below; fonts change the line's width.
        ScrollTrigger.refresh();
        void document.fonts.ready.then(() => ScrollTrigger.refresh());

        return () => {
          ScrollTrigger.removeEventListener("refreshInit", measure);
          ScrollTrigger.removeEventListener("refresh", redraw);
          section.style.height = "";
        };
      });
    },
    { dependencies: [live, index], revertOnUpdate: true },
  );

  return (
    <section
      ref={sectionRef}
      id={id}
      aria-label="A last word"
      className="outro relative z-10 bg-ground px-[var(--gutter)]"
    >
      <p className="outro-plain">{quote}</p>
      {live &&
        createPortal(
          <div ref={layerRef} aria-hidden="true" className="outro-layer">
            <div ref={liftRef} className="absolute inset-0">
              <p ref={lineRef} className="outro-line">
                {quote}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
