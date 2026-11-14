"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { Project } from "@/content/projects";
import { Card } from "./Card";
import {
  DRIFT_DEG_PER_S,
  degPerPx,
  focusedSlot,
  mod,
  pose,
  rig,
  slotsFor,
  snap,
  spinFor,
  stageScale,
  timeline,
} from "./deckMath";

const FOLLOW = 9; // how fast the shown angle chases the target, 1/s
const FRICTION = 3.2; // how fast a flick dies, 1/s
const DRAG_PX = 6; // movement that turns a press into a drag
const PAUSE_MS = 80; // a pointer held still this long before release carries no flick
const SETTLE_MS = 140; // quiet time before the wheel centres the nearest card
const RESUME_MS = 2600; // quiet time before the drift starts again
const MEDIA_WAIT_MS = 1200; // longest the deal waits for card media
const SCROLL_TURN = 1.4; // a vertical scroll turns the wheel this much further than the same drag
const HOVER_PACE = 0.3; // share of the drift left while the pointer rests on a card
const PACE_EASE = 4; // how fast the drift slows and picks up again, 1/s
const PLAY_WITHIN_DEG = 40; // card videos play only this close to the top

/** Written by whoever stages the deck; read here every frame. */
export type DeckDrive = {
  deal: number;
  lift: number;
  /** Radius of the dealt fan, in stage pixels. The wheel grows from it to its own size with the lift. */
  fanRadius: number;
  /** Where the dealt fan's top card sits, in stage pixels from the top. */
  fanTop: number;
};

type Props = {
  projects: Project[];
  /** When set, the deal and lift follow this instead of playing once on scroll into view. */
  drive?: RefObject<DeckDrive>;
  /** Where the lifted top card sits, as a share of the stage height. */
  seat?: number;
  /** Roughly how many cards go round the wheel. More cards make a wider, flatter arc. */
  around?: number;
  /** Size the wheel from the cards alone, so they sit side by side at any stage width. */
  tight?: boolean;
  /** A scroll made over the wheel turns it instead of moving the page. */
  scrollTurns?: boolean;
  /** Called when another project reaches the top. `byUser` is false while the wheel drifts on its own. */
  onFocus: (index: number, byUser: boolean) => void;
};

/**
 * The wheel of cards. DOM and CSS 3D only: one animation-frame loop works
 * out every card's transform and writes it, skipping cards whose transform
 * did not change. Dealt once when it scrolls into view, then it drifts, and
 * can be dragged, flicked, scrolled sideways or stepped with the arrow keys.
 */
