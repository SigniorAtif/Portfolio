"use client";

// The castle's sprites and its loop are ported from Iuri de Paula's portfolio
// (src/components/Characters/HolwsCastle), MIT: see ../notfound/toons/index.ts.
import { useCallback, useEffect, useRef } from "react";
import { RoughEase } from "gsap/EasePack";
import { DotCanvas, type DotSource } from "@/components/notfound/AsciiToon";
import { LOOP, LOOP_EASE_IN_OUT } from "@/components/notfound/toons/types";
import { gsap } from "@/lib/gsap";
import { EASE } from "@/lib/motion";
import { whenStageOpen } from "@/lib/stage";

gsap.registerPlugin(RoughEase);

/** Each sprite sheet's size in the castle's own pixels. The files are drawn at about half that. */
const SHEETS = {
  pieces: { file: "pieces", w: 865, h: 713 },
  body: { file: "body", w: 733, h: 824 },
  clothes: { file: "clothes", w: 390, h: 323 },
  bucket: { file: "bucket", w: 15, h: 54 },
  ear: { file: "ear", w: 70, h: 53 },
  flag: { file: "flag", w: 106, h: 30 },
  fan1: { file: "fan-1", w: 2199, h: 824 },
  fan2: { file: "fan-2", w: 2199, h: 824 },
  wing: { file: "wing", w: 4398, h: 824 },
  tails: { file: "fixed-tails", w: 733, h: 824 },
  shoulder: { file: "fixed-shoulder", w: 733, h: 824 },
  balcony: { file: "fixed-balcony", w: 733, h: 824 },
  roof: { file: "fixed-roof", w: 733, h: 824 },
} as const;
type SheetId = keyof typeof SHEETS;

const CASTLE = { w: 733, h: 824 };
/** The frame the dots are sampled from: the castle, with room above for its bob and its lift. */
const STAGE = { w: 800, h: 960 };
const AT = { x: 34, y: 116 };
const COLS = 100;
const ROWS = 120;
/** The painting is all mid tones: these two ends are pulled apart to black and white. */
const LEVELS: [number, number] = [0.06, 0.55];
/** How far it rises once the note is whole. */
const LIFT = 56;
/** Seconds the painting takes to spread a third further across it as a blank fills. */
const TURN = 1.3;
/**
 * The arrival. It glides in from the right edge of the screen as the painting, nose up,
 * and while it slows a ragged edge crosses it from its nose to its tail, leaving dots.
 */
const ARRIVE = { glide: 2.8, pitch: 5, wipeAt: 0.55, wipe: 1.7, hurry: 2.2 };
/**
 * As the note is sent it leaves the way it came in, and the page waits for it: it sinks a
 * touch, wings quickening, then flies nose up across the screen, gathering speed and
 * climbing as it goes, and out past the left edge.
 */
const DEPART = { dip: 10, crouch: 0.3, rise: 150, cross: 2.1, pitch: 6, hurry: 2.8, past: 60 };
/** Seconds the take-off lasts, from the press to the castle being off the screen. */
export const FLIGHT = DEPART.crouch + DEPART.cross;
/** How ragged that edge is, as a share of the frame's width. */
const RAG = 0.1;
const EDGE = { before: -RAG, after: 1 + RAG };
/** Where the painting reaches, across the frame, for a note this far along: nothing, a share of the castle from its nose, or all. */
const reach = (spirits: number) =>
  spirits <= 0 ? EDGE.before : spirits >= 1 ? EDGE.after : (AT.x + CASTLE.w * spirits) / STAGE.w;

/** Everything that moves, as plain numbers the timeline tweens and the painter reads. Angles in degrees. */
const REST = {
  clock: 0,
  bob: 0,
  lift: 0,
  tower: 0,
  bucket: 0,
  bucketTilt: 0,
  lip: 0,
  lipSlide: 0,
  ear: 0,
  lLeg: 0,
  rLeg: 0,
  lArm: 0,
  rArm: 0,
  leaf1: 0,
  leaf2: 0,
  leaf3: 0,
};
type Pose = typeof REST;
/**
 * What shows as the painting rather than as dots, as two places across the frame (0 to 1):
 * everything left of `colour`, and everything right of `edge`. Both borders are ragged.
 */
type Look = { colour: number; edge: number };

