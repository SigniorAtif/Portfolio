"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, inView, useGSAP } from "@/lib/gsap";
import { DUR, EASE, STAGGER, reducedMotion, staggerFor } from "@/lib/motion";

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
};

/** The quiet default for anything that is not text: 24px up and a fade, once. */
export function FadeUp({ as: Tag = "div", className, children, delay = 0, each }: Props) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reducedMotion()) return;
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
        scrollTrigger: inView(el),
      });
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
