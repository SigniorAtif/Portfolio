"use client";

import { useEffect, useRef, type JSX } from "react";
import { gsap } from "@/lib/gsap";
import { toons, type ToonId } from "./toons";
import { CoffeeMugSvg } from "./toons/CoffeeMug";
import { LOOP_EASE_IN_OUT, part, type ToonSvgProps } from "./toons/types";

const FPS = 12; // low on purpose: it should feel like stop motion
const GLYPHS = [" ", "·", "•", "○", "●"]; // dot-like only, so it stays the site's material
const LIGHT_CELLS = 11; // reach of the pointer's light, in cells

/** One of the 404's toons, as dot-ASCII, wherever the page puts it. */
export function AsciiToon({ id, className, sharpness }: { id: ToonId; className?: string; sharpness?: number }) {
  const toon = toons.find((item) => item.id === id);
  if (!toon) return null;
  return (
    <div className={`ascii-${toon.id} ${className ?? ""}`} role="img" aria-label={toon.label}>
      <AsciiDrawing Svg={toon.Svg} animate={toon.animate} rows={toon.rows} grain={toon.grain} sharpness={sharpness} />
    </div>
  );
}

// The mug has no loop of its own, so it is given a slow tumble to match the astronaut's drift.
function animateMug(svg: SVGSVGElement, tl: gsap.core.Timeline) {
  tl.to(part(svg, "coffee"), { rotation: 24, duration: 4, transformOrigin: "50% 50%", ...LOOP_EASE_IN_OUT }, 0);
}

/** The astronaut's mug, adrift beside him. Decoration only: the astronaut's label covers the pair. */
export function AsciiMug({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <AsciiDrawing Svg={CoffeeMugSvg} animate={animateMug} cols={18} rows={18} sharpness={4} />
    </div>
  );
}

type DrawingProps = {
  Svg: (props: ToonSvgProps) => JSX.Element;
  /** Fills a paused timeline with the drawing's loop. Must keep the same identity between renders. */
  animate?: (svg: SVGSVGElement, tl: gsap.core.Timeline) => void;
  /** Glyph grid. Its shape should match the drawing's viewBox. */
  cols?: number;
  rows?: number;
  /** Backing-store multiplier, for a drawing that will be scaled up on screen. */
  sharpness?: number;
  /**
   * How far each cell's brightness is nudged, by an amount fixed per cell, before its
   * glyph is picked. Above 0 a soft gradient breaks up into scattered dots instead of
   * stepping down in clean bands. Solid parts of a drawing are left alone.
   */
  grain?: number;
};

/**
 * An SVG drawing as dot-ASCII. The original SVG stays mounted off screen
 * with its animation loop running. A dozen times a second it is serialised,
 * drawn small, and every cell's brightness is turned into one of a few dot
 * glyphs set in the mono font. One renderer serves every drawing.
 *
 * Only what is in the SVG's own attributes and inline styles reaches the
 * glyphs: stylesheet rules do not survive serialising. Nothing is captured
 * while the canvas is hidden.
 */
export function AsciiDrawing({ Svg, animate, cols = 72, rows = 54, sharpness = 1, grain = 0 }: DrawingProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!svg || !canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const style = getComputedStyle(canvas);
    const colour = style.getPropertyValue("--dot").trim() || "#ffffff";
    const family = style.getPropertyValue("--font-code").trim() || "monospace";

    const timeline = gsap.timeline({ paused: reduced });
    animate?.(svg, timeline);

    const small = document.createElement("canvas");
    small.width = cols;
    small.height = rows;
    const reader = small.getContext("2d", { willReadFrequently: true });
    const serializer = new XMLSerializer();
    const pointer = { col: -999, row: -999 };
    let cells: Uint8ClampedArray | null = null;
    let busy = false;
    let live = true;
    let cell = 1;

    const resize = () => {
      const dpr = Math.min(Math.min(window.devicePixelRatio || 1, 2) * sharpness, 4);
      const width = canvas.clientWidth;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(((width * rows) / cols) * dpr);
      cell = canvas.width / cols;
      paint();
    };

    const paint = () => {
      if (!cells) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = colour;
      ctx.font = `${(cell * 1.25).toFixed(2)}px ${family}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const i = (row * cols + col) * 4;
          // The drawings are saturated colours, so take the strongest channel
          // rather than true luminance or the purples would vanish.
          let value = (Math.max(cells[i], cells[i + 1], cells[i + 2]) / 255) * (cells[i + 3] / 255);
          // Only where the drawing is see-through (a beam of light, say), in full once it is a quarter clear.
          const clear = Math.min(1, (1 - cells[i + 3] / 255) * 4);
          if (grain && value > 0 && clear > 0) {
            const noise = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453;
            value = Math.min(1, value + (noise - Math.floor(noise) - 0.5) * grain * clear);
          }
          if (value < 0.07) continue;
          const glyph = GLYPHS[Math.min(GLYPHS.length - 1, 1 + Math.floor(value * (GLYPHS.length - 1)))];
          const dc = col - pointer.col;
          const dr = row - pointer.row;
          const light = Math.exp(-(dc * dc + dr * dr) / (LIGHT_CELLS * LIGHT_CELLS));
          ctx.globalAlpha = Math.min(1, 0.4 + value * 0.35 + light * 0.7);
          ctx.fillText(glyph, (col + 0.5) * cell, (row + 0.5) * cell);
        }
      }
      ctx.globalAlpha = 1;
    };

    /** Snapshot the live SVG into the small canvas and repaint the glyphs. */
    const capture = async () => {
      if (busy || !reader || document.hidden) return;
      if (cells && canvas.checkVisibility && !canvas.checkVisibility({ visibilityProperty: true })) return;
      busy = true;
      const url = URL.createObjectURL(new Blob([serializer.serializeToString(svg)], { type: "image/svg+xml" }));
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        if (!live) return;
        reader.clearRect(0, 0, cols, rows);
        reader.drawImage(image, 0, 0, cols, rows);
        cells = reader.getImageData(0, 0, cols, rows).data;
        paint();
      } catch {
        // A frame that fails to decode is skipped; the next one replaces it.
      } finally {
        URL.revokeObjectURL(url);
        busy = false;
      }
    };

    const onMove = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.col = ((event.clientX - box.left) / box.width) * cols;
      pointer.row = ((event.clientY - box.top) / box.height) * rows;
      if (reduced) paint();
    };

    const sizes = new ResizeObserver(resize);
    sizes.observe(canvas);
    window.addEventListener("pointermove", onMove);
    void capture();
    const timer = reduced ? 0 : window.setInterval(capture, 1000 / FPS);

    return () => {
      live = false;
      window.clearInterval(timer);
      sizes.disconnect();
      window.removeEventListener("pointermove", onMove);
      timeline.kill();
    };
  }, [Svg, animate, cols, rows, sharpness, grain]);

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" className="block w-full" style={{ aspectRatio: `${cols} / ${rows}` }} />
      {/* The source drawing: animated, never seen. Kept in the page so its loop runs. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-[9999px] top-0 w-[288px] overflow-hidden"
        style={{ aspectRatio: `${cols} / ${rows}` }}
      >
        <Svg ref={svgRef} />
      </div>
    </>
  );
}
