// The house motion values. The same numbers live in globals.css as custom
// properties; change both together.

/** Cubic-bezier control points, shared by the CSS tokens and the GSAP eases. */
export const BEZIER = {
  out: "0.16,1,0.3,1", // expo-out, about 90% of reveals
  inOut: "0.87,0,0.13,1", // big clip wipes only
  hover: "0.25,1,0.5,1", // quart-out
} as const;

/** Names of the GSAP CustomEases registered in `@/lib/gsap`. */
export const EASE = {
  out: "house.out",
  inOut: "house.inOut",
  hover: "house.hover",
} as const;

/** Seconds. */
export const DUR = {
  press: 0.06,
  hover: 0.25,
  ui: 0.4,
  rise: 0.9,
  line: 1,
  wipe: 1.4,
} as const;

/** Seconds between siblings. A whole group never staggers for longer than `max`. */
export const STAGGER = {
  word: 0.04,
  line: 0.1,
  chip: 0.03,
  card: 0.2,
  max: 0.6,
} as const;

/** One-shot reveals fire when the block's top crosses this share of the viewport height. */
export const IN_VIEW = 0.78;

/** Per-sibling delay that keeps the whole group inside `STAGGER.max`. */
export function staggerFor(count: number, each: number): number {
  return count > 1 ? Math.min(each, STAGGER.max / (count - 1)) : 0;
}

export function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