type Part = {
  sheet: SheetId;
  /** Where it sits in the castle. Left out, it covers the whole castle. */
  box?: [x: number, y: number, w: number, h: number];
  /** Its corner on the sheet. */
  from?: [x: number, y: number];
  /** A flip book: frames side by side on the sheet, and the seconds one pass takes. */
  frames?: number;
  every?: number;
  /** Plays the flip book forwards then backwards. */
  bounce?: boolean;
  /** The point it moves about, as a share of its box. */
  pivot?: [x: number, y: number];
  turn?: (pose: Pose) => number;
  lean?: (pose: Pose) => number;
  /** Sideways shift, as a share of its width. */
  slide?: (pose: Pose) => number;
  /** Vertical squash from the pivot, 1 for none. */
  squash?: (pose: Pose) => number;
};

const lip = { pivot: [1, 0], turn: (p: Pose) => p.lip, slide: (p: Pose) => p.lipSlide } satisfies Partial<Part>;
const leaf = (lean: Part["lean"]) => ({ pivot: [0.5, 1], lean }) satisfies Partial<Part>;

/** Back to front, in the order the original stacks them. */
const PARTS: Part[] = [
  { sheet: "fan2", frames: 3, every: 0.3 },
  { sheet: "fan1", frames: 3, every: 0.4 },
  { sheet: "tails" },
  { sheet: "pieces", box: [146, 0, 131, 172], from: [596, 0], pivot: [0.5, 1], turn: (p) => p.tower },
  { sheet: "clothes", box: [544, 94, 130, 323], frames: 3, every: 0.25 },
  { sheet: "pieces", box: [44, 58, 596, 420], from: [0, 0] },
  {
    sheet: "bucket",
    box: [580, 499, 15, 54],
    pivot: [0.5, 0],
    turn: (p) => p.bucket,
    squash: (p) => Math.cos((p.bucketTilt * Math.PI) / 180),
  },
  { sheet: "pieces", box: [71, 550, 150, 150], from: [0, 563], ...lip },
  { sheet: "pieces", box: [72, 551, 150, 150], from: [150, 563], ...lip },
  { sheet: "pieces", box: [409, 714, 132, 110], from: [727, 140], pivot: [0, 0], turn: (p) => p.lLeg },
  { sheet: "pieces", box: [462, 668, 152, 136], from: [300, 563], pivot: [0, 0], turn: (p) => p.rLeg },
  { sheet: "pieces", box: [191, 697, 146, 104], from: [388, 420], pivot: [0, 0], turn: (p) => p.lArm },
  { sheet: "body" },
  { sheet: "pieces", box: [254, 643, 177, 143], from: [0, 420], pivot: [0, 0], turn: (p) => p.rArm },
  { sheet: "shoulder" },
  { sheet: "ear", box: [205, 523, 70, 53], pivot: [0.25, 0.5], turn: (p) => p.ear },
  { sheet: "pieces", box: [244, 360, 121, 99], from: [727, 250], ...leaf((p) => p.leaf2) },
  { sheet: "pieces", box: [307, 417, 110, 62], from: [727, 349], ...leaf((p) => p.leaf1) },
  { sheet: "balcony" },
  { sheet: "wing", frames: 6, every: 0.4, bounce: true },
  { sheet: "pieces", box: [290, 183, 138, 140], from: [727, 0], ...leaf((p) => p.leaf3) },
  { sheet: "pieces", box: [357, 239, 211, 119], from: [177, 420], ...leaf((p) => p.leaf2) },
  { sheet: "pieces", box: [438, 320, 89, 62], from: [727, 411], ...leaf((p) => p.leaf1) },
  { sheet: "roof" },
  { sheet: "flag", box: [429, 323, 53, 30], frames: 2, every: 0.2 },
];

const rough = (strength: number, points: number) =>
  `rough({template: none, strength: ${strength}, points: ${points}, taper: none, randomize: true, clamp: false})`;

