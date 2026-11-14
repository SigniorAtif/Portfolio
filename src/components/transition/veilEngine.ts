// The veil's timing and drawing, kept free of the DOM so it can run on its own
// thread (veil.worker.ts) and keep moving while the page below it boots: the
// home page's first commit holds the main thread for a good tenth of a second,
// right while the greetings are running. Veil.tsx is the host. It owns the DOM,
// the router and the fonts, turns text into dot masks, and drives this engine
// with messages; the engine answers with events.

const COVER_S = 0.6;
const HOLD_S = 0.4; // least time the covered sheet shows the page name
const REVEAL_S = 0.95;
const OPEN_AT = 0.5; // share of the reveal after which the page's intro starts
const BAND = 0.4; // width of the ripple's soft edge, as a share of its reach
const RING_PX = 56; // the ring the portrait's dots leave from (BustStage)
const RING_S = 1.05;
const GIVE_UP_MS = 8000;
const HELLO_FADE_MS = 750; // Hello's soft fade in

// A soft first hello, then a quick, even run of languages in their own scripts
// whose last word holds still before it gathers into the portrait.
// `pause` is blank time at the start of a word's turn, before the word shows.
type Word = { text: string; ms: number; pause?: number };
export const GREETINGS: readonly Word[] = [
  { text: "Hello", ms: 1400, pause: 80 },
  { text: "Hola", ms: 190 },
  { text: "مرحبا", ms: 190 },
  { text: "こんにちは", ms: 190 },
  { text: "안녕하세요", ms: 190 },
  { text: "Ciao", ms: 190 },
  { text: "Olá", ms: 900 }, // the last word: on with the beat, then held
];
const CUT_MS = 35; // words in the run swap with a near cut, in and out
const BOOT_MS = GREETINGS.reduce((total, word) => total + word.ms, 0);

export type Point = { x: number; y: number };
export type Size = { width: number; height: number; dpr: number };
export type Grid = { cell: number; cols: number; rows: number; left: number; top: number };
type Greeting = { dots: Float32Array; radius: number };

/** Text measured into dots by the host: one level (0 to 255) per grid cell. */
export type Glyphs = {
  /** Triples of viewport-relative x, y and coverage for each greeting's dots. */
  greetings?: Greeting[];
  /** The name of the page being opened. */
  label?: Uint8Array;
};

export type HostMessage =
  | {
      type: "init";
      size: Size;
      ground: string;
      dot: string;
      plain: boolean;
      again: boolean;
      real: number;
      loads: number;
      glyphs: Glyphs;
      canvas?: OffscreenCanvas;
    }
  | { type: "resize"; size: Size; glyphs: Glyphs }
  | { type: "glyphs"; glyphs: Glyphs }
  | { type: "progress"; real: number; loads: number }
  /** The host has taken its flat cover away: the canvas alone now hides the page. */
  | { type: "live" }
  | { type: "ring"; x: number; y: number }
  | { type: "open" }
  | { type: "cover"; origin: Point; glyphs: Glyphs }
  | { type: "arrived" }
  | { type: "snap"; glyphs: Glyphs };

export type EngineEvent =
  | { type: "drawn" }
  | { type: "full" }
  | { type: "covered" }
  | { type: "open" }
  | { type: "rest" }
  | { type: "fail" };

export type Frames = { request: (callback: (now: number) => void) => number; cancel: (id: number) => void };
export type Engine = { handle: (message: HostMessage) => void; stop: () => void };

type Mode = "boot" | "cover" | "wait" | "reveal" | "ring" | "idle";
type Particle = { x: number; y: number; angle: number; delay: number; size: number };
type Context = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - (1 - clamp(t)) ** 4;

/** The dot grid for a viewport. Host and engine both use it, so masks line up with the dots. */
export function gridFor(width: number, height: number): Grid {
  const cell = Math.min(24, Math.max(12, Math.round(Math.max(width, height) / 76)));
  const cols = Math.ceil(width / cell) + 1;
  const rows = Math.ceil(height / cell) + 1;
  return { cell, cols, rows, left: (width - (cols - 1) * cell) / 2, top: (height - (rows - 1) * cell) / 2 };
}

/** Roughly eleven dots in a capital's height: deliberate circles, not a mesh. */
export function greetingGridFor(width: number, height: number): Grid {
  const fontSize = Math.min(240, height * 0.24, width * 0.16);
  const cell = Math.max(5, Math.round(fontSize / 15));
  const cols = Math.ceil(width / cell) + 1;
  const rows = Math.ceil(height / cell) + 1;
  return { cell, cols, rows, left: (width - (cols - 1) * cell) / 2, top: (height - (rows - 1) * cell) / 2 };
}

