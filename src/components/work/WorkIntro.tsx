"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { SpaceField } from "@/components/footer/SpaceField";
import { SwapLabel } from "@/components/ui/SwapLabel";
import type { Project } from "@/content/projects";
import { reel } from "@/content/reel";
import { jumpTo, lockScroll, unlockScroll } from "@/lib/scrollLock";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { projectHref } from "./Card";
import type { DeckDrive } from "./Deck";
import { SwapText } from "./SwapText";
import { liftEase, outCubic, span } from "./deckMath";

const Deck = dynamic(() => import("./Deck"), { ssr: false });

export type Backdrop = "day" | "night" | "stars";
export const BACKDROPS: { id: Backdrop; label: string }[] = [
  { id: "day", label: "Original sky" },
  { id: "night", label: "Dark sky" },
  { id: "stars", label: "Stars" },
];

// The sequence, in seconds from the first scroll.
const VEIL = 0.75; // the video closes to a line across the middle, masked, never squeezed
const DEAL_AT = VEIL; // and the deal starts the moment it is gone
const DEAL = 2.6; // cards fly up into the fan
const LIFT_AT = DEAL_AT + DEAL;
const LIFT = 1.9; // the fan opens into the wheel, the sky arrives
const BOX_AT = LIFT_AT + 0.85; // the frame starts closing in while the wheel still moves
const BOX = 1.35;
const END = BOX_AT + BOX;

// The dealt fan on screen, measured off the reference: its radius and how far
// below the middle of the screen its top card sits, as shares of the screen.
const FAN_RADIUS_VH = 0.525;
const FAN_RADIUS_VW = 0.6; // narrow screens: never wider than this
const FAN_BELOW_MID_VH = 0.018;
const SEAT = 0.44; // where the settled top card sits in the frame
const RADIUS = 28;
const VIDEO_RADIUS = 20; // the reel's corners, as it leaves them
const SLIGHT = 0.06; // share of a screen scrolled past the grown video before the page is held
const START_KEYS = new Set(["ArrowDown", "PageDown", " ", "End"]);

const inOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

type Props = {
  projects: Project[];
  backdrop: Backdrop;
  /** Play straight away instead of waiting for the first scroll. */
  autoplay?: boolean;
  /**
   * On the landing: the stage waits, see-through, over the reel's pinned
   * video. A little scroll past the point where the video has finished
   * growing holds the page, puts the stage in place and closes the real
   * video away instead of a stand-in picture.
   */
  handoff?: boolean;
  onFocusChange?: (index: number) => void;
};

/**
 * Selected work as a full-screen opening. It rests showing the reel's last
 * frame (the real video underneath with `handoff`, a still of it otherwise).
 * The next scroll holds the page, the video closes shut, the deck is
 * dealt into a fan on the bare ground, the fan lifts into the wheel while the
 * sky fades in behind it and clouds rise in front, and then the picture
 * closes into a rounded frame with the heading above and the project on top
 * below. Scrolling is handed back when the frame has settled.
 *
 * The frame is laid out at its final place from the start. Until it closes
 * it is only scaled up to cover the screen, so nothing is re-laid-out on the way.
 */