/** The original loop: it rattles, chews, paddles its legs and bobs. */
function walk(tl: gsap.core.Timeline, pose: Pose) {
  tl.to(pose, { clock: 3600, duration: 3600, ease: "none", repeat: -1 }, 0)
    .to(pose, { tower: -15, duration: 2, ease: rough(0.5, 10), ...LOOP }, 0)
    .to(pose, { bucket: -25, bucketTilt: 45, duration: 0.6, ...LOOP }, 0)
    .to(pose, { lip: -20, lipSlide: -0.05, duration: 1.6, ease: rough(1, 16), ...LOOP }, 0)
    .to(pose, { ear: -25, duration: 2, ease: rough(1, 16), ...LOOP }, 0)
    .to(pose, { bob: -0.05 * CASTLE.h, duration: 1.6, ...LOOP_EASE_IN_OUT }, 0)
    .to(pose, { lLeg: -15, duration: 2, ...LOOP_EASE_IN_OUT }, 0)
    .to(pose, { rLeg: -15, duration: 2.2, ...LOOP_EASE_IN_OUT }, 0)
    .to(pose, { rArm: 15, duration: 1.8, ...LOOP_EASE_IN_OUT }, 0)
    .to(pose, { lArm: 15, duration: 2, ...LOOP_EASE_IN_OUT }, 0)
    .to(pose, { leaf1: 10, duration: 0.7, ...LOOP }, 0)
    .to(pose, { leaf2: -8, duration: 0.6, ...LOOP }, 0)
    .to(pose, { leaf3: 6, duration: 0.5, ...LOOP }, 0);
}

/** Paints the castle as it stands, to fill a canvas of any size: one pixel per dot, or the real thing. */
function paint(ctx: CanvasRenderingContext2D, sheets: Record<SheetId, HTMLImageElement>, pose: Pose, width: number, height: number) {
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  // As dots it is shrunk several times over: the plain filter would drop whole windows and railings.
  ctx.imageSmoothingQuality = "high";
  ctx.scale(width / STAGE.w, height / STAGE.h);
  ctx.translate(AT.x, AT.y + pose.bob + pose.lift);
  for (const part of PARTS) {
    const image = sheets[part.sheet];
    const sheet = SHEETS[part.sheet];
    const [x, y, w, h] = part.box ?? [0, 0, CASTLE.w, CASTLE.h];
    let frame = 0;
    if (part.frames && part.every) {
      const step = Math.floor((pose.clock / part.every) * part.frames);
      const turn = step % (part.frames * 2);
      frame = !part.bounce ? step % part.frames : turn < part.frames ? turn : part.frames * 2 - 1 - turn;
    }
    // The files are smaller than the castle's own pixels, each sheet by its own amount.
    const kx = image.naturalWidth / sheet.w;
    const ky = image.naturalHeight / sheet.h;
    const [fx, fy] = part.from ?? [0, 0];

    ctx.save();
    ctx.translate(x + w * (part.slide?.(pose) ?? 0), y);
    if (part.pivot) {
      const px = w * part.pivot[0];
      const py = h * part.pivot[1];
      ctx.translate(px, py);
      if (part.turn) ctx.rotate((part.turn(pose) * Math.PI) / 180);
      if (part.lean) ctx.transform(1, 0, Math.tan((part.lean(pose) * Math.PI) / 180), 1, 0, 0);
      if (part.squash) ctx.scale(1, part.squash(pose));
      ctx.translate(-px, -py);
    }
    ctx.drawImage(image, (fx + frame * w) * kx, fy * ky, w * kx, h * ky, 0, 0, w, h);
    ctx.restore();
  }
  ctx.restore();
}

/** How fast the loop runs for a note this far along. */
const pace = (spirits: number) => 0.75 + spirits * 0.6;

function load(file: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = `/castle/${file}.png`;
  return image.decode().then(() => image);
}

/**
 * The moving castle, in dots, keeping the note company. It is sprite sheets
 * rather than an SVG, so it paints its own frames for the dot renderer.
 *
 * It flies in from the right as the painting it is, turning to dots from nose
 * to tail as it settles. `spirits` runs from 0 to 1 with the note: as the
 * blanks fill, the painting spreads back across that share of it from the
 * nose, it steps livelier, and once the note is whole it is all colour and
 * lifts off the ground. While `away`, the note being on its way, it flies off across
 * the screen to the left, and a new note gets a new castle.
 */
