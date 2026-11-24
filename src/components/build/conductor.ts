import { gsap } from "@/lib/gsap";
import { DUR, EASE, IN_VIEW, STAGGER, staggerFor } from "@/lib/motion";
import { CURSOR_COLOURS, CURSOR_COUNT, makeCursor, type Shape } from "./cursors";

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
  arrive: 0.24, // a cursor's flight to its box's corner
  drag: 0.26, // the marquee, corner to corner
  fill: 0.2, // the box itself fades in; its text is typed after
  release: 0.12, // the marquee and its handles go
  outline: 0.3, // a block's outline, corner to corner
  hop: 0.05, // a cursor's move to its next piece of work
  rule: 0.14, // a label's rule, end to end
  divider: 0.14, // a hairline between two boxes, end to end
  pick: 0.16, // a name held in its selection box
  show: 0.1, // links fade in
  typing: 110, // characters a second, before a long box is sped up to fit
  most: 1.2, // the longest a box may take, from its marquee starting out to its marquee gone
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
  apply: (p: number, job: Job) => void;
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
  /** False for work no cursor does, such as a fade. */
  needs: boolean;
};

type Block = {
  el: HTMLElement;
  /** On screen. Off it, the build's clock runs on but nothing is drawn and no cursor works it. */
  visible: boolean;
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
  colour: string;
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

/**
 * The marquee a box is dragged out with: a ruled rectangle, four handles and a
 * size pill. A "band" is the thin one a rule is dragged out with, and a
 * "hollow" one draws a frame's outline; neither has a pill, and a hollow one
 * has no tint, so the boxes under it keep their own.
 */
function marquee(overlay: HTMLElement, kind: "box" | "band" | "hollow" = "box") {
  const el = document.createElement("div");
  el.className = kind === "hollow" ? "build-marquee build-hollow" : "build-marquee";
  el.innerHTML = "<i></i><i></i><i></i><i></i>";
  const size = kind === "box" ? document.createElement("span") : null;
  if (size) {
    size.className = "build-size";
    el.append(size);
  }
  overlay.append(el);
  let said = "";
  return {
    /** Draws the marquee grown to `pw` of the rectangle's width and `ph` of its height. */
    draw(r: Rect, pw: number, ph = pw) {
      const w = r.w * pw;
      const h = r.h * ph;
      el.style.visibility = pw > 0 && ph > 0 ? "visible" : "hidden";
      el.style.transform = `translate(${r.x}px, ${r.y}px)`;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      el.style.setProperty("--w", `${w}px`);
      el.style.setProperty("--h", `${h}px`);
      const says = `${Math.round(w)} × ${Math.round(h)}`;
      if (size && says !== said) size.textContent = said = says;
    },
    fade(alpha: number) {
      el.style.opacity = alpha >= 1 ? "" : String(alpha);
    },
  };
}

/** A hairline between two boxes, in block coordinates. */
type Segment = { x: number; y: number; length: number; thickness: number; vertical: boolean };

/**
 * The hairlines of a frame: the gaps its colour shows through between the
 * boxes. Gaps on one line are joined, so a rule that crosses the frame is
 * drawn in one stroke, the way it reads.
 */
function dividers(rects: Rect[]): Segment[] {
  const found: Segment[] = [];
  for (const a of rects) {
    for (const b of rects) {
      const gapX = b.x - (a.x + a.w);
      const top = Math.max(a.y, b.y);
      const bottom = Math.min(a.y + a.h, b.y + b.h);
      if (gapX > 0.25 && gapX < 3 && bottom - top > 4) found.push({ x: a.x + a.w, y: top, length: bottom - top, thickness: gapX, vertical: true });
      const gapY = b.y - (a.y + a.h);
      const left = Math.max(a.x, b.x);
      const right = Math.min(a.x + a.w, b.x + b.w);
      if (gapY > 0.25 && gapY < 3 && right - left > 4) found.push({ x: left, y: a.y + a.h, length: right - left, thickness: gapY, vertical: false });
    }
  }
  const joined: Segment[] = [];
  for (const segment of found.sort((m, n) => Number(m.vertical) - Number(n.vertical) || (m.vertical ? m.x - n.x || m.y - n.y : m.y - n.y || m.x - n.x))) {
    const last = joined[joined.length - 1];
    const lead = (s: Segment) => (s.vertical ? s.y : s.x);
    const side = (s: Segment) => (s.vertical ? s.x : s.y);
    if (last && last.vertical === segment.vertical && Math.abs(side(last) - side(segment)) < 0.5 && lead(segment) <= lead(last) + last.length + 3) {
      last.length = Math.max(last.length, lead(segment) + segment.length - lead(last));
      continue;
    }
    joined.push({ ...segment });
  }
  return joined;
}

/** Draws a hairline in the frame's colour, grown to `p` of its length. */
function hairline(overlay: HTMLElement, s: Segment) {
  const el = document.createElement("div");
  el.className = "build-rule";
  // Placed by left and top, not a transform, so it snaps to the pixel the frame's own gap does.
  el.style.left = `${s.x}px`;
  el.style.top = `${s.y}px`;
  overlay.append(el);
  return (p: number) => {
    el.style.width = `${s.vertical ? s.thickness : s.length * p}px`;
    el.style.height = `${s.vertical ? s.length * p : s.thickness}px`;
  };
}

/** The band a rule is dragged out with: five pixels across, centred on the rule. */
function band(s: Segment): Rect {
  return s.vertical
    ? { x: s.x + s.thickness / 2 - 2.5, y: s.y, w: 5, h: s.length }
    : { x: s.x, y: s.y + s.thickness / 2 - 2.5, w: s.length, h: 5 };
}

/** Where the crosshair is while a rule is `p` of the way out. */
function along(s: Segment, p: number): Point {
  return s.vertical ? { x: s.x + s.thickness / 2, y: s.y + s.length * p } : { x: s.x + s.length * p, y: s.y + s.thickness / 2 };
}

const lerp = (a: Point, b: Point, p: number): Point => ({ x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p });

/** One line of laid-out text, relative to its element, with roughly how many characters it holds. */
type Line = { left: number; right: number; top: number; bottom: number; chars: number };

/**
 * The lines an element's text is laid out in, top to bottom. Each text node's
 * characters are shared among its line boxes by width, which is close enough
 * for a caret that steps a character at a time.
 */
function linesOf(el: HTMLElement): Line[] {
  const base = el.getBoundingClientRect();
  const pieces: Line[] = [];
  const range = document.createRange();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const count = node.data.trim().length;
    if (!count) continue;
    range.selectNodeContents(node);
    const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
    const width = rects.reduce((sum, r) => sum + r.width, 0);
    for (const r of rects) {
      pieces.push({
        left: r.left - base.left,
        right: r.right - base.left,
        top: r.top - base.top,
        bottom: r.bottom - base.top,
        chars: Math.max(1, Math.round((count * r.width) / width)),
      });
    }
  }
  pieces.sort((a, b) => a.top - b.top || a.left - b.left);
  const lines: Line[] = [];
  for (const piece of pieces) {
    const line = lines[lines.length - 1];
    const middle = (piece.top + piece.bottom) / 2;
    if (line && middle > line.top && middle < line.bottom) {
      line.left = Math.min(line.left, piece.left);
      line.right = Math.max(line.right, piece.right);
      line.top = Math.min(line.top, piece.top);
      line.bottom = Math.max(line.bottom, piece.bottom);
      line.chars += piece.chars;
    } else lines.push({ ...piece });
  }
  return lines;
}

