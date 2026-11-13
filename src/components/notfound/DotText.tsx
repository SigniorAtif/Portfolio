"use client";

import { useEffect, useRef } from "react";

const TARGET_DOTS = 1500;
const RING_PX = 56; // the loader ring the portrait's dots leave from
const ASSEMBLE_S = 2.6;
const LOOSE_SHARE = 0.03; // dots that never settle
const LIGHT_PX = 150; // reach of the pointer's light

type Dot = {
  x: number;
  y: number;
  /** One random number per dot: its angle on the ring and its delay, as in the portrait. */
  r: number;
  r2: number;
  size: number;
  loose: boolean;
};

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

type Props = {
  text: string;
  className?: string;
  /** Font weight the text is sampled at. */
  weight?: number;
};

/**
 * Text drawn in white dots on a 2D canvas, the same material as the portrait.
 * The text is rendered off screen, its lit pixels are sampled on a grid, and
 * the dots fly in from a ring the way the portrait assembles. A few never
 * settle and keep drifting, so the word looks like it did not finish. The
 * pointer is a light: dots near it brighten. Reduced motion draws it in place.
 */
export function DotText({ text, className, weight = 700 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const style = getComputedStyle(canvas);
    const colour = style.getPropertyValue("--dot").trim() || "#ffffff";
    const family = style.fontFamily;
    const pointer = { x: -9999, y: -9999 };
    let dots: Dot[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let born = 0;
    let live = true;

    /** Render the text off screen and keep a dot for every lit grid point. */
    const sample = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      if (!width || !height) return;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const off = document.createElement("canvas");
      off.width = width;
      off.height = height;
      const pen = off.getContext("2d", { willReadFrequently: true });
      if (!pen) return;
      let size = height * 0.98;
      pen.font = `${weight} ${size}px ${family}`;
      size *= Math.min(1, (width * 0.96) / pen.measureText(text).width);
      pen.font = `${weight} ${size}px ${family}`;
      pen.textAlign = "center";
      pen.textBaseline = "middle";
      pen.fillStyle = "#fff";
      pen.fillText(text, width / 2, height / 2 + size * 0.04);
      const pixels = pen.getImageData(0, 0, width, height).data;

      let lit = 0;
      for (let i = 3; i < pixels.length; i += 4 * 7) if (pixels[i] > 128) lit++;
      const step = Math.max(2, Math.sqrt((lit * 7) / TARGET_DOTS));

      // A fixed generator, so the same text always makes the same dots.
      let seed = 11;
      const random = () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      dots = [];
      for (let y = step / 2; y < height; y += step) {
        for (let x = step / 2; x < width; x += step) {
          const jx = x + (random() - 0.5) * step * 0.7;
          const jy = y + (random() - 0.5) * step * 0.7;
          // The jitter can push a point past the edge, where there is no pixel to read.
          const px = Math.round(jx);
          const py = Math.round(jy);
          if (px < 0 || py < 0 || px >= width || py >= height) continue;
          if (pixels[(py * width + px) * 4 + 3] < 128) continue;
          const r2 = random();
          dots.push({ x: jx, y: jy, r: random(), r2, size: 0.55 + r2 ** 3 * 1.5, loose: random() < LOOSE_SHARE });
        }
      }
    };

    const draw = (ms: number) => {
      const t = (ms - born) / 1000;
      const assemble = reduced ? 1 : Math.min(t / ASSEMBLE_S, 1);
      const unit = Math.max(1, height / 260);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = colour;
      for (const dot of dots) {
        // Each dot leaves the ring on its own delay, taken from the same
        // number as its angle, so the ring unwinds instead of bursting.
        const p = easeInOut(Math.min(Math.max((assemble - dot.r * 0.45) / 0.55, 0), 1));
        const angle = dot.r * Math.PI * 2;
        const ringX = width / 2 + Math.cos(angle) * RING_PX;
        const ringY = height / 2 + Math.sin(angle) * RING_PX;
        const arc = Math.sin(p * Math.PI);
        let x = ringX + (dot.x - ringX) * p + Math.sin(dot.r * 40) * arc * 34 * unit;
        let y = ringY + (dot.y - ringY) * p + Math.cos(dot.r * 31) * arc * 34 * unit;
        if (dot.loose && !reduced) {
          // Never lands: wanders around where it should have been.
          const reach = (14 + dot.r2 * 46) * unit * p;
          x += Math.sin(t * (0.25 + dot.r2 * 0.4) + dot.r * 50) * reach;
          y += Math.cos(t * (0.2 + dot.r * 0.35) + dot.r2 * 50) * reach * 0.8;
        }
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const light = Math.exp(-(dx * dx + dy * dy) / (LIGHT_PX * LIGHT_PX));
        ctx.globalAlpha = Math.min(1, (0.3 + dot.r2 * 0.45 + light * 0.9) * (0.75 + 0.25 * p));
        ctx.beginPath();
        ctx.arc(x, y, dot.size * unit * 0.8 * (1 + light * 0.35), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const loop = (ms: number) => {
      draw(ms);
      frame = requestAnimationFrame(loop);
    };
    const onMove = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.x = event.clientX - box.left;
      pointer.y = event.clientY - box.top;
      if (reduced) draw(performance.now());
    };
    const onResize = () => {
      sample();
      if (reduced) draw(performance.now());
    };

    // The text must be measured in the real font, so wait for it.
    void document.fonts.ready.then(() => {
      if (!live) return;
      sample();
      born = performance.now();
      if (reduced) draw(born);
      else frame = requestAnimationFrame(loop);
    });
    const sizes = new ResizeObserver(onResize);
    sizes.observe(canvas);
    window.addEventListener("pointermove", onMove);

    return () => {
      live = false;
      cancelAnimationFrame(frame);
      sizes.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, [text, weight]);

  return (
    <div className={className}>
      <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
      <span className="sr-only">{text}</span>
    </div>
  );
}
