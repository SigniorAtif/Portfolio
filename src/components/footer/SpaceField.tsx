"use client";

import { useEffect, useRef } from "react";
import { today } from "@/content/dates";
import { found } from "@/lib/eggs";

// The hero's backdrop, redrawn for the footer: faint white dust drifting
// slowly through the frame. The values mirror the dust shader in
// hero/BustStage.tsx (brightness .1 to .32, size by the same random, sine
// drift with periods around two minutes). 2D canvas, so the page keeps a
// single WebGL context.
//
// The canvas is fixed to the viewport and clipped by the footer (`clip-path`).
// As the footer rises the backdrop drifts up too, but slower (parallax): it
// starts PARALLAX_VH lower and reaches its place when the footer is fully up.
// `--reveal` (0 to 1) is set on the footer by FooterCurtain; without it the
// backdrop just sits in place.
//
// An easter egg rides on it (content/dates): on Eid a crescent of dots hangs
// in every field, and on New Year's Day the footer's field bursts with stars
// once it is well in view. Seeing either counts as finding the "dates" egg.

const AREA_PER_DOT = 13000; // px² of viewport per dot, matching the hero's visible density
const MAX_DOTS = 180;
const DOT_PX = 2; // sprite size at 800px viewport height, as in the hero
const PARALLAX_VH = 24; // how far the backdrop travels while the footer rises a full screen

type Dot = { x: number; y: number; a: number; b: number; c: number };

// The crescent: a disc with a smaller one taken out of it, filled with dots on a grid.
const MOON = { x: 0.88, y: 0.16, radius: 0.07, min: 26, max: 70, alpha: 0.85, dot: 0.6 };
const MOON_CUT = { x: 0.36, y: -0.24, radius: 0.8 }; // the disc taken out, in moon radii
const MOON_ROWS = 17; // grid rows across the moon's diameter
// The burst: a few volleys of stars, one after another, each flying out from its
// own point and falling a little as it fades. Places are shares of the field.
const VOLLEYS = [
  { x: 0.26, y: 0.5, at: 0 },
  { x: 0.56, y: 0.32, at: 0.45 },
  { x: 0.8, y: 0.12, at: 0.9 },
];
const SPARKS = 60; // stars per volley
const BURST_S = 2.6; // how long a volley lasts
const BURST_REACH = 0.2; // how far the fastest star flies, as a share of the field's height
const BURST_FALL = 0.06;
const BURST_STILL = 0.5; // under reduced motion, the moment the burst is held at
const BURST_SEEN = 0.8; // share of the field on screen before it bursts

type Spark = { angle: number; speed: number; size: number };

/** Small seeded generator, so the field is the same on every visit. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Props = {
  /** Draws the field inside its parent box instead of across the viewport behind the footer. */
  fill?: boolean;
  /** Multiplies how many dots there are and how big, for a box much smaller than a screen. */
  density?: number;
  dotScale?: number;
};

