import { gsap } from "@/lib/gsap";
import { DUR, EASE, IN_VIEW, STAGGER, staggerFor } from "@/lib/motion";
import { CURSOR_COUNT, makeCursor, type Shape } from "./cursors";

// The conductor runs the agent-cursor build on a page: a block is put
// together box by box by a flock of cursors as it enters the screen.
//
// Every build is a timeline fixed when its block enters, and whatever shows
// on screen is that timeline sampled at the current time. Nothing queues and
// nothing depends on the scroll: a block's state is a function of how long
// ago it entered. The cursors are a layer on top, lent to whichever work is
// running and sent off the edge once the screen is built.

export type Mode = "build" | "fade" | "still";

/** Where the cursors run: a mouse, room for a whole row, and motion allowed. */
const BUILD_QUERY = "(hover: hover) and (pointer: fine) and (min-width: 900px)";

function modeNow(): Mode {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "still";
  return window.matchMedia(BUILD_QUERY).matches ? "build" : "fade";
}

/** Seconds. */
const T = {
  arrive: 0.28, // a cursor's flight to its box's corner
  drag: 0.3, // the marquee, corner to corner
  fill: 0.3, // the box's content fades in
  release: 0.14, // the marquee and its handles go
  box: 0.09, // between the boxes of one block
  block: 0.15, // between blocks that enter together
  open: 0.1, // after the page opens, for blocks already on screen
  linger: 1, // idle cursors wait this long before they leave
  leave: 0.55, // a cursor's flight off the edge
  late: 0.18, // the shortest flight, for a cursor sent to work already under way
} as const;

type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };

/** A piece of a build: from `at` for `dur` seconds, drawn by `apply` at progress 0 to 1. */
type Step = {
  at: number;
  dur: number;
  /** Draws the step at progress `p`. At 1 it leaves the page as it is without the build. */
  apply: (p: number) => void;
  /** Where the cursor is during the step, in block coordinates. Steps without one need no cursor. */
  point?: (p: number) => Point;
  shape?: Shape;
};

/** One agent's work: a cursor flies to `first`, then runs the steps that have a point. */
type Job = {
  block: Block;
  start: number;
  steps: Step[];
  last: number[];
  /** Where the cursor has to be when its first step starts. */
  first: Point;
  /** When the cursor is free again. */
  free: number;
  end: number;
  cursor: Cursor | null;
  /** True once the job has been offered a cursor, whether or not one was free. */
  manned: boolean;
};

type Block = {
  el: HTMLElement;
  /** Fade mode: animate the boxes one after another instead of the block. */
  each: boolean;
  mode: Mode;
  state: "pending" | "running" | "done";
  /** The block's offset in the cursor layer, fixed when it starts. */
  origin: Point;
  jobs: Job[];
  end: number;
  overlay: HTMLElement | null;
  timer: number;
  tween: gsap.core.Animation | null;
  /** Ends the build at once, when keyboard focus walks into it. */
  onFocus: () => void;
};

type Cursor = {
  el: HTMLElement;
  pos: Point;
  shape: Shape;
  shown: boolean;
  job: Job | null;
  /** The flight to the current job: from here, starting then, for this long. */
  flight: { from: Point; at: number; dur: number } | null;
  leaving: { from: Point; to: Point; at: number } | null;
  drawn: string;
};

const now = () => performance.now() / 1000;
const clamp01 = (v: number) => (v <= 0 ? 0 : v >= 1 ? 1 : v);
const easeOut = (p: number) => 1 - (1 - p) ** 3;
const easeInOut = (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);

/** A shallow arc from `a` to `b`, so a flight reads as a hand moving rather than a slide. */
function arc(a: Point, b: Point, p: number, bend: number): Point {
  const mx = (a.x + b.x) / 2 - (b.y - a.y) * bend;
  const my = (a.y + b.y) / 2 + (b.x - a.x) * bend;
  const q = 1 - p;
  return { x: q * q * a.x + 2 * q * p * mx + p * p * b.x, y: q * q * a.y + 2 * q * p * my + p * p * b.y };
}

