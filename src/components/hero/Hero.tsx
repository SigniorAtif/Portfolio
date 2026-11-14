"use client";

import { useEffect, useRef } from "react";
import { nav } from "@/content/site";
import { gsap, SplitText } from "@/lib/gsap";
import { DUR, EASE, STAGGER, reducedMotion, staggerFor } from "@/lib/motion";
import { BustStage } from "./BustStage";
import { FRAMED_AT, heroProgress } from "./progress";

const stats = [
  { value: "2015", label: "Writing code since" },
  { value: "9th", label: "Code Wars Intl. Olympiad" },
];

const TOP_PX = 84; // room for the site mark and its links once the stage has shrunk
// The desktop is shown in the reel; without a reel it is one of the projects.
const deskHref = nav.some((link) => link.href === "#reel") ? "#reel" : "#work";

/**
 * Opens as a full-screen portrait. Scrolling shrinks the stage into a framed
 * box while the headline and stats arrive around it. One number, --p
 * (0 = full screen, 1 = framed), drives every part of the transition. The
 * name and links above the frame are the page's fixed `SiteMark`.
 */
export function Hero() {
  const trackRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const pin = pinRef.current;
    if (!track || !pin) return;

    // Headline and stats arrive line by line when the frame closes, and leave
    // the same way when it opens again.
    let framed = false;
    let arrive: gsap.core.Tween | null = null;
    const split = reducedMotion()
      ? null
      : SplitText.create(pin.querySelectorAll("[data-arrive]"), {
          type: "lines",
          mask: "lines",
          linesClass: "tl",
          autoSplit: true,
          aria: "none",
          onSplit: (self) => {
            arrive = gsap.from(self.lines, {
              yPercent: 100,
              duration: DUR.line,
              ease: EASE.out,
              stagger: staggerFor(self.lines.length, STAGGER.line),
              paused: true,
            });
            arrive.progress(framed ? 1 : 0);
            return arrive;
          },
        });

    let frame = 0;
    const update = () => {
      frame = 0;
      const viewport = window.innerHeight;
      const { p } = heroProgress(track);
      const below = parseFloat(getComputedStyle(pin).getPropertyValue("--below-px")) || viewport * 0.3;
      pin.style.setProperty("--p", p.toFixed(4));
      // Faded-out layers must not catch clicks meant for the layer that is showing.
      const now = p > FRAMED_AT;
      pin.dataset.framed = String(now);
      if (now !== framed) {
        framed = now;
        if (now) arrive?.play();
        else arrive?.reverse();
      }
      // The canvas keeps its full-screen size and is scaled to fit the frame,
      // so the drawing buffer is never resized mid-scroll.
      pin.style.setProperty("--s", (1 - (p * (TOP_PX + below)) / viewport).toFixed(4));
    };
    const measure = () => {
      const probe = pin.querySelector<HTMLElement>("[data-below]");
      if (probe) pin.style.setProperty("--below-px", String(probe.offsetHeight));
      update();
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      split?.revert();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <section ref={trackRef} id="top" className="relative h-[220svh]">
      <div
        ref={pinRef}
        className="group sticky top-0 h-svh overflow-hidden [--gutter:16px] sm:[--gutter:24px] lg:[--gutter:40px]"
        style={{ "--p": 0, "--s": 1, "--below-px": 260 } as React.CSSProperties}
      >
        <div
          data-no-sparks
          className="absolute overflow-hidden border border-solid"
          style={{
            top: `calc(var(--p) * ${TOP_PX}px)`,
            left: "calc(var(--p) * var(--gutter))",
            right: "calc(var(--p) * var(--gutter))",
            bottom: "calc(var(--p) * var(--below-px) * 1px)",
            borderRadius: "calc(var(--p) * 28px)",
            borderColor: "color-mix(in srgb, var(--line) calc(var(--p) * 100%), transparent)",
          }}
        >
          <div
            className="absolute left-1/2 top-1/2 h-svh w-screen"
            style={{ transform: "translate(-50%, -50%) scale(var(--s))" }}
          >
            <BustStage />
          </div>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-ground from-40% to-transparent px-[var(--gutter)] pb-10 pt-24 text-xl sm:bottom-auto sm:bg-none sm:py-0 sm:top-1/2 sm:-translate-y-1/2 sm:flex-row sm:justify-between sm:text-2xl"
          style={{ opacity: "calc(1 - var(--p) * 3)" }}
        >
          <span>Atif Ahmed</span>
          <span className="text-body">Builds products and tools for agents</span>
        </div>
        <p
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-6 hidden text-center font-mono text-[11px] uppercase tracking-[0.3em] text-muted [@media(hover:hover)]:block"
          style={{ opacity: "calc(1 - var(--p) * 3)" }}
        >
          Move the light
        </p>

        <div
          data-below
          className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 px-[var(--gutter)] pb-8 pt-7 group-data-[framed=true]:pointer-events-auto"
          style={{
            // A gate, not the reveal: hidden until just before the lines rise
            // (and the whole reveal when motion is reduced).
            opacity: "calc((var(--p) - 0.5) * 10)",
            transform: "translateY(calc((1 - var(--p)) * 40px))",
          }}
        >
          <h1 data-arrive className="min-w-0 flex-[999_1_620px] text-[clamp(30px,4.4vw,60px)] font-medium leading-[1.08] tracking-[-0.03em]">
            I build{" "}
            <a href="#work" className="underline decoration-progress decoration-2 underline-offset-[0.14em]">products</a>,{" "}
            <a href="#work" className="underline decoration-done decoration-2 underline-offset-[0.14em]">tools for agents</a>{" "}
            and the{" "}
            <a href={deskHref} className="underline decoration-ink decoration-2 underline-offset-[0.14em]">desktop</a>{" "}
            I write them on.
          </h1>
          <dl className="flex flex-[1_1_300px] gap-10 sm:justify-end">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse">
                <dt data-arrive className="font-mono text-xs uppercase tracking-widest text-muted">{stat.label}</dt>
                <dd data-arrive className="text-[clamp(30px,3.2vw,44px)] font-medium tracking-[-0.03em]">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
