import type { JSX, Ref } from "react";

export type ToonId = "ufo" | "astronaut" | "dino";

export type ToonSvgProps = { ref?: Ref<SVGSVGElement> };

/**
 * One character from the old portfolio. The SVG is the original drawing; its
 * `viewBox` is the stage the dots are sampled from, 4:3 to match the glyph
 * grid and wider than the art where the loop travels.
 */
export type Toon = {
  id: ToonId;
  /** Read out in place of the drawing. */
  label: string;
  Svg: (props: ToonSvgProps) => JSX.Element;
  /** Glyph rows, when the drawing's frame is not the usual 4:3 (54 rows). */
  rows?: number;
  /** Breaks soft gradients into scattered dots; see the renderer. */
  grain?: number;
  /** Fills a paused timeline with the looping animation. Look parts up inside `svg`. */
  animate: (svg: SVGSVGElement, tl: gsap.core.Timeline) => void;
};

/** Repeats forever, back and forth: the loop every toon is built from. */
export const LOOP = { repeat: -1, yoyo: true } as const;
export const LOOP_EASE_IN_OUT = { ...LOOP, ease: "power2.inOut" } as const;
export const LOOP_ELASTIC_OUT = { ...LOOP, ease: "elastic.out(1, 0.1)" } as const;

/** Whole number between min and max, inclusive. Only call from client code after mount. */
export function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** The part with this class inside the toon. */
export function part(svg: SVGSVGElement, name: string): SVGElement {
  const found = svg.querySelector<SVGElement>(`.${name}`);
  if (!found) throw new Error(`toon part .${name} missing`);
  return found;
}