export function createEngine(
  surface: HTMLCanvasElement | OffscreenCanvas,
  emit: (event: EngineEvent) => void,
  frames: Frames,
): Engine | null {
  const ctx = (surface as HTMLCanvasElement).getContext("2d") as Context | null;
  if (!ctx) return null;

  let plain = false; // reduced motion: the sheet only fades
  let ground = "#19191b";
  let dotColour = "#ffffff";

  let width = 0;
  let height = 0;
  let cell = 16;
  let cols = 0;
  let rows = 0;
  let left = 0;
  let top = 0;
  let greetingGrid = greetingGridFor(1, 1);
  let lit = new Float32Array(0); // how lit each dot is now
  let want = new Float32Array(0); // and where it is heading
  let dist = new Float32Array(0); // distance from the ripple's origin, 0..1
  let origin: Point = { x: 0.5, y: 0.5 }; // as shares of the viewport

  // What the bright dots spell, and the masks to spell it with.
  let spelled: { kind: "label" } | null = null;
  let greetings: Greeting[] = [];
  let label: Uint8Array | null = null;

  let mode: Mode = "idle";
  let frame = 0;
  let announce = false; // tell the host once the next frame is on screen
  let since = 0; // when the current mode began
  let last = 0;
  let cover = 0;
  let reveal = 0;
  let opened = false;
  let live = false;

  // boot
  let bootStart = 0;
  let pace = 1;
  let real = 0;
  let greetingIndex = 0;
  let greetingAge = 0;
  let asked = false;

  // travel
  let loads = 1;
  let hasArrived = false;
  let arrivedAt = 0;

  // ring
  let particles: Particle[] = [];
  let ring: Point = { x: 0, y: 0 };
  let openedAt = 0;

  const place = () => {
    const x = origin.x * width;
    const y = origin.y * height;
    const far = Math.max(Math.hypot(x, y), Math.hypot(width - x, y), Math.hypot(x, height - y), Math.hypot(width - x, height - y)) || 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        dist[r * cols + c] = Math.hypot(left + c * cell - x, top + r * cell - y) / far;
      }
    }
  };

  /** Work out how lit each dot should be from what is spelled. */
  const spell = () => {
    want.fill(0);
    const cells = cols * rows;
    if (!spelled || !cells) return;
    if (label?.length === cells) for (let i = 0; i < cells; i++) want[i] = label[i] / 255;
  };

  const take = (glyphs: Glyphs) => {
    if (glyphs.greetings) greetings = glyphs.greetings;
    if (glyphs.label) label = glyphs.label;
  };

  const measure = (size: Size) => {
    width = size.width;
    height = size.height;
    if (!width || !height) return;
    surface.width = Math.round(width * size.dpr);
    surface.height = Math.round(height * size.dpr);
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    ({ cell, cols, rows, left, top } = gridFor(width, height));
    greetingGrid = greetingGridFor(width, height);
    const cells = cols * rows;
    if (lit.length !== cells) {
      lit = new Float32Array(cells);
      want = new Float32Array(cells);
      dist = new Float32Array(cells);
    }
    place();
    if (spelled) {
      spell();
      lit.set(want);
    }
  };

  const rest = () => {
    mode = "idle";
    frames.cancel(frame);
    frame = 0;
    ctx.clearRect(0, 0, width, height);
    spelled = null;
    label = null;
    particles = [];
    emit({ type: "rest" });
  };

  const open = (now: number) => {
    if (opened) return;
    opened = true;
    openedAt = now;
    emit({ type: "open" });
  };

  const startReveal = (now: number) => {
    mode = "reveal";
    since = now;
    reveal = 0;
    opened = false;
  };

  const step = (now: number) => {
    const seconds = (now - since) / 1000;
    if (mode === "boot") {
      bootStart ||= now;
      const waited = now - bootStart;
      greetingAge = waited / pace;
      greetingIndex = 0;
      while (greetingIndex < GREETINGS.length - 1 && greetingAge >= GREETINGS[greetingIndex].ms) {
        greetingAge -= GREETINGS[greetingIndex].ms;
        greetingIndex++;
      }
      // A slow download holds the last word; it never restarts the greeting cycle.
      const finished = waited >= (plain ? 200 : BOOT_MS * pace);
      if (!asked && finished && (real >= 0.999 || waited >= GIVE_UP_MS)) {
        asked = true;
        emit({ type: "full" });
      }
    } else if (mode === "cover") {
      cover = seconds / (plain ? 0.15 : COVER_S);
      if (cover >= 1) {
        cover = 1;
        mode = "wait";
        since = now;
        emit({ type: "covered" });
      }
    } else if (mode === "wait") {
      if (hasArrived && !arrivedAt) arrivedAt = now;
      const settled = arrivedAt && now - arrivedAt > 150 && (loads >= 1 || now - arrivedAt > 2500);
      if (live && ((settled && seconds >= (plain ? 0 : HOLD_S)) || now - since > GIVE_UP_MS)) startReveal(now);
    } else if (mode === "reveal") {
      reveal = seconds / (plain ? 0.2 : REVEAL_S);
      if (reveal >= (plain ? 0 : OPEN_AT)) open(now);
      if (reveal >= 1) rest();
    } else if (mode === "ring") {
      if (seconds >= RING_S) open(now);
      if (opened && now - openedAt > 550) rest();
    }
  };

  const drawGreeting = (index: number, opacity: number) => {
    const glyph = greetings[index];
    if (!glyph || opacity <= 0) return;
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    for (let i = 0; i < glyph.dots.length; i += 3) {
      const x = glyph.dots[i] * width;
      const y = glyph.dots[i + 1] * height;
      // Coverage shapes the edge dots, as on the page-title matrix. Every
      // circle is solid white, rather than a random wash of grey pixels.
      const radius = glyph.radius * glyph.dots[i + 2];
      ctx.moveTo(x + radius, y);
      ctx.arc(x, y, radius, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  const draw = (now: number, dt: number) => {
    ctx.clearRect(0, 0, width, height);
    if (mode === "idle") return;

    if (plain) {
      ctx.globalAlpha = mode === "cover" ? clamp(cover) : mode === "reveal" ? 1 - clamp(reveal) : 1;
      ctx.fillStyle = ground;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
      return;
    }

    const rippling = mode === "cover" || mode === "reveal";
    const reach = (mode === "cover" ? cover : reveal) * (1 + BAND);
    const size = lit.length;
    const toward = 1 - Math.exp(-dt * 13);
    const half = cell / 2;

    // How covered each dot's cell is: 1 behind the ripple, 0 ahead of it.
    const covered = (i: number) => {
      if (!rippling) return 1;
      const k = ease(clamp((reach - dist[i]) / BAND));
      return mode === "cover" ? k : 1 - k;
    };

    // The ground: one flat fill while covered, growing or shrinking discs in the ripple.
    ctx.fillStyle = ground;
    if (!rippling) {
      const fade = mode === "ring" && opened ? 1 - ease(clamp((now - openedAt) / 500)) : 1;
      ctx.globalAlpha = fade;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    } else {
      ctx.beginPath();
      for (let i = 0; i < size; i++) {
        const k = covered(i);
        if (k <= 0.001) continue;
        const x = left + (i % cols) * cell;
        const y = top + Math.floor(i / cols) * cell;
        if (k >= 0.999) {
          ctx.rect(x - half - 0.5, y - half - 0.5, cell + 1, cell + 1);
        } else {
          const radius = k * cell * 0.74;
          ctx.moveTo(x + radius, y);
          ctx.arc(x, y, radius, 0, Math.PI * 2);
        }
      }
      ctx.fill();
    }

    ctx.fillStyle = dotColour;

    if (mode === "boot" || mode === "ring") {
      const opacity = mode === "boot"
        ? easeOut((now - bootStart) / 700)
        : 1 - ease(clamp((now - since) / (RING_S * 650)));
      ctx.globalAlpha = opacity * 0.12;
      ctx.beginPath();
      const stride = Math.max(1, Math.ceil(12 / greetingGrid.cell));
      for (let row = 0; row < greetingGrid.rows; row += stride) {
        for (let col = 0; col < greetingGrid.cols; col += stride) {
          ctx.rect(greetingGrid.left + col * greetingGrid.cell - 0.65, greetingGrid.top + row * greetingGrid.cell - 0.65, 1.3, 1.3);
        }
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (mode === "boot") {
      // Words take turns on the same baseline. Never crossfade two different
      // words on top of one another: their dots would make an illegible smear.
      const final = greetingIndex === GREETINGS.length - 1;
      const shown = greetingAge - (GREETINGS[greetingIndex].pause ?? 0);
      const entrance = greetingIndex === 0 ? ease(clamp(shown / HELLO_FADE_MS)) : easeOut(shown / CUT_MS);
      const exit = final ? 1 : ease(clamp((GREETINGS[greetingIndex].ms - greetingAge) / CUT_MS));
      drawGreeting(greetingIndex, entrance * exit);
      return;
    }

    if (mode === "ring") {
      const q = (now - since) / 1000 / RING_S;
      const fade = opened ? 1 - ease(clamp((now - openedAt) / 450)) : 1;
      for (const p of particles) {
        const e = ease(clamp((q - p.delay * 0.16) / 0.84));
        const arc = Math.sin(e * Math.PI);
        const x = mix(p.x * width, ring.x * width + Math.cos(p.angle) * RING_PX, e) + Math.sin(p.angle * 2) * arc * 12;
        const y = mix(p.y * height, ring.y * height + Math.sin(p.angle) * RING_PX, e) + Math.cos(p.angle * 2) * arc * 12;
        const radius = mix(p.size, 0.9, e);
        ctx.globalAlpha = fade;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      return;
    }

    // The matrix at rest: a faint dot on every covered cell.
    ctx.globalAlpha = 0.14;
    ctx.beginPath();
    for (let i = 0; i < size; i++) {
      if (covered(i) < 0.6) continue;
      ctx.rect(left + (i % cols) * cell - 1, top + Math.floor(i / cols) * cell - 1, 2, 2);
    }
    ctx.fill();

    // The bright dots: the page name and a crest on the ripple's edge.
    ctx.globalAlpha = 1;
    ctx.beginPath();
    for (let i = 0; i < size; i++) {
      lit[i] += (want[i] - lit[i]) * toward;
      const k = covered(i);
      if (k <= 0.001) continue;
      let amount = lit[i] * 0.36 * k;
      if (rippling && k < 0.999) amount += Math.sin(k * Math.PI) * 0.2;
      if (amount < 0.03) continue;
      const x = left + (i % cols) * cell;
      const y = top + Math.floor(i / cols) * cell;
      const radius = amount * cell;
      ctx.moveTo(x + radius, y);
      ctx.arc(x, y, radius, 0, Math.PI * 2);
    }
    ctx.fill();
  };

  const tick = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    step(now);
    // `step` may have put the veil to rest.
    if ((mode as Mode) === "idle") return;
    draw(now, dt);
    if (announce) {
      // The frame drawn before this one has reached the screen by now.
      announce = false;
      emit({ type: "drawn" });
    }
    frame = frames.request(tick);
  };

  const run = () => {
    last = performance.now();
    frames.cancel(frame);
    frame = frames.request(tick);
  };

  return {
    handle(message) {
      const now = performance.now();
      switch (message.type) {
        case "init":
          plain = message.plain;
          ground = message.ground;
          dotColour = message.dot;
          pace = message.again ? 0.82 : 1;
          real = message.real;
          loads = message.loads;
          take(message.glyphs);
          measure(message.size);
          mode = "boot";
          since = now;
          bootStart = now;
          draw(now, 0);
          announce = true;
          run();
          break;
        case "resize":
          take(message.glyphs);
          measure(message.size);
          break;
        case "glyphs":
          // The real font has arrived: the text was measured in a fallback until now.
          take(message.glyphs);
          spell();
          break;
        case "progress":
          real = message.real;
          loads = message.loads;
          break;
        case "live":
          live = true;
          break;
        case "ring": {
          // The last word's actual dots travel to the ring, preserving the first frame.
          ring = { x: message.x / width, y: message.y / height };
          particles = [];
          const last = greetings[greetings.length - 1];
          if (last) {
            for (let i = 0; i < last.dots.length; i += 3) {
              const x = last.dots[i];
              const y = last.dots[i + 1];
              particles.push({
                x, y,
                angle: Math.atan2((y - ring.y) * height, (x - ring.x) * width),
                delay: (i * 0.618) % 1,
                size: last.radius * last.dots[i + 2],
              });
            }
            // Preserve angular order while spreading the wide word evenly
            // around the circle, avoiding two dense clumps at its sides.
            particles.sort((a, b) => a.angle - b.angle);
            particles.forEach((particle, index) => {
              particle.angle = -Math.PI + (index / particles.length) * Math.PI * 2;
            });
          }
          mode = "ring";
          since = now;
          opened = false;
          break;
        }
        case "open":
          // Any other page: the sheet opens as a ripple from the middle.
          origin = { x: 0.5, y: 0.5 };
          place();
          startReveal(now);
          break;
        case "cover":
          take(message.glyphs);
          origin = message.origin;
          place();
          lit.fill(0);
          spelled = { kind: "label" };
          spell();
          hasArrived = false;
          arrivedAt = 0;
          mode = "cover";
          since = now;
          cover = 0;
          run();
          break;
        case "arrived":
          hasArrived = true;
          break;
        case "snap":
          // Back or forward: the page has already changed, so cover it at once
          // and open from the middle once it has settled.
          take(message.glyphs);
          hasArrived = true;
          arrivedAt = 0;
          origin = { x: 0.5, y: 0.5 };
          place();
          spelled = { kind: "label" };
          spell();
          lit.set(want);
          live = false;
          mode = "wait";
          since = now;
          draw(now, 0);
          announce = true;
          run();
          break;
      }
    },
    stop() {
      mode = "idle";
      frames.cancel(frame);
    },
  };
}
