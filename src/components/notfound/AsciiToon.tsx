"use client";

import { useCallback, useEffect, useRef, type JSX } from "react";
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

type GridProps = {
  /** Glyph grid. Its shape should match the drawing's frame. */
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
  /**
   * For painted art, which sits in the mid tones and would come out as one grey mass:
   * the brightness that counts as black and the one that counts as white. What lies
   * between is stretched to the full range of glyphs.
   */
  levels?: [black: number, white: number];
};

/** A moving picture the dots are read from. */
export type DotSource = {
  /** Resolves once there is something to draw. Leave out when that is at once. */
  ready?: Promise<unknown>;
  /** Puts the current frame on the small canvas, one pixel per glyph. */
  draw: (reader: CanvasRenderingContext2D, cols: number, rows: number) => Promise<void> | void;
  /**
   * For a picture that can come out of its dots. `whole` says whether a cell shows the
   * picture itself: it is asked for every cell on every frame, with the cell's place in the
   * frame (0 to 1 each way) and a number from 0 to 1 that is fixed for that cell, for
   * scattering. `full` paints the picture at the size given, to fill those cells.
   */
  whole?: (x: number, y: number, rank: number) => boolean;
  full?: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  stop: () => void;
};

type DotCanvasProps = GridProps & {
  /**
   * Starts the picture, standing still when `reduced`. Null when it cannot start.
   * Must keep the same identity between renders: a new one restarts the picture.
   */
  open: (reduced: boolean) => DotSource | null;
};

/**
 * A picture as dot-ASCII. A dozen times a second the source draws itself
 * small, and every cell's brightness is turned into one of a few dot glyphs
 * set in the mono font. Nothing is captured while the canvas is hidden.
 */
export function DotCanvas({ open, cols = 72, rows = 54, sharpness = 1, grain = 0, levels }: DotCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [black, white] = levels ?? [undefined, 1];

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const style = getComputedStyle(canvas);
    const colour = style.getPropertyValue("--dot").trim() || "#ffffff";
    const family = style.getPropertyValue("--font-code").trim() || "monospace";

    const source = open(reduced);
    if (!source) return;

    const small = document.createElement("canvas");
    small.width = cols;
    small.height = rows;
    const reader = small.getContext("2d", { willReadFrequently: true });
    const pointer = { col: -999, row: -999 };

    // The picture itself, for the cells that have stopped being dots, and the mask that cuts it to them.
    const { full, whole } = source;
    const layer = full ? document.createElement("canvas") : null;
    const layerCtx = layer?.getContext("2d");
    const mask = document.createElement("canvas");
    mask.width = cols;
    mask.height = rows;
    const maskCtx = mask.getContext("2d");
    const ranks = Float32Array.from({ length: cols * rows }, (_, i) => {
      const noise = Math.sin((i % cols) * 39.3468 + Math.floor(i / cols) * 11.135) * 43758.5453;
      return noise - Math.floor(noise);
    });
    const cut = maskCtx?.createImageData(cols, rows);
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
      if (layer) {
        layer.width = canvas.width;
        layer.height = canvas.height;
      }
      paint();
    };

    const paint = () => {
      // Squeezed to nothing as its page leaves: there is no canvas to draw on.
      if (!cells || !canvas.width || !canvas.height) return;
      let any = false;
      let all = true;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = colour;
      ctx.font = `${(cell * 1.25).toFixed(2)}px ${family}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const i = (row * cols + col) * 4;
          if (whole && cut) {
            const out = whole((col + 0.5) / cols, (row + 0.5) / rows, ranks[row * cols + col]);
            cut.data[i + 3] = out ? 255 : 0;
            if (out) any = true;
            else all = false;
            if (out) continue;
          }
          // The drawings are saturated colours, so take the strongest channel
          // rather than true luminance or the purples would vanish.
          let tone = Math.max(cells[i], cells[i + 1], cells[i + 2]) / 255;
          // The darkest paint still gets a small dot, so the outline stays whole.
          if (black !== undefined) tone = Math.max(0.3, Math.min(1, (tone - black) / (white - black)));
          let value = tone * (cells[i + 3] / 255);
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

      if (!full || !layer || !layerCtx || !maskCtx || !cut || !any) return;
      full(layerCtx, layer.width, layer.height);
      if (!all) {
        maskCtx.putImageData(cut, 0, 0);
        layerCtx.save();
        layerCtx.globalCompositeOperation = "destination-in";
        layerCtx.imageSmoothingEnabled = false;
        layerCtx.drawImage(mask, 0, 0, layer.width, layer.height);
        layerCtx.restore();
      }
      ctx.drawImage(layer, 0, 0);
    };

    /** Have the source draw its current frame small, and repaint the glyphs from it. */
    const capture = async () => {
      if (busy || !reader || document.hidden) return;
      if (cells && canvas.checkVisibility && !canvas.checkVisibility({ visibilityProperty: true })) return;
      busy = true;
      try {
        await source.draw(reader, cols, rows);
        if (!live) return;
        cells = reader.getImageData(0, 0, cols, rows).data;
        paint();
      } catch {
        // A frame that fails to draw is skipped; the next one replaces it.
      } finally {
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
    void (source.ready ?? Promise.resolve()).then(capture, () => {});
    // A picture that can come out of its dots keeps repainting even when it stands still.
    const timer = reduced && !whole ? 0 : window.setInterval(capture, 1000 / FPS);

    return () => {
      live = false;
      window.clearInterval(timer);
      sizes.disconnect();
      window.removeEventListener("pointermove", onMove);
      source.stop();
    };
  }, [open, cols, rows, sharpness, grain, black, white]);

  return <canvas ref={canvasRef} aria-hidden="true" className="block w-full" style={{ aspectRatio: `${cols} / ${rows}` }} />;
}

type DrawingProps = GridProps & {
  Svg: (props: ToonSvgProps) => JSX.Element;
  /** Fills a paused timeline with the drawing's loop. Must keep the same identity between renders. */
  animate?: (svg: SVGSVGElement, tl: gsap.core.Timeline) => void;
};

/**
 * An SVG drawing as dot-ASCII. The original SVG stays mounted off screen
 * with its animation loop running, and is serialised for every frame. One
 * renderer serves every drawing.
 *
 * Only what is in the SVG's own attributes and inline styles reaches the
 * glyphs: stylesheet rules do not survive serialising.
 */
export function AsciiDrawing({ Svg, animate, cols = 72, rows = 54, sharpness, grain }: DrawingProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const open = useCallback(
    (reduced: boolean): DotSource | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const timeline = gsap.timeline({ paused: reduced });
      animate?.(svg, timeline);
      const serializer = new XMLSerializer();
      return {
        async draw(reader, width, height) {
          const url = URL.createObjectURL(new Blob([serializer.serializeToString(svg)], { type: "image/svg+xml" }));
          try {
            const image = new Image();
            image.src = url;
            await image.decode();
            reader.clearRect(0, 0, width, height);
            reader.drawImage(image, 0, 0, width, height);
          } finally {
            URL.revokeObjectURL(url);
          }
        },
        stop: () => timeline.kill(),
      };
    },
    // A new drawing is a new SVG element behind the same ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Svg, animate],
  );

  return (
    <>
      <DotCanvas open={open} cols={cols} rows={rows} sharpness={sharpness} grain={grain} />
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
