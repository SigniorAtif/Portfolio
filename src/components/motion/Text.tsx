"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, inView, SplitText, useGSAP } from "@/lib/gsap";
import { DUR, EASE, STAGGER, reducedMotion, staggerFor } from "@/lib/motion";
import { useStageOpen } from "@/lib/stage";

// Text arrives by role. Three reveals, all saying "this assembles":
// Decode for mono kickers and labels, Rise for headings, Lines for body copy.
// Each fires once when it scrolls into view and leaves the real text readable
// by screen readers. Reduced motion skips straight to the finished state.

type TextProps = {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  /** Seconds to wait after the block enters view. */
  delay?: number;
  /** Share of the viewport height the block's top must cross (0 = top). Defaults to the house value. */
  at?: number;
};

type RiseProps = TextProps & {
  /**
   * "auto" labels the wrapper with the full text and hides the split words.
   * Use "none" when the heading contains links, which must stay reachable.
   */
  aria?: "auto" | "none";
};

/** Headings: words rise through line masks with a slight rotation. No opacity. */
export function Rise({ as: Tag = "div", className, children, delay = 0, at, aria = "auto" }: RiseProps) {
  const ref = useRef<HTMLElement>(null);
  const open = useStageOpen();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reducedMotion()) return;
      if (!open) {
        // Held back until the veil is leaving.
        gsap.set(el, { autoAlpha: 0 });
        return;
      }
      SplitText.create(el, {
        type: "lines,words",
        mask: "lines",
        linesClass: "tl",
        autoSplit: true,
        aria,
        onSplit: (split) =>
          gsap.from(split.words, {
            yPercent: 110,
            rotate: 4,
            duration: DUR.rise,
            ease: EASE.out,
            stagger: staggerFor(split.words.length, STAGGER.word),
            delay,
            scrollTrigger: inView(el, at),
          }),
      });
    },
    { scope: ref, dependencies: [open], revertOnUpdate: true },
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

/** Body copy: each line slides up out of its own mask. */
export function Lines({ as: Tag = "div", className, children, delay = 0, at }: TextProps) {
  const ref = useRef<HTMLElement>(null);
  const open = useStageOpen();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reducedMotion()) return;
      if (!open) {
        // Held back until the veil is leaving.
        gsap.set(el, { autoAlpha: 0 });
        return;
      }
      SplitText.create(el, {
        type: "lines",
        mask: "lines",
        linesClass: "tl",
        autoSplit: true,
        // Lines keep their text and links whole, so nothing needs relabelling.
        aria: "none",
        onSplit: (split) =>
          gsap.from(split.lines, {
            yPercent: 100,
            duration: DUR.line,
            ease: EASE.out,
            stagger: staggerFor(split.lines.length, STAGGER.line),
            delay,
            scrollTrigger: inView(el, at),
          }),
      });
    },
    { scope: ref, dependencies: [open], revertOnUpdate: true },
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

const DOTS = ["·", "•", "○"];
const DECODE_MS = 600; // whole reveal, however long the label
const CHAR_MS = 25; // gap between one letter locking and the next
const CYCLE_MS = 50; // how long each dot glyph shows
const LEAD_MS = 125; // dots cycle this long before the first letter locks

type DecodeProps = {
  as?: ElementType;
  className?: string;
  /** Plain text only. Changing it replays the reveal with the new text. */
  children: string;
  delay?: number;
};

/**
 * Mono kickers and labels: every character starts as a dot and locks to its
 * letter from left to right. Text made of dots, like the portrait.
 */
export function Decode({ as: Tag = "span", className, children: text, delay = 0 }: DecodeProps) {
  const ref = useRef<HTMLElement>(null);
  const outRef = useRef<HTMLSpanElement>(null);
  const open = useStageOpen();

  useGSAP(
    () => {
      const el = ref.current;
      // Write through the existing text node so React keeps its handle on it.
      const node = outRef.current?.firstChild;
      if (!el || !node || reducedMotion()) return;

      const chars = Array.from(text);
      const per = Math.min(CHAR_MS, (DECODE_MS - LEAD_MS) / chars.length);
      const total = LEAD_MS + per * chars.length;
      const clock = { ms: 0 };
      const draw = () => {
        const locked = Math.floor((clock.ms - LEAD_MS) / per);
        const phase = Math.floor(clock.ms / CYCLE_MS);
        node.nodeValue = chars
          .map((char, i) => (i <= locked || char === " " ? char : DOTS[(phase + i) % DOTS.length]))
          .join("");
      };

      gsap.set(outRef.current, { autoAlpha: 0 });
      // Held back until the veil is leaving.
      if (!open) return;
      gsap.to(clock, {
        ms: total,
        duration: total / 1000,
        ease: "none",
        delay,
        scrollTrigger: inView(el),
        onStart: () => {
          gsap.set(outRef.current, { autoAlpha: 1 });
        },
        onUpdate: draw,
        onComplete: () => {
          node.nodeValue = text;
        },
      });

      return () => {
        node.nodeValue = text;
      };
    },
    { scope: ref, dependencies: [text, delay, open], revertOnUpdate: true },
  );

  return (
    <Tag ref={ref} className={`inline-grid ${className ?? ""}`}>
      {/* The real text: read by screen readers, and it reserves the width. */}
      <span className="text-transparent [grid-area:1/1]">{text}</span>
      <span ref={outRef} aria-hidden="true" className="pointer-events-none select-none [grid-area:1/1]">
        {text}
      </span>
    </Tag>
  );
}
