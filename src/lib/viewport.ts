"use client";

// The viewport height to lay the page out from: the small viewport, the
// height with a phone's address bar showing (CSS `100svh`).
//
// On a phone the address bar slides away as the page scrolls. That fires a
// resize and changes `window.innerHeight`, so anything sized from it moves
// mid-scroll and the page jumps. The small viewport stays put while the bar
// slides; it only changes when the window itself does (an orientation change,
// a desktop window resized). Listeners here hear only those changes.

type Listener = () => void;

let height = 0;
let width = 0;
let probe: HTMLElement | null = null;
const listeners = new Set<Listener>();

function measure(): number {
  if (!probe) {
    probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    // vh first: browsers without svh keep it and drop the declaration they cannot read.
    probe.style.cssText =
      "position:fixed;top:0;left:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none";
    document.body.appendChild(probe);
  }
  return probe.offsetHeight || window.innerHeight;
}

function onResize() {
  const nextHeight = measure();
  const nextWidth = window.innerWidth;
  if (nextHeight === height && nextWidth === width) return;
  height = nextHeight;
  width = nextWidth;
  for (const listener of [...listeners]) listener();
}

/** The small-viewport height in px. Steady while the address bar slides. */
export function viewportHeight(): number {
  if (!height) {
    height = measure();
    width = window.innerWidth;
  }
  return height;
}

/** Calls `listener` when the small-viewport height or the width changes, never for the address bar alone. */
export function onViewportChange(listener: Listener): () => void {
  viewportHeight();
  if (listeners.size === 0) window.addEventListener("resize", onResize);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("resize", onResize);
  };
}