export function SpaceField({ fill = false, density = 1, dotScale = 1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const footer = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !footer || !ctx) return;

    // The box this field fills (or, behind the footer, is clipped to) is a
    // quiet zone for the pointer's sparks: see about/Sparks.tsx.
    footer.setAttribute("data-no-sparks", "");

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const colour = getComputedStyle(canvas).getPropertyValue("--dot").trim() || "#ffffff";
    const day = today();
    const crescent = !!day?.crescent;
    // The burst is the footer's own, not the fills'.
    const burst = !fill && !!day?.burst;
    let width = 0;
    let height = 0;
    let dots: Dot[] = [];
    let moon: { x: number; y: number }[] = [];
    let sparks: Spark[][] = [];
    // Where the field shows: all of it in a fill, the footer's share of the screen behind the footer.
    let top = 0;
    let burstAt = -1; // when the burst began, in seconds; -1 before it has
    let frame = 0;
    let visible = false;

    const drawMoon = (t: number) => {
      const bob = reduced ? 0 : Math.sin(t * 0.04) * 0.012 * height;
      ctx.globalAlpha = MOON.alpha;
      for (const point of moon) {
        ctx.beginPath();
        ctx.arc(point.x, point.y + bob, Math.max(1, (height / 800) * DOT_PX * dotScale * MOON.dot), 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawBurst = (t: number) => {
      const field = height - top;
      const size = (height / 800) * DOT_PX * dotScale;
      VOLLEYS.forEach((volley, index) => {
        const p = reduced ? BURST_STILL : (t - burstAt - volley.at) / BURST_S;
        if (p <= 0 || p >= 1) return;
        const out = 1 - Math.pow(1 - p, 3);
        const fade = reduced ? 0.7 : Math.pow(1 - p, 1.4);
        for (const spark of sparks[index]) {
          const reach = out * spark.speed * BURST_REACH * field;
          const x = volley.x * width + Math.cos(spark.angle) * reach;
          const y = top + volley.y * field + Math.sin(spark.angle) * reach + p * p * BURST_FALL * field;
          ctx.globalAlpha = fade * (0.7 + spark.size * 0.3);
          ctx.beginPath();
          ctx.arc(x, y, size * (0.7 + spark.size) * 0.55, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    };

    const draw = (ms: number) => {
      const t = ms / 1000;
      const unit = height / 1.77; // px per scene unit: the hero frame is 1.77 units tall
      const size = (height / 800) * DOT_PX * dotScale;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = colour;
      for (const dot of dots) {
        const x = dot.x * width + Math.sin(t * 0.05 + dot.a * 6.28) * 0.25 * unit;
        const y = dot.y * height + Math.sin(t * 0.04 + dot.b * 6.28) * 0.2 * unit;
        ctx.globalAlpha = 0.1 + dot.c * 0.22;
        ctx.beginPath();
        // The shader's dot is solid to 18% of the sprite and gone by 50%.
        ctx.arc(x, y, size * (0.5 + dot.c) * 0.34, 0, Math.PI * 2);
        ctx.fill();
      }
      if (crescent) drawMoon(t);
      if (burstAt >= 0) drawBurst(t);
    };

    const loop = (ms: number) => {
      draw(ms);
      frame = visible && !reduced ? requestAnimationFrame(loop) : 0;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = fill ? footer.clientWidth : window.innerWidth;
      height = fill ? footer.clientHeight : window.innerHeight;
      if (!width || !height) return;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      top = fill ? 0 : Math.max(0, height - footer.clientHeight);
      const random = seeded(7);
      const count = Math.min(MAX_DOTS, Math.round(((width * height) / AREA_PER_DOT) * density));
      // Spread a little past the edges so drifting dots never leave a bare rim.
      dots = Array.from({ length: count }, () => ({
        x: random() * 1.3 - 0.15,
        y: random() * 1.3 - 0.15,
        a: random(),
        b: random(),
        c: random(),
      }));
      if (crescent) {
        const field = height - top;
        const radius = Math.min(MOON.max, Math.max(MOON.min, Math.min(width, field) * MOON.radius));
        const cx = MOON.x * width;
        const cy = top + MOON.y * field;
        const step = (radius * 2) / MOON_ROWS;
        moon = [];
        for (let y = -radius; y <= radius; y += step) {
          for (let x = -radius; x <= radius; x += step) {
            const cutX = x - MOON_CUT.x * radius;
            const cutY = y - MOON_CUT.y * radius;
            const inside = x * x + y * y <= radius * radius;
            const cut = cutX * cutX + cutY * cutY <= (MOON_CUT.radius * radius) ** 2;
            if (inside && !cut) moon.push({ x: cx + x, y: cy + y });
          }
        }
      }
      if (burst) {
        sparks = VOLLEYS.map(() =>
          Array.from({ length: SPARKS }, (_, i) => ({
            angle: (i / SPARKS) * Math.PI * 2 + random() * 0.3,
            speed: 0.45 + random() * 0.55,
            size: random(),
          })),
        );
      }
      if (!frame) draw(performance.now());
    };

    // Only animate while the footer is on screen.
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && (crescent || burst)) found("dates");
        // The burst waits until most of the field shows, so it is seen whole. Once a page.
        const shown = entry.intersectionRect.height / Math.min(entry.boundingClientRect.height, window.innerHeight || 1);
        if (burst && burstAt < 0 && shown >= BURST_SEEN) {
          burstAt = performance.now() / 1000;
          if (reduced) draw(performance.now());
        }
        if (visible && !frame && !reduced) frame = requestAnimationFrame(loop);
      },
      { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] },
    );

    resize();
    observer.observe(footer);
    window.addEventListener("resize", resize);
    const sizes = fill ? new ResizeObserver(resize) : null;
    sizes?.observe(footer);
    return () => {
      cancelAnimationFrame(frame);
      footer.removeAttribute("data-no-sparks");
      sizes?.disconnect();
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [fill, density, dotScale]);

  if (fill) return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      style={{ transform: `translate3d(0, calc((1 - var(--reveal, 1)) * ${PARALLAX_VH}vh), 0)` }}
    />
  );
}
