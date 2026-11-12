"use client";

import { useRef } from "react";
import Image from "next/image";
import { Decode } from "@/components/motion/Text";
import { SkeletonReveal, useLoadedMedia } from "@/components/ui/Skeleton";
import { gsap, inView, useGSAP } from "@/lib/gsap";
import { DUR, EASE } from "@/lib/motion";
import { ToonStage } from "./ToonStage";

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

/**
 * A short statement beside a picture, with the old portfolio's toons gathered
 * round the picture. The words start faint and ink in one after another as
 * the paragraph is scrolled through, like being read aloud, and fade back
 * when the scroll reverses. On wide screens the picture holds the middle of
 * its column while the text passes. The toons stay on screen into the closing
 * quote (`until`).
 *
 * The picture's size and place are custom properties on `.myself` (see
 * globals.css), because the toons are fixed to the viewport and find the
 * picture from the same numbers.
 */
export function Myself({ until }: { until: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const tileRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const text = textRef.current;
      const tile = tileRef.current;
      if (!text || !tile) return;
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
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
            scrollTrigger: { trigger: text, start: "top 82%", end: "bottom 72%", scrub: 0.4 },
          },
        );
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
      <ToonStage until={until} />

      <h2 id="myself-title" className="sr-only">
        Myself
      </h2>
      <Decode as="p" className="kicker relative z-[2]">
        04 / Myself
      </Decode>

      {/* Back to front: picture, toons, text. The toons stand in front of the picture and never over the words. */}
      <div className="mt-[clamp(28px,4vw,56px)] grid gap-x-[var(--myself-gap)] gap-y-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <p
          ref={textRef}
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