/** How far outside its box a typed element's glyphs may reach and still show. */
const SPILL = 48;

/**
 * Types an element's text in place. The text is laid out from the start and
 * a clip shows it: every line above the caret, the current line up to it,
 * nothing below. The line being typed carries a selection, the caret takes
 * the cursor's colour, and at the end the clip, selection and caret go.
 */
function typer(overlay: HTMLElement, el: HTMLElement, at: Rect, lines: Line[]) {
  const mark = document.createElement("div");
  mark.className = "build-mark";
  const caret = document.createElement("div");
  caret.className = "build-caret";
  overlay.append(mark, caret);
  const total = lines.reduce((sum, line) => sum + line.chars, 0);

  /** Line index and caret x for progress `p`. */
  const place = (p: number) => {
    let typed = p * total;
    let index = 0;
    while (index < lines.length - 1 && typed >= lines[index].chars) typed -= lines[index++].chars;
    const line = lines[index];
    const done = Math.min(line.chars, Math.floor(typed));
    return { index, line, x: line.left + ((line.right - line.left) * done) / line.chars };
  };

  return {
    chars: total,
    apply(p: number, job: Job) {
      if (p >= 1 || !lines.length) {
        el.style.removeProperty("clip-path");
        mark.style.visibility = caret.style.visibility = "hidden";
        return;
      }
      const { index, line, x } = place(p);
      const top = index ? (lines[index - 1].bottom + line.top) / 2 : -SPILL;
      const bottom = index < lines.length - 1 ? (line.bottom + lines[index + 1].top) / 2 : at.h + SPILL;
      const right = at.w + SPILL;
      el.style.clipPath = `polygon(${-SPILL}px ${-SPILL}px, ${right}px ${-SPILL}px, ${right}px ${top}px, ${x}px ${top}px, ${x}px ${bottom}px, ${-SPILL}px ${bottom}px)`;
      const shown = p > 0 ? "visible" : "hidden";
      mark.style.visibility = caret.style.visibility = shown;
      // Moved by transform: a caret walking along a line is not a layout shift.
      const y = at.y + line.top;
      mark.style.transform = `translate(${at.x + line.left}px, ${y}px)`;
      mark.style.width = `${Math.max(0, x - line.left)}px`;
      mark.style.height = caret.style.height = `${line.bottom - line.top}px`;
      caret.style.transform = `translate(${at.x + x}px, ${y}px)`;
      caret.style.background = job.cursor?.colour ?? "var(--progress)";
    },
    /** Where the I-beam sits: just past the caret, on the line's middle. */
    point(p: number): Point {
      if (!lines.length) return { x: at.x, y: at.y };
      const { line, x } = place(p);
      return { x: at.x + x + 6, y: at.y + (line.top + line.bottom) / 2 };
    },
  };
}

