"use client";

import { useEffect, useRef } from "react";

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

const AREA_PER_DOT = 13000; // px² of viewport per dot, matching the hero's visible density
const MAX_DOTS = 180;
const DOT_PX = 2; // sprite size at 800px viewport height, as in the hero
const PARALLAX_VH = 24; // how far the backdrop travels while the footer rises a full screen

type Dot = { x: number; y: number; a: number; b: number; c: number };

/** Small seeded generator, so the field is the same on every visit. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function SpaceField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const footer = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !footer || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const colour = getComputedStyle(canvas).getPropertyValue("--dot").trim() || "#ffffff";
    let width = 0;
    let height = 0;
    let dots: Dot[] = [];
    let frame = 0;
    let visible = false;

    const draw = (ms: number) => {
      const t = ms / 1000;
      const unit = height / 1.77; // px per scene unit: the hero frame is 1.77 units tall
      const size = (height / 800) * DOT_PX;
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
    };

    const loop = (ms: number) => {
      draw(ms);
      frame = visible && !reduced ? requestAnimationFrame(loop) : 0;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const random = seeded(7);
      const count = Math.min(MAX_DOTS, Math.round((width * height) / AREA_PER_DOT));
      // Spread a little past the edges so drifting dots never leave a bare rim.
      dots = Array.from({ length: count }, () => ({
        x: random() * 1.3 - 0.15,
        y: random() * 1.3 - 0.15,
        a: random(),
        b: random(),
        c: random(),
      }));
      if (!frame) draw(performance.now());
    };

    // Only animate while the footer is on screen.
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !frame && !reduced) frame = requestAnimationFrame(loop);
    });

    resize();
    observer.observe(footer);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      style={{ transform: `translate3d(0, calc((1 - var(--reveal, 1)) * ${PARALLAX_VH}vh), 0)` }}
    />
  );
}