export function WorkIntro({ projects, backdrop, autoplay = false, handoff = false, onFocusChange }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  const cloudsRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);
  const holeRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const drive = useRef<DeckDrive>({ deal: 0, lift: 0, fanRadius: 400, fanTop: 300 });

  const [focused, setFocused] = useState(0);
  const [announce, setAnnounce] = useState("");
  const [played, setPlayed] = useState(false);
  const settled = useReducedMotion() || played;

  const onFocus = useCallback(
    (index: number, byUser: boolean) => {
      setFocused(index);
      onFocusChange?.(index);
      const project = projects[index];
      setAnnounce(byUser ? `${project.name}, ${index + 1} of ${projects.length}. ${project.oneLiner}` : "");
    },
    [projects, onFocusChange],
  );

  useEffect(() => {
    const root = rootRef.current;
    const scene = sceneRef.current;
    if (!root || !scene) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // How the frame covers the screen before it closes.
    const m = { cover: 1, dx: 0, dy: 0 };
    let phase: "idle" | "playing" | "done" = "idle";
    let startedAt = 0;
    let frame = 0;
    let shown = END;

    const measure = () => {
      const width = root.clientWidth;
      const height = root.clientHeight;
      m.cover = Math.max(width / scene.offsetWidth, height / scene.offsetHeight) * 1.01;
      m.dx = width / 2 - (scene.offsetLeft + scene.offsetWidth / 2);
      m.dy = height / 2 - (scene.offsetTop + scene.offsetHeight / 2);
      // The frame is blown up while the cards are dealt, so the fan is drawn smaller by as much.
      drive.current.fanRadius = Math.min(FAN_RADIUS_VH * height, FAN_RADIUS_VW * width) / m.cover;
      drive.current.fanTop = scene.offsetHeight / 2 + (FAN_BELOW_MID_VH * height) / m.cover;
    };

    const apply = (t: number) => {
      shown = t;
      const deal = span(t, DEAL_AT, LIFT_AT);
      const rise = span(t, LIFT_AT, LIFT_AT + LIFT);
      const lift = liftEase(rise);
      const box = inOut(span(t, BOX_AT, END));
      const text = outCubic(span(t, BOX_AT + BOX * 0.4, END));

      drive.current.deal = deal;
      drive.current.lift = lift;

      const open = 1 - box;
      const scale = 1 + (m.cover - 1) * open;
      scene.style.transform = `translate3d(${(m.dx * open).toFixed(2)}px,${(m.dy * open).toFixed(2)}px,0) scale(${scale.toFixed(5)})`;
      scene.style.borderRadius = `${(RADIUS / scale).toFixed(2)}px`;
      scene.dataset.framed = String(box > 0.5);

      const sky = skyRef.current;
      if (sky) {
        sky.style.opacity = span(rise, 0, 0.5).toFixed(3);
        sky.style.transform = `scale(${(1.12 - 0.12 * lift).toFixed(4)})`;
      }
      const clouds = cloudsRef.current;
      if (clouds) {
        clouds.style.opacity = span(rise, 0.05, 0.4).toFixed(3);
        clouds.style.transform = `translate3d(0,${((1 - lift) * 60).toFixed(2)}%,0)`;
      }
      // Top and bottom edges of the video close on the middle of the screen.
      const shut = inOut(span(t, 0, VEIL));
      const veilEl = veilRef.current;
      if (veilEl) {
        veilEl.style.clipPath = `inset(${(shut * 50).toFixed(3)}% 0 round ${VIDEO_RADIUS}px)`;
        veilEl.style.visibility = shut >= 1 ? "hidden" : "visible";
      }
      // Over the real video the same thing is done with a hole in a sheet of ground:
      // the hole starts exactly on the video's own outline and closes.
      const curtain = curtainRef.current;
      const hole = holeRef.current;
      if (curtain && hole) {
        const pad = parseFloat(getComputedStyle(hole).left) || 0;
        const edge = pad + shut * (root.clientHeight / 2 - pad);
        hole.style.top = hole.style.bottom = `${edge.toFixed(2)}px`;
        hole.style.display = shut >= 1 ? "none" : "block";
        curtain.style.background = shut >= 1 ? "var(--ground)" : "none";
        curtain.style.visibility = phase === "idle" ? "hidden" : "visible";
      }
      root.dataset.phase = phase;
      const count = countRef.current;
      if (count) count.style.opacity = (Math.min(span(t, DEAL_AT, DEAL_AT + 0.4), 1 - span(rise, 0, 0.35))).toFixed(3);
      if (numberRef.current) numberRef.current.textContent = String(Math.round(deal * 100)).padStart(3, "0");
      for (const el of [headRef.current, footRef.current]) {
        if (!el) continue;
        el.style.opacity = text.toFixed(3);
        el.style.transform = `translate3d(0,${((1 - text) * 18).toFixed(2)}px,0)`;
      }
    };

    const finish = () => {
      cancelAnimationFrame(frame);
      phase = "done";
      apply(END);
      unlockScroll();
      setPlayed(true);
    };

    const tick = (now: number) => {
      const t = (now - startedAt) / 1000;
      if (t >= END) return finish();
      apply(t);
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (phase !== "idle") return;
      phase = "playing";
      lockScroll();
      jumpTo(root.getBoundingClientRect().top + window.scrollY);
      startedAt = performance.now();
      frame = requestAnimationFrame(tick);
    };

    // The opening only starts from a scroll made while the stage fills the screen.
    const inPlace = () => Math.abs(root.getBoundingClientRect().top) < window.innerHeight * 0.3;
    const onWheel = (event: WheelEvent) => {
      if (handoff || phase !== "idle" || event.deltaY <= 0 || !inPlace()) return;
      event.preventDefault();
      start();
    };
    const onTouch = () => {
      if (!handoff && phase === "idle" && inPlace()) start();
    };
    // A scroll that came some other way (scrollbar, script) still starts it, while the stage is mostly on screen.
    let scrolledTo = window.scrollY;
    const onScroll = () => {
      const down = window.scrollY >= scrolledTo;
      scrolledTo = window.scrollY;
      if (phase !== "idle") return;
      const box = root.getBoundingClientRect();
      if (handoff) {
        // The stage's top edge enters at the bottom of the screen just as the video finishes growing,
        // so a little further is the cue. Met from below instead, it is simply already open.
        if (down && box.top <= window.innerHeight * (1 - SLIGHT) && box.bottom > window.innerHeight * 0.5) start();
        else if (!down && box.bottom > 0 && box.top < 0) finish();
      } else if (box.top < -2 && box.bottom > window.innerHeight * 0.5) start();
    };
    const onKey = (event: KeyboardEvent) => {
      if (!handoff && phase === "idle" && START_KEYS.has(event.key) && inPlace()) {
        event.preventDefault();
        start();
      } else if (phase === "playing" && (event.key === "Escape" || event.key === "Tab")) {
        // Never trap anyone in the opening.
        finish();
      }
    };
    const onResize = () => {
      measure();
      apply(shown);
    };

    measure();
    if (reduced) {
      phase = "done";
      apply(END);
    } else {
      apply(0);
      if (autoplay) start();
      // Loaded part-way down the page, past the point where it would have played.
      else if (handoff && root.getBoundingClientRect().top < -2) finish();
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey);
    const sizes = new ResizeObserver(onResize);
    sizes.observe(root);

    return () => {
      cancelAnimationFrame(frame);
      unlockScroll();
      sizes.disconnect();
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, [autoplay, handoff]);

  const project = projects[focused];
  const href = projectHref(project);
  const external = href.startsWith("http");

  return (
    <section ref={rootRef} id="work" aria-labelledby="work-title" className={`work-intro relative isolate h-svh overflow-clip ${handoff ? "z-10" : "bg-ground"}`}>
      {handoff && (
        <div ref={curtainRef} aria-hidden="true" className="work-curtain">
          <div ref={holeRef} />
        </div>
      )}
      <header
        ref={headRef}
        className="absolute inset-x-[var(--gutter)] top-0 flex h-[var(--box-top)] items-end justify-between gap-6 pb-4 opacity-0"
      >
        <h2 id="work-title" className="text-[clamp(28px,3.6vw,52px)] font-medium leading-none tracking-[-0.035em]">
          Selected work
        </h2>
        <p className="kicker pb-1 max-sm:hidden">03 / Work</p>
      </header>

      <div ref={sceneRef} data-backdrop={backdrop} className="work-scene">
        <div ref={skyRef} aria-hidden="true" className="absolute inset-0 opacity-0">
          <Image src="/work/sky/sky-day.webp" alt="" fill sizes="100vw" data-on={backdrop === "day"} className="work-layer object-cover" />
          <Image src="/work/sky/sky-night.webp" alt="" fill sizes="100vw" data-on={backdrop === "night"} className="work-layer object-cover" />
          <div data-on={backdrop === "stars"} className="work-layer absolute inset-0 bg-[#0e0e10]">
            <SpaceField fill />
          </div>
          {/* A dark tint over the backdrop only, behind the cards, so they stand off it. */}
          <div className="work-haze" />
        </div>

        <Deck projects={projects} onFocus={onFocus} drive={drive} seat={SEAT} around={36} tight scrollTurns />

        {/* Opaque, so the wheel rises out of the clouds instead of showing through them. */}
        <div ref={cloudsRef} aria-hidden="true" className="work-clouds opacity-0">
          <Image src="/work/sky/clouds-day.webp" alt="" width={2172} height={724} sizes="100vw" data-on={backdrop === "day"} className="work-layer" />
          <Image src="/work/sky/clouds-night.webp" alt="" width={2172} height={724} sizes="100vw" data-on={backdrop === "night"} className="work-layer" />
        </div>
      </div>

      <div
        ref={footRef}
        className="absolute inset-x-[var(--gutter)] bottom-0 flex h-[var(--box-bottom)] items-start justify-between gap-8 pt-5 opacity-0"
      >
        <div className="flex min-w-0 flex-col gap-2">
          <SwapText
            id={project.slug}
            text={`${String(project.order).padStart(2, "0")} / ${project.name} / ${project.kind}`}
            className="kicker"
          />
          <SwapText
            id={project.slug}
            text={project.oneLiner}
            delay={0.05}
            className="max-w-[34ch] text-[clamp(18px,2.1vw,30px)] font-medium leading-[1.12] tracking-[-0.03em]"
          />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-3">
          <a
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            tabIndex={settled ? undefined : -1}
            className="inline-flex h-11 items-center rounded-full border border-line-strong px-5 font-mono text-[12px] uppercase tracking-[0.12em] transition-colors duration-300 hover:border-ink"
          >
            <SwapLabel>{project.live ? "Open live" : project.source ? "Source" : "Details"}</SwapLabel>
            <span aria-hidden="true" className="arrow">
              ↗
            </span>
          </a>
          <p className="kicker max-sm:hidden">Scroll or drag to turn</p>
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>

      <div ref={countRef} aria-hidden="true" className="pointer-events-none absolute right-[var(--gutter)] top-[var(--gutter)] flex flex-col items-end gap-1 opacity-0">
        <span ref={numberRef} className="font-mono text-[clamp(44px,6vw,88px)] font-medium leading-none tracking-[-0.04em] tabular-nums">
          000
        </span>
        <span className="kicker">Dealing the work</span>
      </div>

      {/* The reel's last frame, as the pinned video leaves it. */}
      {!handoff && (
        <div ref={veilRef} aria-hidden="true" className="work-veil">
          <Image src={reel.poster} alt="" fill sizes="100vw" priority className="object-cover" />
          <p className="kicker absolute bottom-5 left-6 !text-ink">Keep scrolling ↓</p>
        </div>
      )}
    </section>
  );
}
