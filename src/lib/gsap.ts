"use client";

import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { BEZIER, EASE, IN_VIEW } from "./motion";

// One place registers the plugins and the house eases, so every component
// that animates imports from here and gets the same setup.
gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, useGSAP);

if (typeof window !== "undefined") {
  for (const key of Object.keys(EASE) as (keyof typeof EASE)[]) {
    CustomEase.create(EASE[key], BEZIER[key]);
  }
}

/**
 * ScrollTrigger settings for a one-shot reveal: fires once when the top of
 * `trigger` crosses `at` (share of the viewport height, 0 = top).
 *
 * A block whose top is already on screen when the reveal is set up, which is
 * as the page opens, reveals with the page instead: one that sits just under
 * `at` would otherwise leave a blank band until the first scroll.
 *
 * The start is kept a couple of pixels short of the end of the page. A block
 * near the bottom (the footer) can sit lower than `at` even at full scroll,
 * and a trigger that starts at or past the last scroll position never fires.
 */
export function inView(trigger: Element, at: number = IN_VIEW): ScrollTrigger.Vars {
  const scrolled = window.scrollY;
  const fold = scrolled + window.innerHeight;
  return {
    trigger,
    once: true,
    start: () => {
      const top = trigger.getBoundingClientRect().top + window.scrollY;
      const line = top - window.innerHeight * at;
      // Never 0 or more for a block already past `at` on load, nor for one on screen when
      // the reveal was set up: a trigger whose start equals the scroll position has not
      // been entered yet, and would wait for a scroll.
      return Math.max(-1, Math.min(top < fold ? Math.min(line, scrolled - 1) : line, ScrollTrigger.maxScroll(window) - 2));
    },
  };
}

export { gsap, ScrollTrigger, SplitText, useGSAP };
