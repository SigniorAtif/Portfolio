"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, inView, useGSAP } from "@/lib/gsap";
import { DUR, EASE, STAGGER, reducedMotion, staggerFor } from "@/lib/motion";
import { useStageOpen } from "@/lib/stage";

type Props = {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  delay?: number;
  /**
   * Animate the direct children one after another instead of the block.
   * "chips" also starts each child slightly small.
   */
  each?: "chips" | "cards";
  /** Share of the viewport height the block's top must cross (0 = top). Defaults to the house value. */
  at?: number;
};

/** The quiet default for anything that is not text: 24px up and a fade, once. */
export function FadeUp({ as: Tag = "div", className, children, delay = 0, each, at }: Props) {
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
      const targets = each ? Array.from(el.children) : [el];
      gsap.from(targets, {
        y: 24,
        opacity: 0,
        scale: each === "chips" ? 0.9 : 1,
        duration: DUR.line,
        ease: EASE.out,
        stagger: each ? staggerFor(targets.length, each === "chips" ? STAGGER.chip : STAGGER.card) : 0,
        delay,
        clearProps: "transform,opacity",
        scrollTrigger: inView(el, at),
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