export default function Deck({ projects, onFocus, drive, seat = 0.5, around, tight = false, scrollTurns = false }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const onFocusRef = useRef(onFocus);
  useEffect(() => {
    onFocusRef.current = onFocus;
  }, [onFocus]);

  const count = projects.length;
  const slots = slotsFor(count, around);

  useEffect(() => {
    const stage = stageRef.current;
    const wheel = wheelRef.current;
    if (!stage || !wheel) return;
    const cards = cardRefs.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rest = rig(1, 1, slots); // the settled wheel: angles only, no pixels
    const restKick = rest.kick;

    // The whole state of the wheel.
    const s = {
      deal: reduced ? 1 : (drive?.current.deal ?? 0),
      lift: reduced ? 1 : (drive?.current.lift ?? 0),
      spin: restKick, // card 0 on top once lifted
      target: restKick,
      velocity: 0, // deg/s, left over from a flick
      dealtAt: 0, // 0 = not dealt yet
      scale: 1,
      top: 0, // the wheel's origin in the stage, px
      height: 0,
      onScreen: false,
      hover: false, // the mouse is on a card, not just somewhere on the stage
      pace: 1, // share of the drift speed in use
      focusWithin: false,
      dragging: false,
      snapped: true,
      lastInput: -Infinity,
      focused: Number.NaN,
      byUser: false,
    };
    const mouse = { x: 0, y: 0, inside: false };
    const cursor = cursorRef.current;
    let hovered: Element | null = null; // the card under the mouse
    const drag = { id: -1, startX: 0, lastX: 0, lastAt: 0, speed: 0 };
    // Nothing is assumed about what the cards carry already: a page kept alive while another was
    // open comes back with the last wheel still written on them, so the first frame writes them all.
    const written = { transforms: new Array<string>(slots).fill(""), shown: new Array<boolean | null>(slots).fill(null), tip: "" };
    const playing = new Array<boolean>(slots).fill(false);
    let frame = 0;
    let last = 0;
    let suppressClick = false;
    let waiting = false;

    const layout = () => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      const cardWidth = cards[0]?.offsetWidth || 168;
      s.scale = stageScale(width, cardWidth, slots, tight);
      // Put the lifted top card in the middle of the stage.
      const lifted = rig(1, s.scale, slots);
      s.height = height;
      s.top = height * seat + 4 - (lifted.pivot - lifted.radius);
      wheel.style.top = `${s.top.toFixed(1)}px`;
    };

    const touched = (now: number) => {
      s.lastInput = now;
      s.snapped = false;
      s.byUser = true;
    };

    const render = () => {
      const r = rig(s.lift, s.scale, slots);
      let tip = `rotateX(${r.tip.toFixed(2)}deg)`;
      if (drive) {
        // The staged fan is dealt small and at its own height, then grows into the wheel's seat.
        const dealt = rig(0, s.scale, slots);
        const fan = drive.current.fanRadius / dealt.radius;
        const size = fan + (1 - fan) * s.lift;
        const drop = (drive.current.fanTop - s.top - (dealt.pivot - dealt.radius) * fan) * (1 - s.lift);
        tip = `translate3d(0,${drop.toFixed(2)}px,0) ${tip} scale(${size.toFixed(4)})`;
      }
      if (tip !== written.tip) wheel.style.transform = written.tip = tip;

      for (let i = 0; i < slots; i++) {
        const card = cards[i];
        if (!card) continue;
        const at = pose(i, s.deal, s.spin, r);
        if (at.visible !== written.shown[i]) {
          written.shown[i] = at.visible;
          card.style.visibility = at.visible ? "visible" : "hidden";
        }
        if (at.visible && at.transform !== written.transforms[i]) {
          card.style.transform = written.transforms[i] = at.transform;
        }
        const play = at.visible && at.away < PLAY_WITHIN_DEG && s.lift >= 1;
        if (play !== playing[i]) {
          playing[i] = play;
          const video = card.querySelector("video");
          if (video) {
            if (play) void video.play().catch(() => {});
            else video.pause();
          }
        }
      }

      const top = focusedSlot(s.spin, r);
      if (top !== s.focused && s.lift >= 1) {
        const before = cards[mod(s.focused, slots)];
        if (before) delete before.dataset.focused;
        s.focused = top;
        const now = cards[mod(top, slots)];
        if (now) now.dataset.focused = "true";
        onFocusRef.current(mod(top, count), s.byUser);
      }
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (drive) {
        if (!reduced) {
          s.deal = drive.current.deal;
          s.lift = drive.current.lift;
        }
      } else if (s.dealtAt && s.lift < 1) {
        const at = timeline((now - s.dealtAt) / 1000);
        s.deal = at.deal;
        s.lift = at.lift;
      }

      // Cards move under a still pointer, so what it rests on is asked every frame.
      let over: Element | null = null;
      if (mouse.inside && s.lift >= 1) {
        const under = document.elementFromPoint(mouse.x, mouse.y);
        over = (under && stage.contains(under) && under.closest(".deck-card")) || null;
      }
      if (s.dragging) over = null;
      s.hover = !!over;
      if (over !== hovered) {
        // Marked here rather than left to :hover, which does not notice a card sliding under a still pointer.
        hovered?.removeAttribute("data-hover");
        over?.setAttribute("data-hover", "");
        hovered = over;
        if (cursor) cursor.toggleAttribute("data-on", !!over);
      }
      if (cursor && over) {
        const box = stage.getBoundingClientRect();
        cursor.style.transform = `translate3d(${(mouse.x - box.left).toFixed(1)}px,${(mouse.y - box.top).toFixed(1)}px,0)`;
      }
      s.pace += ((s.hover ? HOVER_PACE : 1) - s.pace) * (1 - Math.exp(-dt * PACE_EASE));

      if (s.lift >= 1 && !s.dragging) {
        const quiet = now - s.lastInput;
        if (Math.abs(s.velocity) > 1) {
          // A flick carries on and dies away.
          s.target += s.velocity * dt;
          s.velocity *= Math.exp(-dt * FRICTION);
          s.lastInput = now;
        } else {
          s.velocity = 0;
          const drifting = !reduced && !s.focusWithin && quiet > RESUME_MS;
          if (drifting) {
            s.target += DRIFT_DEG_PER_S * s.pace * dt;
            s.snapped = false;
            s.byUser = false;
          } else if (!s.snapped && quiet > SETTLE_MS) {
            s.target = snap(s.target, rest);
            s.snapped = true;
          }
        }
      }
      s.spin += (s.target - s.spin) * (1 - Math.exp(-dt * FOLLOW));
      render();
    };

    const run = () => {
      if (frame || !s.onScreen) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    /** Deal once the cards that will show have their pictures, or after a short wait. */
    const deal = () => {
      if (s.dealtAt || waiting) return;
      waiting = true;
      const images = Array.from(stage.querySelectorAll<HTMLImageElement>("a:not([aria-hidden]) img"));
      const ready = Promise.all(
        images.map((image) =>
          image.complete ? image.decode().catch(() => {}) : new Promise<void>((done) => image.addEventListener("load", () => done(), { once: true })),
        ),
      );
      const timeout = new Promise<void>((done) => setTimeout(done, MEDIA_WAIT_MS));
      void Promise.race([ready, timeout]).then(() => {
        s.dealtAt = performance.now();
        // The drift starts a moment after the lift ends.
        s.lastInput = s.dealtAt;
      });
    };

    const watcher = new IntersectionObserver(
      ([entry]) => {
        s.onScreen = entry.isIntersecting;
        if (s.onScreen) run();
        else stop();
        if (!reduced && !drive && entry.intersectionRatio >= 0.35) deal();
      },
      { threshold: [0, 0.35] },
    );
    watcher.observe(stage);
    const sizes = new ResizeObserver(layout);
    sizes.observe(stage);
    layout();
    render();

    // ---- input ----
    const onPointerDown = (event: PointerEvent) => {
      if (s.lift < 1 || (event.pointerType === "mouse" && event.button !== 0)) return;
      drag.id = event.pointerId;
      drag.startX = drag.lastX = event.clientX;
      drag.lastAt = event.timeStamp;
      drag.speed = 0;
      s.velocity = 0;
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "mouse") {
        mouse.x = event.clientX;
        mouse.y = event.clientY;
        mouse.inside = true;
      }
      if (event.pointerId !== drag.id) return;
      if (!s.dragging) {
        if (Math.abs(event.clientX - drag.startX) < DRAG_PX) return;
        s.dragging = true;
        stage.dataset.dragging = "true";
        // From here on the pointer belongs to the wheel, so the click that
        // follows the release never reaches the card's link.
        stage.setPointerCapture(event.pointerId);
      }
      const turn = -(event.clientX - drag.lastX) * degPerPx(rig(1, s.scale, slots));
      const dt = Math.max(event.timeStamp - drag.lastAt, 1) / 1000;
      drag.speed = drag.speed * 0.6 + (turn / dt) * 0.4;
      drag.lastX = event.clientX;
      drag.lastAt = event.timeStamp;
      s.target += turn;
      touched(performance.now());
    };
    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerId !== drag.id) return;
      drag.id = -1;
      if (!s.dragging) return;
      s.dragging = false;
      delete stage.dataset.dragging;
      // A pointer that rested before letting go was placing the wheel, not throwing it.
      s.velocity = event.timeStamp - drag.lastAt > PAUSE_MS ? 0 : Math.max(-500, Math.min(500, drag.speed));
      touched(performance.now());
      suppressClick = true;
      setTimeout(() => (suppressClick = false), 0);
    };
    const onClick = (event: MouseEvent) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const onWheel = (event: WheelEvent) => {
      const sideways = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      // Sideways always turns the wheel. A vertical wheel is the page's, unless the wheel was given it.
      if (s.lift < 1 || event.ctrlKey || !(sideways || scrollTurns)) return;
      event.preventDefault();
      const lines = event.deltaMode === 1 ? 16 : 1; // some mice report lines, not pixels
      const delta = (sideways ? event.deltaX : event.deltaY * SCROLL_TURN) * lines;
      s.target += delta * degPerPx(rig(1, s.scale, slots));
      s.velocity = 0;
      touched(performance.now());
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      s.target = snap(s.target, rest) + (event.key === "ArrowRight" ? rest.step : -rest.step);
      s.velocity = 0;
      touched(performance.now());
      s.snapped = true;
    };
    const onLeave = () => {
      mouse.inside = false;
    };
    const onFocusIn = (event: FocusEvent) => {
      s.focusWithin = true;
      // Tabbing to a card brings it to the top.
      const index = cards.indexOf(event.target as HTMLAnchorElement);
      if (index >= 0 && (event.target as Element).matches(":focus-visible")) {
        s.target = spinFor(index, rest, s.target);
        touched(performance.now());
        s.snapped = true;
      }
    };
    const onFocusOut = () => {
      s.focusWithin = stage.contains(document.activeElement) && document.activeElement !== document.body;
      s.lastInput = performance.now();
    };

    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerup", onPointerUp);
    stage.addEventListener("pointercancel", onPointerUp);
    stage.addEventListener("click", onClick, true);
    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("keydown", onKey);
    stage.addEventListener("pointerleave", onLeave);
    stage.addEventListener("focusin", onFocusIn);
    stage.addEventListener("focusout", onFocusOut);

    return () => {
      stop();
      // Leave no marks behind for the next run to trip over.
      hovered?.removeAttribute("data-hover");
      cursor?.removeAttribute("data-on");
      delete stage.dataset.dragging;
      // Asked of the stage: by now the card refs may already be let go.
      for (const card of stage.querySelectorAll<HTMLElement>(".deck-card")) {
        delete card.dataset.focused;
        card.querySelector("video")?.pause();
      }
      watcher.disconnect();
      sizes.disconnect();
      stage.removeEventListener("pointerdown", onPointerDown);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerup", onPointerUp);
      stage.removeEventListener("pointercancel", onPointerUp);
      stage.removeEventListener("click", onClick, true);
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("keydown", onKey);
      stage.removeEventListener("pointerleave", onLeave);
      stage.removeEventListener("focusin", onFocusIn);
      stage.removeEventListener("focusout", onFocusOut);
    };
  }, [count, slots, drive, seat, tight, scrollTurns]);

  return (
    <div
      ref={stageRef}
      role="group"
      aria-roledescription="carousel"
      aria-label="Selected work. Left and right arrow keys step through the projects."
      tabIndex={0}
      // Keeps the smooth scroller from moving the page with a wheel that is turning the deck.
      data-lenis-prevent={scrollTurns ? "" : undefined}
      className="deck-stage absolute inset-0 overflow-hidden rounded-[inherit]"
    >
      <div ref={wheelRef} className="deck-wheel">
        {Array.from({ length: slots }, (_, slot) => (
          <Card
            key={slot}
            ref={(node) => {
              cardRefs.current[slot] = node;
            }}
            project={projects[slot % count]}
            copy={slot >= count}
          />
        ))}
      </div>
      <span ref={cursorRef} aria-hidden="true" className="deck-cursor">
        Open
      </span>
    </div>
  );
}
