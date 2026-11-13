"use client";

import { useRef } from "react";
import Image from "next/image";
import { Decode } from "@/components/motion/Text";
import { SkeletonReveal, useLoadedMedia } from "@/components/ui/Skeleton";
import { gsap, inView, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { DUR, EASE } from "@/lib/motion";
import { EXIT_AT, ToonStage } from "./ToonStage";

// Draft copy, to polish later.
const STATEMENT =
  "I've been writing code since 2015, long before anyone asked me to. Mostly small, stubborn things: a planner that works with the wifi dead, tools that hand agents the boring half, and the desktop I'm typing this on. None of it is theoretical.";

const words = STATEMENT.split(" ");

/** The picture the toons gather round, under /public: a cut-out, so the tile's dots show behind it. */
const PICTURE = {
  src: "/myself/atif.webp",
  alt: "Atif in glasses and a red shirt, straightening his collar with both hands.",
};

/** How faint a word is before the reading reaches it. */
const UNREAD_OPACITY = 0.16;

/** The band of the screen, about its middle and in screen heights, where the section is slowed. */
const ZONE = 0.25;
/** Px the section moves per px scrolled at its slowest, in the middle of the band. */
const PACE = 0.3;
/** Share of the band spent easing from full speed down to PACE, and again back up. */
const EASE_SHARE = 0.3;
/** How far the kicker gets ahead of the text over the band, in screen heights. */
const KICKER_LEAD = 0.04;
/** How far the picture falls behind the text over the band, at most. Less when there is no room below. */
const TILE_LAG = 0.05;
/** Where the reading runs: from the text's top crossing this share of the screen... */
const READ_FROM = 0.82;
/** ...to its bottom crossing this one. */
const READ_TO = 0.72;

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

/**
 * A short statement beside a picture, with the old portfolio's toons gathered
 * round the picture. The words start faint and ink in one after another as
 * the paragraph is scrolled through, like being read aloud, and fade back
 * when the scroll reverses. Past the middle of the screen the statement and
 * the picture fade out as the toons leave (`data-exits`, see ToonStage).
 *
 * With a mouse or trackpad the section is slowed down, and only
 * while its middle crosses the middle quarter of the screen (ZONE). It comes
 * on and goes off at the speed of the scroll. Inside the band its parts go at
 * different speeds: the kicker leads, the text keeps the section's pace and
 * the picture lags behind, with each toon drifting a little against the
 * picture (`drift`, read by ToonStage). Outside the band nothing moves
 * against anything else. The section's box is made long enough for the slow
 * passage, so everything after it arrives and leaves as it always did. Each
 * part is moved on its own rather than in one wrapper, which would put the
 * toons in front of the words.
 *
 * Touch screens and reduced motion get the section at the speed of the
 * scroll, with the picture holding the middle of its column on wide screens.
 *
 * The picture's size and place are custom properties on `.myself` (see
 * globals.css), because the toons are fixed to the viewport and find the
 * picture from the same numbers.
 */
export function Myself() {
  const sectionRef = useRef<HTMLElement>(null);
  const kickerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const tileRef = useRef<HTMLDivElement>(null);
  /** How far through the slow band the section is, from -0.5 (not there yet) to 0.5 (past it). */
  const drift = useRef(0);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const kicker = kickerRef.current;
      const text = textRef.current;
      const tile = tileRef.current;
      const grid = text?.parentElement;
      if (!section || !kicker || !text || !tile || !grid) return;
      const conditions = { motion: "(prefers-reduced-motion: no-preference)", coarse: "(pointer: coarse)" };
      gsap.matchMedia().add(conditions, (context) => {
        const { motion, coarse } = context.conditions ?? {};
        if (!motion) return;

        // Touch screens scroll natively (SmoothScroll leaves them alone), a frame ahead of
        // anything moved from script, so a slowed section shakes there. They get the
        // section at the speed of the scroll, with the reading and the wipe on its own triggers.
        if (coarse) {
          gsap.fromTo(
            tile,
            { clipPath: "inset(0 0 100% 0)" },
            { clipPath: "inset(0 0 0% 0)", duration: DUR.wipe, ease: EASE.inOut, scrollTrigger: inView(tile, 0.9) },
          );
          gsap.fromTo(
            text.querySelectorAll("[data-word]"),
            { opacity: UNREAD_OPACITY },
            {
              opacity: 1,
              ease: "none",
              stagger: 0.5,
              scrollTrigger: { trigger: text, start: `top ${READ_FROM * 100}%`, end: `bottom ${READ_TO * 100}%`, scrub: 0.4 },
            },
          );
          return;
        }

        const movers = [kicker, text, tile];
        const wipe = gsap.fromTo(
          tile,
          { clipPath: "inset(0 0 100% 0)" },
          { clipPath: "inset(0 0 0% 0)", duration: DUR.wipe, ease: EASE.inOut, paused: true },
        );
        const reveal = gsap.fromTo(
          text.querySelectorAll("[data-word]"),
          { opacity: UNREAD_OPACITY },
          { opacity: 1, ease: "none", stagger: 0.5, paused: true },
        );
        // Eases the reading after the scroll, as a scrub would.
        const read = { at: 0 };
        const readTo = gsap.quickTo(read, "at", { duration: 0.4, ease: "power3", onUpdate: () => void reveal.progress(read.at) });
        let wiped = false;

        // Everything the frame loop needs, measured on refresh. Offsets are from the
        // section's top and ignore transforms, so they are the same at any scroll.
        const m = { vh: 1, total: 1, full: 0, ease: 0, cruise: 0, extra: 0, lead: 0, lag: 0, tileTop: 0, readFrom: 0, readTo: 1 };

        /**
         * Px the section has moved up after s px of the passage: full speed, easing
         * down to PACE, PACE, easing back up, full speed. Its screen top is vh - this.
         */
        const travelled = (s: number) => {
          const slack = 1 - PACE;
          const part = (from: number, length: number) => Math.min(Math.max(s - from, 0), length);
          const easeIn = part(m.full, m.ease);
          const cruise = part(m.full + m.ease, m.cruise);
          const easeOut = part(m.full + m.ease + m.cruise, m.ease);
          const after = Math.max(s - (m.full + 2 * m.ease + m.cruise), 0);
          return (
            Math.min(s, m.full) +
            easeIn - (slack * easeIn * easeIn) / (2 * m.ease || 1) +
            PACE * cruise +
            PACE * easeOut + (slack * easeOut * easeOut) / (2 * m.ease || 1) +
            after
          );
        };

        const measure = () => {
          // Off while the page is measured, so other triggers (the kicker's decode) see the layout.
          for (const el of movers) el.style.transform = "";
          section.dataset.pace = ""; // lets go of the sticky picture, see globals.css
          const vh = (m.vh = window.innerHeight);
          const natural = grid.offsetTop + grid.offsetHeight + parseFloat(getComputedStyle(section).paddingBottom);
          // Full speed until the middle of the statement and picture reaches the band's lower
          // edge, then ZONE of a screen of travel slowed down, then full speed again.
          const zone = ZONE * vh;
          m.full = grid.offsetTop + grid.offsetHeight / 2 + ((1 - ZONE) / 2) * vh;
          m.ease = (EASE_SHARE * zone) / ((1 + PACE) / 2);
          m.cruise = ((1 - 2 * EASE_SHARE) * zone) / PACE;
          // The scroll the slow band takes over the distance it covers.
          m.extra = 2 * m.ease + m.cruise - zone;
          m.total = natural + vh + m.extra;
          // The box is the passage less one screen, so what follows arrives as the section leaves.
          section.style.height = `${m.total - vh}px`;
          m.lead = KICKER_LEAD * vh;
          // The picture lags no further than the bottom of the section's own space.
          m.tileTop = tile.offsetTop;
          const room = natural - (tile.offsetTop + tile.offsetHeight) - 24;
          m.lag = Math.min(TILE_LAG * vh, 2 * Math.max(room, 0));
          // The reading runs over this much of the section's travel (see READ_FROM).
          m.readFrom = (1 - READ_FROM) * vh + text.offsetTop;
          // ...and is over a little before the statement starts to fade (see ToonStage), on
          // screens too short for it to finish by READ_TO.
          const fades = (1 - EXIT_AT) * vh + (kicker.offsetTop + grid.offsetTop + grid.offsetHeight) / 2;
          m.readTo = Math.min((1 - READ_TO) * vh + text.offsetTop + text.offsetHeight, fades - 0.08 * vh);
          // The nav's link lands where the section's top meets the screen's.
          let low = 0;
          let high = m.total;
          for (let i = 0; i < 24; i++) {
            const mid = (low + high) / 2;
            if (travelled(mid) < vh) low = mid;
            else high = mid;
          }
          section.style.scrollMarginTop = `${vh - low}px`;
        };

        const move = (el: HTMLElement, y: number) => {
          el.style.transform = `translate3d(0,${y.toFixed(1)}px,0)`;
        };
        const apply = (progress: number) => {
          const s = progress * m.total;
          const moved = travelled(s);
          // Pushed down by what the scroll has gained on the section, so it goes by slower.
          const behind = s - moved;
          // The parts spread about the text only while the band is crossed: half the spread
          // one way before it, half the other after, and still against each other outside it.
          const part = (drift.current = m.extra ? behind / m.extra - 0.5 : 0);
          move(kicker, behind - m.lead * part);
          move(text, behind);
          move(tile, behind + m.lag * part);
          readTo(clamp01((moved - m.readFrom) / (m.readTo - m.readFrom)));
          if (!wiped && m.vh - moved + m.tileTop + m.lag * part < m.vh * 0.9) {
            wiped = true;
            wipe.play();
          }
        };

        ScrollTrigger.addEventListener("refreshInit", measure);
        measure();
        ScrollTrigger.create({
          trigger: section,
          start: "top bottom",
          end: () => `+=${m.total}`,
          invalidateOnRefresh: true,
          onRefresh: (self) => apply(self.progress),
          onUpdate: (self) => apply(self.progress),
        });

        return () => {
          ScrollTrigger.removeEventListener("refreshInit", measure);
          for (const el of movers) el.style.transform = "";
          delete section.dataset.pace;
          drift.current = 0;
          section.style.height = "";
          section.style.scrollMarginTop = "";
        };
      });
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      id="myself"
      aria-labelledby="myself-title"
      className="myself relative z-[11] overflow-x-clip bg-ground px-[var(--gutter)] pb-[clamp(140px,26vh,280px)] pt-[clamp(72px,12vh,128px)]"
    >
      <ToonStage drift={drift} />

      <h2 id="myself-title" className="sr-only">
        Myself
      </h2>
      <div ref={kickerRef} data-exits className="relative z-[2]">
        <Decode as="p" className="kicker">
          04 / Myself
        </Decode>
      </div>

      {/* Back to front: picture, toons, text. The toons stand in front of the picture and never over the words. */}
      <div className="mt-[clamp(28px,4vw,56px)] grid gap-x-[var(--myself-gap)] gap-y-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <p
          ref={textRef}
          data-exits
          className="relative z-[2] text-[clamp(28px,3.4vw,54px)] font-semibold leading-[1.12] tracking-[-0.035em]"
        >
          {words.map((word, i) => (
            <span key={i} data-word>
              {word}{" "}
            </span>
          ))}
        </p>

        <div
          ref={tileRef}
          data-exits
          className="myself-tile relative overflow-hidden rounded-[20px] border border-line"
        >
          <div aria-hidden="true" className="dot-plate absolute inset-0" />
          <Picture {...PICTURE} />
        </div>
      </div>
    </section>
  );
}

function Picture({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const loaded = useLoadedMedia(ref);
  return (
    <SkeletonReveal loaded={loaded} className="absolute inset-0">
      <Image ref={ref} src={src} alt={alt} fill sizes="(min-width: 1024px) 34vw, 100vw" className="object-contain object-bottom" />
    </SkeletonReveal>
  );
}
