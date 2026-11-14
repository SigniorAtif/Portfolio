"use client";

import { useEffect, useRef } from "react";

const STEP_PX = 16; // pointer travel per spark
const MAX = 140;
const STAR_SHARE = 0.3; // sparks drawn as a four-point star, the rest as dots

type Spark = { x: number; y: number; vx: number; vy: number; born: number; life: number; size: number; phase: number; star: boolean };

/**
 * Whether the point sits over a star field, or anything else marked
 * `data-no-sparks`. Hidden zones (opacity 0, like an unpicked work backdrop)
 * do not count.
 */
function overQuietZone(x: number, y: number) {
  for (const zone of document.querySelectorAll<HTMLElement>("[data-no-sparks]")) {
    const box = zone.getBoundingClientRect();
    if (x < box.left || x >= box.right || y < box.top || y >= box.bottom) continue;
    if (zone.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) ?? true) return true;
  }
  return false;
}

/**
 * A trail of white sparks behind the pointer, over the whole page: dots and
 * small four-point stars that flicker, sink a little and go out. None are
 * made over a star field, where they would only add to the dots. Mouse
 * only, off under reduced motion, and the loop sleeps while nothing is alight.
 */
export function Sparks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const colour = getComputedStyle(canvas).getPropertyValue("--dot").trim() || "#ffffff";
    let sparks: Spark[] = [];
    let frame = 0;
    let last: { x: number; y: number } | null = null;
    let owed = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.fillStyle = colour;
      sparks = sparks.filter((spark) => now - spark.born < spark.life);
      for (const spark of sparks) {
        const age = (now - spark.born) / spark.life;
        const t = (now - spark.born) / 1000;
        const x = spark.x + spark.vx * t;
        const y = spark.y + spark.vy * t + 26 * t * t;
        const flicker = 0.55 + 0.45 * Math.sin(spark.phase + t * 22);
        ctx.globalAlpha = (1 - age) ** 1.4 * flicker;
        const r = spark.size * (1 - age * 0.5);
        if (spark.star) {
          // Two thin bars crossed: long arms, pinched middle.
          ctx.fillRect(x - r * 3, y - r * 0.3, r * 6, r * 0.6);
          ctx.fillRect(x - r * 0.3, y - r * 3, r * 0.6, r * 6);
        } else {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      frame = sparks.length ? requestAnimationFrame(draw) : 0;
      if (!frame) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const at = { x: event.clientX, y: event.clientY };
      if (last) {
        owed += Math.hypot(at.x - last.x, at.y - last.y);
        // Checked only when a spark is due, so most moves skip the layout read.
        if (owed >= STEP_PX && overQuietZone(at.x, at.y)) owed = 0;
        const now = performance.now();
        while (owed >= STEP_PX && sparks.length < MAX) {
          owed -= STEP_PX;
          sparks.push({
            x: at.x + (Math.random() - 0.5) * 22,
            y: at.y + (Math.random() - 0.5) * 22,
            vx: (Math.random() - 0.5) * 36,
            vy: (Math.random() - 0.7) * 30,
            born: now,
            life: 500 + Math.random() * 800,
            size: 0.7 + Math.random() * 1.3,
            phase: Math.random() * 6.28,
            star: Math.random() < STAR_SHARE,
          });
        }
        owed %= STEP_PX;
        if (!frame && sparks.length) frame = requestAnimationFrame(draw);
      }
      last = at;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 h-full w-full" />;
}

type Star = { x: string; y: string; size?: number; delay?: number };

/** Still stars that wink in place, set round something worth looking at. Positions are relative to the parent. */
export function Twinkles({ stars }: { stars: Star[] }) {
  return (
    <>
      {stars.map((star, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="twinkle"
          style={{ left: star.x, top: star.y, "--s": `${star.size ?? 14}px`, "--d": `${star.delay ?? i * 0.7}s` } as React.CSSProperties}
        />
      ))}
    </>
  );
}
