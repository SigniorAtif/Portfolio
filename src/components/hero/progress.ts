/** `--p` past which the framed layout's text and links are live. */
export const FRAMED_AT = 0.6;

/**
 * How far the hero has closed: `p` runs 0 (full screen) to 1 (framed), and
 * `past` is how many pixels the page has scrolled beyond the end of the pin.
 */
export function heroProgress(track: HTMLElement): { p: number; past: number } {
  const travel = track.offsetHeight - window.innerHeight;
  const scrolled = -track.getBoundingClientRect().top;
  const raw = Math.min(Math.max(scrolled / travel, 0), 1);
  return { p: raw * raw * (3 - 2 * raw), past: scrolled - travel };
}