function relative(el: Element, to: DOMRect): Rect {
  const r = el.getBoundingClientRect();
  return { x: r.left - to.left, y: r.top - to.top, w: r.width, h: r.height };
}

/** The marquee a box is dragged out with: a ruled rectangle, four handles and a size pill. */
function marquee(overlay: HTMLElement) {
  const el = document.createElement("div");
  el.className = "build-marquee";
  el.innerHTML = "<i></i><i></i><i></i><i></i>";
  const size = document.createElement("span");
  size.className = "build-size";
  el.append(size);
  overlay.append(el);
  let said = "";
  return {
    draw(r: Rect, p: number) {
      const w = r.w * p;
      const h = r.h * p;
      el.style.visibility = p > 0 ? "visible" : "hidden";
      el.style.transform = `translate(${r.x}px, ${r.y}px)`;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      el.style.setProperty("--w", `${w}px`);
      el.style.setProperty("--h", `${h}px`);
      const says = `${Math.round(w)} × ${Math.round(h)}`;
      if (says !== said) size.textContent = said = says;
    },
    fade(alpha: number) {
      el.style.opacity = alpha >= 1 ? "" : String(alpha);
    },
  };
}

/** The frame of a block: the outline and the hairlines between its boxes. */
function hideFrame(frame: HTMLElement) {
  frame.style.transition = "none";
  frame.style.borderColor = "transparent";
  frame.style.backgroundColor = "transparent";
}

function showFrame(frame: HTMLElement, p: number) {
  if (p >= 1) {
    frame.style.removeProperty("border-color");
    frame.style.removeProperty("background-color");
    frame.style.removeProperty("transition");
    return;
  }
  const mix = `color-mix(in srgb, var(--line) ${Math.round(p * 100)}%, transparent)`;
  frame.style.borderColor = mix;
  frame.style.backgroundColor = mix;
}

function boxesOf(el: HTMLElement): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>("[data-box]"));
}

function frameOf(el: HTMLElement): HTMLElement | null {
  return el.querySelector<HTMLElement>("[data-frame]");
}

export class Conductor {
  private blocks = new Map<HTMLElement, Block>();
  private cursors: Cursor[] = [];
  private layer: HTMLElement | null = null;
  private opened = false;
  private entering: IntersectionObserver | null = null;
  private ticking = false;
  private quietSince = -1;
  private readonly tick = () => this.frame();
  private readonly onResize = () => {
    for (const block of this.blocks.values()) if (block.state === "running") this.finish(block);
  };

  /** Takes the layer the cursors fly in. Called once the page has mounted. */
  attach(layer: HTMLElement) {
    this.layer = layer;
    this.cursors = Array.from({ length: CURSOR_COUNT }, (_, index) => {
      const el = makeCursor(index);
      layer.append(el);
      return { el, pos: { x: 0, y: 0 }, shape: "arrow" as Shape, shown: false, job: null, flight: null, leaving: null, drawn: "" };
    });
    window.addEventListener("resize", this.onResize);
  }

  /** Hides a block until it enters. Under reduced motion it is simply there. */
  register(el: HTMLElement, { each = false }: { each?: boolean } = {}) {
    const block: Block = {
      el,
      each,
      mode: modeNow(),
      state: "pending",
      origin: { x: 0, y: 0 },
      jobs: [],
      end: 0,
      overlay: null,
      timer: 0,
      tween: null,
      onFocus: () => this.finish(block),
    };
    this.blocks.set(el, block);
    if (block.mode === "still") {
      block.state = "done";
      return;
    }
    if (block.mode === "fade") {
      gsap.set(this.fadeTargets(block), { opacity: 0 });
    } else {
      for (const box of boxesOf(el)) box.style.opacity = "0";
      const frame = frameOf(el);
      if (frame) hideFrame(frame);
    }
    el.addEventListener("focusin", block.onFocus);
    if (this.opened) this.watch([block]);
  }