export function CastleDots({ spirits, away = false }: { spirits: number; away?: boolean }) {
  const running = useRef<{
    timeline: gsap.core.Timeline;
    arrival: gsap.core.Timeline;
    pose: Pose;
    look: Look;
    reduced: boolean;
  } | null>(null);
  const wanted = useRef(spirits);
  const leaving = useRef(away);
  const box = useRef<HTMLDivElement>(null);

  const open = useCallback((reduced: boolean): DotSource => {
    const pose = { ...REST };
    const timeline = gsap.timeline({ paused: reduced });
    walk(timeline, pose);
    const look: Look = { colour: reach(wanted.current), edge: reduced ? EDGE.after : EDGE.before };
    const arrival = gsap.timeline({ paused: true });
    const now = { timeline, arrival, pose, look, reduced };
    running.current = now;

    // Parked just past the right edge of the screen until its sprites are in.
    const el = box.current;
    if (el && !reduced) {
      gsap.set(el, { x: window.innerWidth - el.getBoundingClientRect().left, rotation: ARRIVE.pitch });
      timeline.timeScale(ARRIVE.hurry);
      arrival
        .to(el, { x: 0, duration: ARRIVE.glide, ease: EASE.out }, 0)
        .to(el, { rotation: 0, duration: ARRIVE.glide, ease: "back.out(2.2)" }, 0)
        .to(timeline, { timeScale: pace(wanted.current), duration: ARRIVE.glide, ease: "power2.out" }, 0)
        .to(look, { edge: EDGE.after, duration: ARRIVE.wipe, ease: "power2.inOut" }, ARRIVE.wipeAt);
    }

    let sheets: Record<SheetId, HTMLImageElement> | null = null;
    const ids = Object.keys(SHEETS) as SheetId[];
    const ready = Promise.all(ids.map((id) => load(SHEETS[id].file))).then((images) => {
      sheets = Object.fromEntries(ids.map((id, i) => [id, images[i]])) as Record<SheetId, HTMLImageElement>;
      // The glide in waits for the veil to leave.
      void whenStageOpen().then(() => {
        if (running.current === now) arrival.play();
      });
    });

    return {
      ready,
      draw(reader, cols, rows) {
        if (sheets) paint(reader, sheets, pose, cols, rows);
      },
      whole(x, _y, rank) {
        const at = x - (rank - 0.5) * 2 * RAG;
        return at < look.colour || at > look.edge;
      },
      full(ctx, width, height) {
        if (sheets) paint(ctx, sheets, pose, width, height);
      },
      stop() {
        arrival.kill();
        gsap.killTweensOf([timeline, pose, look]);
        if (el) {
          gsap.killTweensOf(el);
          gsap.set(el, { clearProps: "transform,opacity,visibility" });
        }
        timeline.kill();
        running.current = null;
      },
    };
  }, []);

  useEffect(() => {
    const changed = wanted.current !== spirits;
    wanted.current = spirits;
    const now = running.current;
    // On mount the arrival already heads for these values, and must not be cut short.
    if (!now || !changed) return;
    if (now.reduced) now.look.colour = reach(spirits);
    else gsap.to(now.look, { colour: reach(spirits), duration: TURN, ease: "power2.inOut", overwrite: "auto" });
    gsap.to(now.timeline, { timeScale: pace(spirits), duration: 0.8, ease: "power2.out", overwrite: true });
    gsap.to(now.pose, { lift: spirits >= 1 ? -LIFT : 0, duration: 1.4, ease: "power2.inOut", overwrite: "auto" });
  }, [spirits]);

  useEffect(() => {
    const now = running.current;
    const el = box.current;
    if (leaving.current === away) return;
    leaving.current = away;
    if (!now || !el || now.reduced) return;
    gsap.killTweensOf(el);
    gsap.to(now.timeline, { timeScale: away ? DEPART.hurry : pace(wanted.current), duration: 0.5, ease: "power2.out", overwrite: true });
    if (!away) {
      // Comes back if the note did not go after all.
      gsap.to(el, { x: 0, y: 0, rotation: 0, duration: 0.9, ease: "power2.out" });
      return;
    }
    gsap
      .timeline()
      .to(el, { y: DEPART.dip, rotation: -1.5, duration: DEPART.crouch, ease: "power2.out" })
      .to(el, { x: -(el.getBoundingClientRect().right + DEPART.past), duration: DEPART.cross, ease: "power2.in" })
      .to(el, { y: -DEPART.rise, duration: DEPART.cross, ease: "power1.in" }, "<")
      .to(el, { rotation: DEPART.pitch, duration: DEPART.cross, ease: "power2.out" }, "<");
  }, [away]);

  return (
    <div
      ref={box}
      className="will-change-transform"
      role="img"
      aria-label="Howl's moving castle, drawn in dots: a heap of houses, chimneys and a flapping wing, paddling along on four thin legs."
    >
      <DotCanvas open={open} cols={COLS} rows={ROWS} levels={LEVELS} />
    </div>
  );
}
