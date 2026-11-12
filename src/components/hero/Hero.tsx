"use client";

import { useEffect, useRef } from "react";
import { BustStage } from "./BustStage";

const stats = [
  { value: "2015", label: "Writing code since" },
  { value: "9th", label: "Code Wars Intl. Olympiad" },
];

const TOP_PX = 84; // room for the nav once the stage has shrunk

/**
 * Opens as a full-screen portrait. Scrolling shrinks the stage into a framed
 * box while the nav, headline and stats arrive around it. One number, --p
 * (0 = full screen, 1 = framed), drives every part of the transition.
 */
export function Hero() {
  const trackRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const pin = pinRef.current;
    if (!track || !pin) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const viewport = window.innerHeight;
      const travel = track.offsetHeight - viewport;
      const raw = Math.min(Math.max(-track.getBoundingClientRect().top / travel, 0), 1);
      const p = raw * raw * (3 - 2 * raw);
      const below = parseFloat(getComputedStyle(pin).getPropertyValue("--below-px")) || viewport * 0.3;
      pin.style.setProperty("--p", p.toFixed(4));
      // Faded-out layers must not catch clicks meant for the layer that is showing.
      pin.dataset.framed = String(p > 0.6);
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

        <header className="absolute inset-x-0 top-0 flex items-baseline gap-5 px-[var(--gutter)] py-6">
          <a href="#top" className="text-[26px] font-semibold tracking-tight">
            Atif Ahmed.
          </a>
          <nav
            aria-label="Primary"
            className="pointer-events-none flex gap-5 text-lg text-muted group-data-[framed=true]:pointer-events-auto"
            style={{ opacity: "calc(var(--p) * 2 - 1)" }}
          >
            <a href="#work" className="hover:text-ink">Work</a>
            <a href="#desk" className="hover:text-ink">Desk</a>
            <a href="#about" className="hover:text-ink">About</a>
          </nav>
        </header>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-10 flex flex-col gap-1 px-[var(--gutter)] text-xl sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:flex-row sm:justify-between sm:text-2xl"
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
            opacity: "calc(var(--p) * 2.5 - 1.5)",
            transform: "translateY(calc((1 - var(--p)) * 40px))",
          }}
        >
          <h1 className="min-w-0 flex-[999_1_620px] text-[clamp(30px,4.4vw,60px)] font-medium leading-[1.08] tracking-[-0.03em]">
            I build{" "}
            <a href="#work" className="underline decoration-progress decoration-2 underline-offset-[0.14em]">products</a>,{" "}
            <a href="#work" className="underline decoration-done decoration-2 underline-offset-[0.14em]">tools for agents</a>{" "}
            and the{" "}
            <a href="#desk" className="underline decoration-ink decoration-2 underline-offset-[0.14em]">desktop</a>{" "}
            I write them on.
          </h1>
          <dl className="flex flex-[1_1_300px] gap-10 sm:justify-end">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse">
                <dt className="font-mono text-xs uppercase tracking-widest text-muted">{stat.label}</dt>
                <dd className="text-[clamp(30px,3.2vw,44px)] font-medium tracking-[-0.03em]">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
