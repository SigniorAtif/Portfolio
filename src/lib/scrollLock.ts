// Holds the page still while a timed sequence plays. Smooth scrolling is
// stopped through the Lenis instance that SmoothScroll registers here; native
// scrolling is stopped by swallowing the events that would cause it, so the
// scrollbar stays and nothing shifts sideways.

type Stoppable = { stop: () => void; start: () => void; scrollTo: (target: number, options?: { immediate?: boolean; force?: boolean }) => void };

let lenis: Stoppable | null = null;
let locked = false;

const SCROLL_KEYS = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "]);

const swallow = (event: Event) => {
  if (event.cancelable) event.preventDefault();
};
const swallowKey = (event: KeyboardEvent) => {
  if (SCROLL_KEYS.has(event.key) && !(event.target as HTMLElement | null)?.closest?.("input, textarea, select, [contenteditable]")) {
    event.preventDefault();
  }
};

/** Called by SmoothScroll with its instance, and with null when it goes away. */
export function registerLenis(instance: Stoppable | null) {
  lenis = instance;
  if (locked) instance?.stop();
}

/** Jump to a scroll position without easing, through Lenis when it is running. */
export function jumpTo(y: number) {
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
}

/** Glide to a scroll position, through Lenis when it is running. */
export function glideTo(y: number) {
  if (lenis) lenis.scrollTo(y);
  else window.scrollTo({ top: y, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

export function lockScroll() {
  if (locked) return;
  locked = true;
  lenis?.stop();
  window.addEventListener("wheel", swallow, { passive: false, capture: true });
  window.addEventListener("touchmove", swallow, { passive: false, capture: true });
  window.addEventListener("keydown", swallowKey, { capture: true });
}

export function unlockScroll() {
  if (!locked) return;
  locked = false;
  lenis?.start();
  window.removeEventListener("wheel", swallow, { capture: true });
  window.removeEventListener("touchmove", swallow, { capture: true });
  window.removeEventListener("keydown", swallowKey, { capture: true });
}