  unregister(el: HTMLElement) {
    const block = this.blocks.get(el);
    if (!block) return;
    this.blocks.delete(el);
    this.finish(block);
    el.removeEventListener("focusin", block.onFocus);
  }

  /** The page is open: start what is on screen, and wait for the rest to enter. */
  open() {
    if (this.opened) return;
    this.opened = true;
    this.entering = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const block = this.blocks.get(entry.target as HTMLElement);
          if (block?.state === "pending") this.start(block, now());
        }
      },
      // A block enters when its top crosses the house reveal line.
      { rootMargin: `0px 0px -${Math.round((1 - IN_VIEW) * 100)}% 0px` },
    );
    this.watch([...this.blocks.values()]);
  }

  destroy() {
    for (const block of [...this.blocks.values()]) this.unregister(block.el);
    this.entering?.disconnect();
    this.entering = null;
    this.opened = false;
    this.stop();
    for (const cursor of this.cursors) cursor.el.remove();
    this.cursors = [];
    this.layer = null;
    window.removeEventListener("resize", this.onResize);
  }

  /** Blocks on screen when the page opens start with it, top to bottom; the rest wait to enter. */
  private watch(blocks: Block[]) {
    let order = 0;
    const at = now();
    for (const block of blocks) {
      if (block.state !== "pending") continue;
      const r = block.el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) this.start(block, at + T.open + order++ * T.block);
      else this.entering?.observe(block.el);
    }
  }

  private fadeTargets(block: Block): Element[] {
    return block.each ? boxesOf(block.el) : [block.el];
  }

  private start(block: Block, at: number) {
    this.entering?.unobserve(block.el);
    block.state = "running";
    // The window may have lost its mouse or its width since the block was hidden.
    if (block.mode === "build" && modeNow() !== "build") {
      for (const box of boxesOf(block.el)) box.style.removeProperty("opacity");
      const frame = frameOf(block.el);
      if (frame) showFrame(frame, 1);
      block.mode = "fade";
      gsap.set(this.fadeTargets(block), { opacity: 0 });
    }
    if (block.mode === "fade") {
      const targets = this.fadeTargets(block);
      block.tween = gsap.fromTo(
        targets,
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: DUR.line,
          ease: EASE.out,
          stagger: block.each ? staggerFor(targets.length, STAGGER.card) : 0,
          delay: Math.max(0, at - now()),
          clearProps: "transform,opacity",
          onComplete: () => {
            block.state = "done";
          },
        },
      );
      return;
    }
    this.plan(block, at);
    this.run();
  }

  /** Lays out the block's timeline: one job per box, plus the frame. */
  private plan(block: Block, at: number) {
    const layer = this.layer!.getBoundingClientRect();
    const box = block.el.getBoundingClientRect();
    block.origin = { x: box.left - layer.left, y: box.top - layer.top };
    const overlay = document.createElement("div");
    overlay.className = "build-overlay";
    overlay.setAttribute("aria-hidden", "true");
    block.el.append(overlay);
    block.overlay = overlay;

    const jobs: Job[] = boxesOf(block.el).map((el, index) => {
      const r = relative(el, box);
      const start = at + index * T.box;
      const drawn = marquee(overlay);
      const dragged = start + T.arrive;
      const filled = dragged + T.drag;
      const released = filled + T.fill;
      return this.job(block, start, { x: r.x, y: r.y }, [
        {
          at: dragged,
          dur: T.drag,
          shape: "cross",
          apply: (p) => drawn.draw(r, easeOut(p)),
          point: (p) => ({ x: r.x + r.w * easeOut(p), y: r.y + r.h * easeOut(p) }),
        },
        {
          at: filled,
          dur: T.fill,
          apply: (p) => {
            el.style.opacity = p >= 1 ? "" : String(p);
          },
        },
        { at: released, dur: T.release, apply: (p) => drawn.fade(1 - p) },
      ]);
    });

    // The hairlines are the frame's own colour showing between the boxes, so the frame
    // comes in once every box is filled; any earlier and the empty boxes show it whole.
    const frame = frameOf(block.el);
    if (frame) {
      const filled = Math.max(...jobs.map((job) => job.end)) - T.release;
      jobs.push(this.job(block, filled, null, [{ at: filled, dur: T.release, apply: (p) => showFrame(frame, p) }]));
    }

    block.jobs = jobs;
    block.end = Math.max(...jobs.map((job) => job.end));
    block.timer = window.setTimeout(() => this.finish(block), Math.max(0, block.end - now()) * 1000 + 50);
  }

  private job(block: Block, start: number, first: Point | null, steps: Step[]): Job {
    const manned = steps.filter((step) => step.point);
    const free = manned.length ? Math.max(...manned.map((step) => step.at + step.dur)) : start;
    return {
      block,
      start,
      steps,
      last: steps.map(() => -1),
      first: first ?? { x: 0, y: 0 },
      free,
      end: Math.max(...steps.map((step) => step.at + step.dur)),
      cursor: null,
      manned: !first,
    };
  }

  /** Puts a block in its finished state now: the page exactly as it is without the build. */
  private finish(block: Block) {
    window.clearTimeout(block.timer);
    if (block.tween) {
      block.tween.progress(1);
      block.tween = null;
    } else if (block.state === "pending" && block.mode === "fade") {
      gsap.set(this.fadeTargets(block), { clearProps: "opacity" });
    } else if (block.mode === "build") {
      for (const box of boxesOf(block.el)) box.style.removeProperty("opacity");
      const frame = frameOf(block.el);
      if (frame) showFrame(frame, 1);
      for (const job of block.jobs) {
        job.steps.forEach((step, index) => {
          if (job.last[index] !== 1) step.apply(1);
          job.last[index] = 1;
        });
        if (job.cursor) this.release(job.cursor);
      }
    }
    block.overlay?.remove();
    block.overlay = null;
    block.jobs = [];
    block.state = "done";
    for (const el of [...boxesOf(block.el), frameOf(block.el)]) if (el && !el.getAttribute("style")) el.removeAttribute("style");
    this.entering?.unobserve(block.el);
  }

  private release(cursor: Cursor) {
    if (cursor.job) cursor.job.cursor = null;
    cursor.job = null;
    cursor.flight = null;
    cursor.shape = "arrow";
  }

  private run() {
    if (this.ticking) return;
    this.ticking = true;
    gsap.ticker.add(this.tick);
  }

  private stop() {
    if (!this.ticking) return;
    this.ticking = false;
    gsap.ticker.remove(this.tick);
  }

  private frame() {
    const t = now();
    let busy = false;
    let waiting = false;

    for (const block of this.blocks.values()) {
      if (block.state !== "running" || block.mode !== "build") continue;
      busy = true;
      for (const job of block.jobs) {
        job.steps.forEach((step, index) => {
          const p = step.dur > 0 ? clamp01((t - step.at) / step.dur) : t >= step.at ? 1 : 0;
          if (p !== job.last[index]) {
            step.apply(p);
            job.last[index] = p;
          }
        });
        if (t < job.free) {
          waiting = true;
          if (!job.manned && t >= job.start) this.man(job, t);
        }
      }
    }

    // The screen is built: after a moment the idle cursors fly off the nearest side.
    if (waiting) this.quietSince = -1;
    else if (this.quietSince < 0) this.quietSince = t;
    const leave = !waiting && t - this.quietSince >= T.linger;
    const view = leave ? this.view() : null;

    this.cursors.forEach((cursor, index) => {
      if (cursor.job) this.steer(cursor, t);
      else if (cursor.shown && !cursor.leaving && view) {
        const toRight = cursor.pos.x > (view.left + view.right) / 2;
        cursor.leaving = {
          from: { ...cursor.pos },
          to: { x: toRight ? view.right + 32 : view.left - 32, y: cursor.pos.y + (index % 2 ? 40 : -40) },
          at: t + (index % 6) * 0.05,
        };
      }
      if (cursor.leaving) {
        const p = clamp01((t - cursor.leaving.at) / T.leave);
        cursor.pos = arc(cursor.leaving.from, cursor.leaving.to, easeInOut(p), 0.12);
        if (p >= 1) {
          cursor.leaving = null;
          cursor.shown = false;
        }
      }
      if (cursor.shown) busy = true;
      this.draw(cursor);
    });

    if (!busy) this.stop();
  }

  /** The viewport's edges in layer coordinates. */
  private view() {
    const layer = this.layer!.getBoundingClientRect();
    return { left: -layer.left, right: window.innerWidth - layer.left, top: -layer.top, bottom: window.innerHeight - layer.top };
  }

  /** Lends a job the nearest idle cursor, or one from off the edge, or none if all are busy. */
  private man(job: Job, t: number) {
    job.manned = true;
    const { origin } = job.block;
    const target = { x: origin.x + job.first.x, y: origin.y + job.first.y };
    let best: Cursor | null = null;
    let bestDistance = Infinity;
    for (const cursor of this.cursors) {
      if (cursor.job || !cursor.shown) continue;
      const distance = Math.hypot(cursor.pos.x - target.x, cursor.pos.y - target.y);
      if (distance < bestDistance) {
        best = cursor;
        bestDistance = distance;
      }
    }
    if (!best) {
      best = this.cursors.find((cursor) => !cursor.shown) ?? null;
      if (!best) return;
      const view = this.view();
      const fromRight = target.x > (view.left + view.right) / 2;
      best.pos = { x: fromRight ? view.right + 24 : view.left - 24, y: target.y + ((this.cursors.indexOf(best) % 5) - 2) * 36 };
      best.shown = true;
    }
    best.leaving = null;
    best.job = job;
    job.cursor = best;
    const firstAt = Math.min(...job.steps.filter((step) => step.point).map((step) => step.at));
    best.flight = { from: { ...best.pos }, at: t, dur: Math.max(T.late, firstAt - t) };
  }

  /** Moves a working cursor: in flight to its job, then along whichever step it is on. */
  private steer(cursor: Cursor, t: number) {
    const job = cursor.job!;
    if (t >= job.free) {
      this.release(cursor);
      return;
    }
    let point = job.first;
    let shape: Shape = "arrow";
    for (const step of job.steps) {
      if (!step.point || t < step.at) continue;
      point = step.point(clamp01((t - step.at) / step.dur));
      shape = step.shape ?? "arrow";
    }
    const target = { x: job.block.origin.x + point.x, y: job.block.origin.y + point.y };
    if (cursor.flight) {
      const p = clamp01((t - cursor.flight.at) / cursor.flight.dur);
      cursor.pos = arc(cursor.flight.from, target, easeInOut(p), 0.08);
      cursor.shape = "arrow";
      if (p >= 1) cursor.flight = null;
      return;
    }
    cursor.pos = target;
    cursor.shape = shape;
  }

  private draw(cursor: Cursor) {
    const drawn = cursor.shown ? `${cursor.pos.x.toFixed(1)},${cursor.pos.y.toFixed(1)},${cursor.shape}` : "";
    if (drawn === cursor.drawn) return;
    cursor.drawn = drawn;
    cursor.el.style.visibility = cursor.shown ? "visible" : "hidden";
    if (!cursor.shown) return;
    cursor.el.style.transform = `translate3d(${cursor.pos.x.toFixed(1)}px, ${cursor.pos.y.toFixed(1)}px, 0)`;
    cursor.el.dataset.shape = cursor.shape;
  }
}
