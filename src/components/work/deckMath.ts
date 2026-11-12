// The wheel's maths, with no DOM in it. Everything here is a pure function
// of a few numbers, so it can be tested without a browser.
//
// The cards sit on a wheel whose centre is far below the stage, so only the
// top arc shows. Two numbers describe the whole animation:
//   deal  0 → 1  cards fly out from the centre to the rim, turning face up
//   lift  0 → 1  the wheel grows, rises and tips back into its resting pose
// and `spin` is the angle the wheel has turned (degrees, positive = cards move left).

/**
 * How many cards go round the wheel. A handful of projects cannot fill it, so
 * they are laid out several times over: the whole number of rounds that lands
 * nearest `around` cards (24 puts them 15 degrees apart).
 */
export function slotsFor(projects: number, around = 24): number {
  return projects * Math.max(1, Math.round(around / projects));
}

export const DEAL_SECONDS = 2.6;
export const LIFT_SECONDS = 1.9;
export const DRIFT_DEG_PER_S = 5.5;

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

/** Angle folded into -180..180, where 0 is straight up. */
export function wrap(deg: number): number {
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}

/** Where `t` sits between `from` and `to`, clamped to 0..1. */
export function span(t: number, from: number, to: number): number {
  return clamp01((t - from) / (to - from));
}

export function outCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/** CSS `cubic-bezier(x1, y1, x2, y2)` as a function of time. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const curve = (a: number, b: number, u: number) => 3 * a * u * (1 - u) ** 2 + 3 * b * u * u * (1 - u) + u ** 3;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let low = 0;
    let high = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (low + high) / 2;
      if (curve(x1, x2, mid) < t) low = mid;
      else high = mid;
    }
    return curve(y1, y2, (low + high) / 2);
  };
}

export const liftEase = cubicBezier(0.5, 0, 0.15, 1);

/** `deal` and `lift` for a moment `seconds` after the deal began. */
export function timeline(seconds: number): { deal: number; lift: number } {
  return {
    deal: clamp01(seconds / DEAL_SECONDS),
    lift: liftEase(clamp01((seconds - DEAL_SECONDS) / LIFT_SECONDS)),
  };
}

export type Rig = {
  /** Distance from the wheel's centre to the cards, px. */
  radius: number;
  /** How far below the cards' origin the wheel's centre sits, px. */
  pivot: number;
  /** Card scale. */
  grow: number;
  /** Extra turn the lift gives the wheel, degrees. */
  kick: number;
  /** How far the stage tips back, degrees. */
  tip: number;
  /** Pixel scale the rig was built at. */
  scale: number;
  /** Degrees between neighbouring cards. */
  step: number;
};

/**
 * The wheel's proportions at a given lift. `scale` multiplies every pixel
 * value (1 = a 1200px stage); `slots` is how many cards go round.
 */
export function rig(lift: number, scale: number, slots: number): Rig {
  const step = 360 / slots;
  return {
    radius: (580 + 430 * lift) * scale,
    pivot: (500 + 314 * lift) * scale,
    grow: 1 + 0.35 * lift,
    // About 28 degrees, as a whole number of cards, so a card sits dead centre before and after.
    kick: -Math.round(28 / step) * step * lift,
    tip: 12 * lift,
    scale,
    step,
  };
}

/**
 * Pixel scale for a stage. Wide stages scale with their width; narrow ones
 * stop shrinking at the point where neighbouring cards would start to overlap.
 */
export function stageScale(stageWidth: number, cardWidth: number, slots: number, tight = false): number {
  const lifted = rig(1, 1, slots);
  const chord = 2 * lifted.radius * Math.sin((lifted.step * Math.PI) / 360); // centre to centre at scale 1
  // Tight: the wheel is exactly as big as it takes to seat the cards side by side, whatever the stage's width.
  if (tight) return (cardWidth * lifted.grow * 1.06) / chord;
  return Math.max(stageWidth / 1200, (cardWidth * lifted.grow * 1.1) / chord);
}

export type Pose = {
  /** Angle from straight up, -180..180. */
  home: number;
  away: number;
  /** This card's own progress through the deal, 0..1. */
  p: number;
  visible: boolean;
  transform: string;
};

/** Where card `index` is for a given state of the wheel. */
export function pose(index: number, deal: number, spin: number, r: Rig): Pose {
  const home = wrap(index * r.step - spin + r.kick);
  const away = Math.abs(home);
  // Cards nearest the top are dealt first; each one moves for 40% of the deal.
  const order = Math.min(away, 100) / 100;
  const p = outCubic(span(deal, order * 0.6, order * 0.6 + 0.4));
  const visible = p > 0 && away < 105;
  const rest = 1 - p;
  const transform =
    `translate3d(0,${r.pivot.toFixed(2)}px,${(-away * 0.5 * r.scale).toFixed(2)}px) ` +
    // Every card leaves the centre pointing straight up and opens out to its own angle.
    `rotateZ(${(home * p).toFixed(3)}deg) ` +
    `translate3d(0,${(-r.radius * p + rest * 140 * r.scale).toFixed(2)}px,0) ` +
    `rotateY(${(rest * 180).toFixed(2)}deg) ` +
    `scale(${((0.7 + 0.3 * p) * r.grow).toFixed(4)})`;
  return { home, away, p, visible, transform };
}

/** Index of the slot nearest the top (may be any integer; take it modulo the count you need). */
export function focusedSlot(spin: number, r: Rig): number {
  return Math.round((spin - r.kick) / r.step);
}

/** The nearest spin that puts a card exactly at the top. */
export function snap(spin: number, r: Rig): number {
  return focusedSlot(spin, r) * r.step + r.kick;
}

/** The spin that centres `slot`, choosing the turn closest to `from`. */
export function spinFor(slot: number, r: Rig, from: number): number {
  const wanted = slot * r.step + r.kick;
  return wanted + 360 * Math.round((from - wanted) / 360);
}

/** Degrees the wheel turns per pixel of drag, so a card stays under the finger. */
export function degPerPx(r: Rig): number {
  return 180 / (Math.PI * r.radius);
}

export function mod(value: number, by: number): number {
  return ((value % by) + by) % by;
}