/** The frame of a block: the outline and the hairlines between its boxes, hidden until it is built. */
function hideFrame(frame: HTMLElement) {
  frame.style.transition = "none";
  frame.style.borderColor = "transparent";
  frame.style.backgroundColor = "transparent";
}

function restoreFrame(frame: HTMLElement) {
  frame.style.removeProperty("border-color");
  frame.style.removeProperty("background-color");
  frame.style.removeProperty("transition");
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
  private seen: IntersectionObserver | null = null;
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
      return { el, colour: CURSOR_COLOURS[index % CURSOR_COLOURS.length], pos: { x: 0, y: 0 }, shape: "arrow" as Shape, shown: false, job: null, flight: null, leaving: null, drawn: "" };
    });
    window.addEventListener("resize", this.onResize);
    this.seen = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const block = this.blocks.get(entry.target as HTMLElement);
        if (block) this.see(block, entry.isIntersecting);
      }
    });
    for (const block of this.blocks.values()) if (block.mode === "build") this.seen.observe(block.el);
  }

  /** Hides a block until it enters. Under reduced motion it is simply there. */
  register(el: HTMLElement, { each = false }: { each?: boolean } = {}) {
    const block: Block = {
      el,
      visible: true,
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
    if (block.mode === "build") this.seen?.observe(el);
    if (this.opened) this.watch([block]);
  }

  unregister(el: HTMLElement) {
    const block = this.blocks.get(el);
    if (!block) return;
    this.blocks.delete(el);
    this.seen?.unobserve(el);
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
    this.seen?.disconnect();
    this.seen = null;
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
      if (frame) restoreFrame(frame);
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

    const boxes = boxesOf(block.el);
    const rects = boxes.map((el) => relative(el, box));

    const jobs: Job[] = boxes.map((el, index) => this.boxJob(block, overlay, box, el, rects[index], at + index * T.box));

    // The frame's outline and hairlines are drawn over it by two more agents, and the
    // frame itself takes over once the block is finished, in the same places.
    const frame = frameOf(block.el);
    if (frame) {
      const f = relative(frame, box);
      const outline = document.createElement("div");
      outline.className = "build-outline";
      outline.style.borderRadius = getComputedStyle(frame).borderTopLeftRadius;
      outline.style.left = `${f.x}px`;
      outline.style.top = `${f.y}px`;
      overlay.append(outline);
      const drawnOutline = marquee(overlay, "hollow");
      const drawing = at + T.arrive;
      jobs.push(
        this.job(block, at, { x: f.x, y: f.y }, [
          {
            at: drawing,
            dur: T.outline,
            shape: "cross",
            apply: (p) => {
              const e = easeOut(p);
              outline.style.width = `${f.w * e}px`;
              outline.style.height = `${f.h * e}px`;
              outline.style.visibility = p > 0 ? "visible" : "hidden";
              drawnOutline.draw(f, e);
            },
            point: (p) => ({ x: f.x + f.w * easeOut(p), y: f.y + f.h * easeOut(p) }),
          },
          { at: drawing + T.outline, dur: T.release, apply: (p) => drawnOutline.fade(1 - p) },
        ]),
      );

      const segments = dividers(rects);
      if (segments.length) {
        const steps: Step[] = [];
        let cursorAt = at + T.arrive;
        segments.forEach((segment, index) => {
          const grow = hairline(overlay, segment);
          const drawnRule = marquee(overlay, "band");
          if (index > 0) {
            const hop = along(segments[index - 1], 1);
            const start = along(segment, 0);
            steps.push({ at: cursorAt, dur: T.hop, shape: "cross", apply: () => {}, point: (p) => lerp(hop, start, easeInOut(p)) });
            cursorAt += T.hop;
          }
          steps.push(
            {
              at: cursorAt,
              dur: T.divider,
              shape: "cross",
              apply: (p) => {
                const e = easeOut(p);
                grow(e);
                drawnRule.draw(band(segment), segment.vertical ? 1 : e, segment.vertical ? e : 1);
              },
              point: (p) => along(segment, easeOut(p)),
            },
            { at: cursorAt + T.divider, dur: T.release, apply: (p) => drawnRule.fade(1 - p) },
          );
          cursorAt += T.divider;
        });
        jobs.push(this.job(block, at, along(segments[0], 0), steps));
      }
    }

    block.jobs = jobs;
    block.end = Math.max(...jobs.map((job) => job.end));
    block.timer = window.setTimeout(() => this.finish(block), Math.max(0, block.end - now()) * 1000 + 50);
  }

  /**
   * One box: the cursor drags out its marquee and the box fades in. Then, in
   * reading order, it types each text, drags out each label's rule, holds each
   * name in a selection box and lets the links appear. Typing is sped up for a
   * long box so the whole of it, flight in aside, still fits in `T.most`.
   */
  private boxJob(block: Block, overlay: HTMLElement, box: DOMRect, el: HTMLElement, r: Rect, start: number): Job {
    const drawn = marquee(overlay);
    const dragged = start + T.arrive;
    const filled = dragged + T.drag;
    const steps: Step[] = [
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
    ];

    const work = Array.from(el.querySelectorAll<HTMLElement>("[data-type], [data-rule], [data-pick], [data-show]")).map((part) => ({
      part,
      at: relative(part, box),
      kind: part.hasAttribute("data-type") ? "type" : part.hasAttribute("data-rule") ? "rule" : part.hasAttribute("data-pick") ? "pick" : "show",
    }));
    const typed = work.filter((piece) => piece.kind === "type").map((piece) => typer(overlay, piece.part, piece.at, linesOf(piece.part)));
    const fixed = work.reduce((sum, piece) => sum + (piece.kind === "rule" ? T.hop + T.rule : piece.kind === "pick" ? T.hop + T.pick : piece.kind === "show" ? T.show : T.hop), 0);
    const room = T.most - T.drag - T.release - fixed;
    const wanted = typed.reduce((sum, text) => sum + text.chars / T.typing, 0);
    const pace = wanted > room ? room / wanted : 1;

    let cursorAt = filled;
    let from: Point = { x: r.x + r.w, y: r.y + r.h };
    let next = 0;
    const hopTo = (to: Point, shape: Shape) => {
      const hop = from;
      steps.push({ at: cursorAt, dur: T.hop, shape, apply: () => {}, point: (p) => lerp(hop, to, easeInOut(p)) });
      cursorAt += T.hop;
    };
    for (const piece of work) {
      if (piece.kind === "type") {
        const text = typed[next++];
        const dur = (text.chars / T.typing) * pace;
        hopTo(text.point(0), "beam");
        steps.push({ at: cursorAt, dur, shape: "beam", apply: text.apply, point: text.point });
        cursorAt += dur;
        from = text.point(1);
      } else if (piece.kind === "rule") {
        const segment: Segment = { x: piece.at.x, y: piece.at.y, length: piece.at.w, thickness: piece.at.h, vertical: false };
        const drawnRule = marquee(overlay, "band");
        const rule = piece.part;
        hopTo(along(segment, 0), "cross");
        steps.push(
          {
            at: cursorAt,
            dur: T.rule,
            shape: "cross",
            apply: (p) => {
              const e = easeOut(p);
              rule.style.transformOrigin = p >= 1 ? "" : "left";
              rule.style.transform = p >= 1 ? "" : `scaleX(${e})`;
              drawnRule.draw(band(segment), e, 1);
            },
            point: (p) => along(segment, easeOut(p)),
          },
          { at: cursorAt + T.rule, dur: T.release, apply: (p) => drawnRule.fade(1 - p) },
        );
        cursorAt += T.rule;
        from = along(segment, 1);
      } else if (piece.kind === "pick" && linesOf(piece.part).length) {
        // A name is not typed: it appears whole, held in a selection box.
        const name = piece.part;
        const lines = linesOf(name);
        const left = Math.min(...lines.map((line) => line.left));
        const right = Math.max(...lines.map((line) => line.right));
        const held: Rect = {
          x: piece.at.x + left - 4,
          y: piece.at.y + Math.min(...lines.map((line) => line.top)) - 2,
          w: right - left + 8,
          h: Math.max(...lines.map((line) => line.bottom)) - Math.min(...lines.map((line) => line.top)) + 4,
        };
        const drawnName = marquee(overlay, "band");
        const corner = { x: held.x + held.w, y: held.y + held.h };
        hopTo(corner, "arrow");
        steps.push(
          {
            at: cursorAt,
            dur: T.pick,
            shape: "arrow",
            apply: (p) => {
              name.style.opacity = p > 0 ? "" : "0";
              drawnName.draw(held, p > 0 ? 1 : 0);
            },
            point: () => corner,
          },
          { at: cursorAt + T.pick, dur: T.release, apply: (p) => drawnName.fade(1 - p) },
        );
        cursorAt += T.pick;
        from = corner;
      } else {
        const links = piece.part;
        steps.push({
          at: cursorAt,
          dur: T.show,
          apply: (p) => {
            links.style.opacity = p >= 1 ? "" : String(p);
          },
        });
        cursorAt += T.show;
      }
    }
    steps.push({ at: Math.max(filled + T.fill, cursorAt), dur: T.release, apply: (p) => drawn.fade(1 - p) });
    return this.job(block, start, { x: r.x, y: r.y }, steps);
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
      needs: !!first,
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
      if (frame) restoreFrame(frame);
      for (const job of block.jobs) {
        job.steps.forEach((step, index) => {
          if (job.last[index] !== 1) step.apply(1, job);
          job.last[index] = 1;
        });
        if (job.cursor) this.release(job.cursor);
      }
    }
    block.overlay?.remove();
    block.overlay = null;
    block.jobs = [];
    block.state = "done";
    for (const el of [...boxesOf(block.el), ...block.el.querySelectorAll("[data-rule], [data-type], [data-pick], [data-show]"), frameOf(block.el)]) {
      if (el && !el.getAttribute("style")) el.removeAttribute("style");
    }
    this.entering?.unobserve(block.el);
  }

  private release(cursor: Cursor) {
    if (cursor.job) cursor.job.cursor = null;
    cursor.job = null;
    cursor.flight = null;
    cursor.shape = "arrow";
  }

  /**
   * A block going off screen keeps its clock but loses its cursors, which park
   * out of sight, and is no longer drawn. Back on screen it is drawn at
   * whatever point its timeline has reached, and work still under way gets a
   * cursor again, flown straight in.
   */
  private see(block: Block, visible: boolean) {
    if (block.visible === visible) return;
    block.visible = visible;
    if (visible) {
      if (block.state === "running") this.run();
      return;
    }
    for (const job of block.jobs) {
      if (!job.needs) continue;
      job.manned = false;
      const cursor = job.cursor;
      if (!cursor) continue;
      this.release(cursor);
      cursor.shown = false;
      cursor.leaving = null;
      this.draw(cursor);
    }
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
      if (block.state !== "running" || block.mode !== "build" || !block.visible) continue;
      busy = true;
      for (const job of block.jobs) {
        job.steps.forEach((step, index) => {
          const p = step.dur > 0 ? clamp01((t - step.at) / step.dur) : t >= step.at ? 1 : 0;
          if (p !== job.last[index]) {
            step.apply(p, job);
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
        // One already out of sight, by a block scrolled away, just parks.
        if (cursor.pos.y < view.top - 40 || cursor.pos.y > view.bottom + 40) cursor.shown = false;
        else cursor.leaving = {
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
