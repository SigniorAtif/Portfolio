"use client";

import { useRef } from "react";
import { Bodoni_Moda } from "next/font/google";
import { gsap, inView, useGSAP } from "@/lib/gsap";
import { EASE, reducedMotion } from "@/lib/motion";
import { site } from "@/content/site";

// Used for the footer name only. Variable font, so the weight is set in CSS.
const bodoni = Bodoni_Moda({ subsets: ["latin"], axes: ["opsz"], display: "swap", preload: false });

const letters = [
  ...Array.from(site.first, (letter) => ({ letter, last: false })),
  ...Array.from(site.last, (letter) => ({ letter, last: true })),
];

/**
 * The oversized name closing the footer. The letters stand on the footer's
 * bottom edge, stretched tall, and each rises out of that edge the first time
 * the mark scrolls into view. Decorative: the name is already in the footer.
 */
export function FooterMark() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current || reducedMotion()) return;
      gsap.from("span", {
        yPercent: 115,
        duration: 1.1,
        ease: EASE.out,
        stagger: 0.06,
        scrollTrigger: inView(ref.current, 0.92),
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} aria-hidden="true" className={`footmark ${bodoni.className}`}>
      <div className="footmark-in">
        {letters.map(({ letter, last }, i) => (
          <span key={i} className={last ? "text-muted" : "text-ink"}>
            {letter}
          </span>
        ))}
      </div>
    </div>
  );
}
