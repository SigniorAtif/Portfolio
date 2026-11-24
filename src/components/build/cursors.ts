// The agents' cursors. Their five colours belong to the cursors alone; every
// mark they leave on the page uses the site's own tokens.

export type Shape = "arrow" | "cross" | "beam";

/** Pink, teal, yellow, purple, light blue. */
export const CURSOR_COLOURS = ["#f4a7c7", "#7fd6c2", "#f2d675", "#b9a3f0", "#97c6f2"] as const;

/** How many agents work the page. A screen of boxes keeps about ten of them busy. */
export const CURSOR_COUNT = 14;

// Each shape is drawn twice: a ground-coloured outline under the colour, so a
// cursor reads on any part of the page. Every hot spot sits on the element's origin.
const outline = 'style="stroke:var(--ground)"';

const ARROW = `<svg data-shape="arrow" width="18" height="22" viewBox="0 0 18 22" style="left:-1.5px;top:-1.5px"><path d="M1.5 1.5v16.2l4.3-4.1 2.9 6.6 2.9-1.3-2.9-6.5h6z" fill="currentColor" stroke-width="1.5" stroke-linejoin="round" ${outline}/></svg>`;

const CROSS = `<svg data-shape="cross" width="21" height="21" viewBox="0 0 21 21" style="left:-10.5px;top:-10.5px" fill="none" stroke-linecap="round"><path d="M10.5 1v19M1 10.5h19" stroke-width="3.5" ${outline}/><path d="M10.5 1v19M1 10.5h19" stroke="currentColor" stroke-width="1.5"/></svg>`;

const BEAM = `<svg data-shape="beam" width="11" height="20" viewBox="0 0 11 20" style="left:-5.5px;top:-10px" fill="none" stroke-linecap="round"><path d="M2 1.5c2 0 3.5.6 3.5 2v13c0 1.4-1.5 2-3.5 2M9 1.5c-2 0-3.5.6-3.5 2v13c0 1.4 1.5 2 3.5 2M3.5 10h4" stroke-width="3.2" ${outline}/><path d="M2 1.5c2 0 3.5.6 3.5 2v13c0 1.4-1.5 2-3.5 2M9 1.5c-2 0-3.5.6-3.5 2v13c0 1.4 1.5 2 3.5 2M3.5 10h4" stroke="currentColor" stroke-width="1.4"/></svg>`;

/**
 * One cursor element, hidden until it is given work. It carries a name tag in
 * its colour that says which part of the page its agent is working on.
 */
export function makeCursor(index: number): { el: HTMLElement; tag: HTMLElement } {
  const el = document.createElement("div");
  el.className = "build-cursor";
  el.dataset.shape = "arrow";
  el.style.setProperty("--c", CURSOR_COLOURS[index % CURSOR_COLOURS.length]);
  el.innerHTML = ARROW + CROSS + BEAM;
  const tag = document.createElement("span");
  tag.className = "build-tag";
  el.append(tag);
  return { el, tag };
}
