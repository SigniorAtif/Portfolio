"use client";

import { useRef } from "react";
import Link from "next/link";
import { SpaceField } from "@/components/footer/SpaceField";
import { Decode } from "@/components/motion/Text";
import { featured } from "@/content/projects";
import { ScrollTrigger, useGSAP } from "@/lib/gsap";
import { reducedMotion } from "@/lib/motion";

/** Share of the held scroll spent growing; the rest is the full frame, held. */
const GROW = 0.7;

const rury = featured.find((project) => project.slug === "rury");

/**
 * The desktop, as a window that opens: a rounded frame in the middle of the
 * held screen grows until it is the screen, while the picture inside eases
 * back from a close crop. Until rury has a capture, the frame holds its name.
 *
 * Everything in the frame is cheap to redraw on purpose: flat colour and plain
 * glyphs. A dot pattern here (the plate, or dotted type) is repainted on every
 * frame of the grow and drops the scroll to a crawl. The caption arrives once it has filled. The CSS
 * does the drawing from `--p` (0 to 1), which is all this sets.
 */
export function AboutDesk() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = ref.current;
      if (!section || reducedMotion()) return;
      section.dataset.held = "";
      const trigger = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => section.style.setProperty("--p", Math.min(self.progress / GROW, 1).toFixed(4)),
      });
      return () => {
        trigger.kill();
        delete section.dataset.held;
        section.style.removeProperty("--p");
      };
    },
    { scope: ref },
  );

  return (
    <section ref={ref} aria-labelledby="desk-title" className="about-desk">
      <div className="about-desk-stick">
        <div className="about-desk-head px-[var(--gutter)]">
          <Decode as="p" className="kicker">
            05 / The desk
          </Decode>
          <h2 id="desk-title" className="text-[clamp(36px,5.2vw,76px)] font-medium leading-[1.02] tracking-[-0.035em]">
            The desktop I write them on.
          </h2>
        </div>

        <div className="about-desk-frame">
          <div className="about-desk-inner">
            <SpaceField fill density={1.6} />
            <p aria-hidden="true" className="about-desk-name">
              rury
            </p>
          </div>
        </div>

        <div className="about-desk-caption px-[var(--gutter)]">
          <p className="max-w-[34rem] text-[18px] leading-[1.45] text-body">{rury?.summary}</p>
          <Link href="/work#rury" className="kicker whitespace-nowrap !text-ink">
            See rury<span className="arrow">↗</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
