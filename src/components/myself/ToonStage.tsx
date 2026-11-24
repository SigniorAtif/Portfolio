"use client";

import { useRef, type RefObject } from "react";
import { AsciiDrawing } from "@/components/notfound/AsciiToon";
import { AstronautSvg, animateAstronaut } from "@/components/notfound/toons/Astronaut";
import { CoffeeMugSvg } from "@/components/notfound/toons/CoffeeMug";
import { DINO_SONGS, DinoSvg, animateDino, randomDinoMood } from "@/components/notfound/toons/Dino";
import { LongBeamUfoSvg, ufo } from "@/components/notfound/toons/UFO";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { viewportHeight } from "@/lib/viewport";

const random = gsap.utils.random;

/** The exit plays once the middle of the section's parts (kicker to picture) has risen to this share of the screen. */
export const EXIT_AT = 0.41;
/** ...and is over when the next section's top is this share of the screen short of the top: a little before its words come on. */
const EXIT_END = 0.12;
/** Share of the exit over which the statement and the rest fade out. */
const FADE = 0.6;
/** The ease of the exit: the fade, and away from touch the astronaut and his mug going to their corners over the whole of it. */
const LEAVING = "power1.inOut";
/** On touch screens, the ease the astronaut and his mug slide into their corners on, over the rest of the exit once the fade is done. */
const ARRIVING = "power2.out";

// The dino's song for this visit, picked the first time he is drawn. It sets
// his beat and his face, and the click on his head opens it.
let mood = -1;
function animateStageDino(svg: SVGSVGElement, tl: gsap.core.Timeline) {
  if (mood < 0) mood = randomDinoMood();
  // The lines coming off his headphones show only while his head is hovered.
  tl.set(svg.querySelector(".sounds"), { opacity: 0 }, 0);
  animateDino(svg, tl, mood);
}

/**
 * The old portfolio's company for the statement: the astronaut, his mug
 * adrift beside him, and the dino dancing. They are drawn in dots, the same
 * way as the 404's toon.
 *
 * They stand round the section's picture (places in globals.css) and are
 * fixed to the viewport, so the text scrolls past them. Once the statement
 * is past the middle of the screen (EXIT_AT) the camera pushes through, in
 * one motion scrubbed by the scroll: the statement, the picture, the dino and
 * the saucer fade out as they go on up (everything in the section marked
 * `data-exits`), while the astronaut swells into the bottom right corner and
 * the mug into the top left, to the sizes and places they had on the old
 * portfolio, and stay for the rest of the page. It is over a little before
 * the next section's words come on (EXIT_END).
 *
 * On a touch screen, where a toon growing on screen costs frames, only the
 * dino and the saucer stand round the picture. Once the fade is done, the
 * astronaut slides in from the right and the mug from the left, already at
 * their full sizes, to the same corners.
 *
 * Each toon sits in nested wrappers, one per motion (entrance, exit, idle
 * drift), so no two animations write to the same element. The drift is the
 * innermost: it spins, and anything it wrapped would be swung round with it.
 *
 * While the section is slowed (see Myself) each toon also drifts a little
 * against the picture, by its `data-depth`: a share of the screen's height it
 * crosses over the slow band, up for the far ones and down for the near.
 * `drift` is how far through that band the section is, from -0.5 to 0.5.
 *
 * Place inside the section the toons belong to. Reduced motion sets them in the section as
 * still drawings instead (see `.toon-stage` in globals.css).
 */
export function ToonStage({ drift }: { drift: RefObject<number> }) {
  const stageRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const stage = stageRef.current;
      const home = stage?.closest("section");
      if (!stage || !home) return;

      const conditions = { motion: "(prefers-reduced-motion: no-preference)", touch: "(pointer: coarse)" };
      gsap.matchMedia().add(conditions, (context) => {
        const { motion, touch } = context.conditions as Record<keyof typeof conditions, boolean>;
        if (!motion) return;
        // The big drifts are done on the canvases, not inside the drawings, where they
        // would carry the toon out of its frame of dots.
        const sway = { duration: 5, ease: "power2.inOut", repeat: -1, yoyo: true, transformOrigin: "50% 50%" };
        const drifts = gsap
          .timeline({ paused: true })
          .to(
            stage.querySelector('[data-drift="mug"]'),
            { yPercent: random(-10, 50), xPercent: random(-10, 40), rotation: random(0, 360), ...sway },
            0,
          )
          .to(
            stage.querySelector('[data-drift="astronaut"]'),
            { yPercent: random(-28, -14), rotation: random(-80, 80), ...sway },
            0,
          );

        // The toons are fixed to the viewport at the place the picture holds. Wherever the
        // picture really is (rising to that place, or leaving it), the whole company is
        // carried the same distance, so it never slides across the photo.
        const follow = stage.querySelector<HTMLElement>(".toon-follow")!;
        const tile = home.querySelector<HTMLElement>(".myself-tile");
        const held = stage.querySelector<HTMLElement>(".toon-held")!; // sits at the place the toons are laid out round
        const setY = gsap.quickSetter(follow, "y", "px");
        // The entrance on these elements only scales and shifts them by percentages, so y is free.
        const depths = gsap.utils.toArray<HTMLElement>("[data-depth]", stage).map((el) => ({
          set: gsap.quickSetter(el, "y", "px"),
          depth: Number(el.dataset.depth),
          stays: el.dataset.stays !== undefined,
        }));
        const leaving = gsap.parseEase(LEAVING);
        const exits = gsap.utils.toArray<HTMLElement>("[data-exits]", home);
        const leave = (name: string) => stage.querySelector<HTMLElement>(`[data-leave="${name}"]`)!;
        // On touch, the two that arrive are out of sight, and draw nothing, until the fade is done.
        const arrivals = [leave("astronaut"), leave("mug")];
        if (touch) gsap.set(arrivals, { autoAlpha: 0 });
        let arrived = false;
        // On a phone, redrawing the toons while they slide costs frames, so for as
        // long as the exit is under way they hold their last frame (see DotCanvas).
        let still = false;
        let exitTl: gsap.core.Timeline | null = null;
        let foot = 0; // the section's padding under its parts, measured on refresh
        // Eases the exit after the scroll, as a scrub would.
        const exit = { at: 0 };
        const exitTo = gsap.quickTo(exit, "at", { duration: 0.6, ease: "power3", onUpdate: () => void exitTl?.progress(exit.at) });
        const track = () => {
          const vh = viewportHeight();
          const top = tile ? tile.getBoundingClientRect().top - held.offsetTop : 0;
          // The exit runs on where the section's parts are on screen, not on the scroll's
          // number: the section moves them itself. It starts as their middle passes EXIT_AT
          // and ends where that middle is when the next section's top is at EXIT_END.
          let high = Infinity;
          let low = -Infinity;
          for (const el of exits) {
            const rect = el.getBoundingClientRect();
            high = Math.min(high, rect.top);
            low = Math.max(low, rect.bottom);
          }
          const risen = exits.length > 0 ? EXIT_AT * vh - (high + low) / 2 : 0; // px past the start
          const run = (EXIT_AT - EXIT_END) * vh + (low - high) / 2 + foot;
          exitTo(gsap.utils.clamp(0, 1, risen / run));

          const progress = exitTl?.progress() ?? 0;
          if (touch && (progress > FADE) !== arrived) {
            arrived = progress > FADE;
            gsap.set(arrivals, { autoAlpha: arrived ? 1 : 0 });
          }
          const moving = touch && progress > 0 && progress < 1;
          if (moving !== still) {
            still = moving;
            stage.toggleAttribute("data-still", still);
          }
          const gone = leaving(progress);
          if (gone === 1) {
            // Nothing is left by the picture, and the two that stay are in their corners.
            setY(0);
            for (const toon of depths) toon.set(0);
            return;
          }
          setY(top);
          const spread = drift.current * vh;
          if (touch) {
            // The two that stay never follow the picture: they keep to the screen.
            for (const toon of depths) toon.set(toon.stays ? -top : toon.depth * spread);
            return;
          }
          // The two that stay stop following the picture when the exit begins: they go from
          // where they were then straight to their corners, growing on the way. The picture
          // has risen as far as the rest since, so that is where it had them.
          const from = top + Math.max(risen, 0);
          for (const toon of depths) {
            if (toon.stays) toon.set((toon.depth * spread + from) * (1 - gone) - top);
            else toon.set(toon.depth * spread);
          }
        };

        // On stage from the moment the section shows, through to the end of the page.
        const show = (on: boolean) => {
          gsap.set(stage, { autoAlpha: on ? 1 : 0 });
          drifts.paused(!on);
          gsap.ticker.remove(track);
          if (on) gsap.ticker.add(track);
        };
        ScrollTrigger.create({
          trigger: home,
          start: "top bottom",
          end: "max",
          onEnter: () => show(true),
          onLeaveBack: () => show(false),
        });

        // On touch the astronaut and his mug sit out the entrance: they arrive at the exit.
        gsap.from(stage.querySelectorAll(touch ? "[data-enter]:not([data-stays])" : "[data-enter]"), {
          scale: 0,
          xPercent: 60,
          yPercent: 60,
          autoAlpha: 0,
          ease: "power3.out",
          stagger: 0.15,
          scrollTrigger: { trigger: home, start: "top 65%", end: "top 15%", scrub: 0.6 },
        });

        // The old ending, as transforms from wherever the stylesheet put each toon. There
        // the astronaut's box (20vw, or 20vh on phones) grew x4 with its right edge 10vw
        // past the screen's and its bottom 10vh under it; the mug's (a quarter of that)
        // grew x4 against the left edge, 8rem down. Sliding in on touch, each starts its
        // own width further out.
        const unit = () => (window.innerWidth <= 568 ? viewportHeight() : window.innerWidth) * 0.2;
        const box = (name: string) => leave(name).closest<HTMLElement>(".toon")!; // laid out by CSS, never moved by this timeline
        // Measured up from the stage's bottom edge: a refresh can land while the footer has
        // <main> transformed, when the stage is as tall as <main> and its top is far off screen.
        const centre = (el: HTMLElement) => ({
          x: el.offsetLeft + el.offsetWidth / 2,
          y: viewportHeight() - (stage.offsetHeight - el.offsetTop - el.offsetHeight / 2),
        });
        // The canvas is 1.44 times as wide as the astronaut in it.
        const astronaut = {
          x: () => window.innerWidth - centre(box("astronaut")).x,
          y: () => viewportHeight() * 1.1 - unit() / 2 - centre(box("astronaut")).y,
          scale: () => (unit() * 4 * 1.44) / box("astronaut").offsetWidth,
        };
        const mug = {
          x: () => unit() / 8 - centre(box("mug")).x,
          y: () => 128 + unit() / 8 - centre(box("mug")).y,
          scale: () => unit() / box("mug").offsetWidth,
        };
        const timeline = (exitTl = gsap
          .timeline({ paused: true, defaults: { duration: 1, ease: LEAVING } })
          // The statement, the picture, the dino and the saucer go out together.
          .to([...exits, leave("dino"), leave("ufo")], { autoAlpha: 0, duration: FADE, ease: "power1.inOut" }, 0));
        if (touch) {
          timeline
            .fromTo(
              leave("astronaut"),
              { ...astronaut, x: () => astronaut.x() + unit() * 4 * 1.44 * 0.6 },
              { ...astronaut, duration: 1 - FADE, ease: ARRIVING },
              FADE,
            )
            .fromTo(leave("mug"), { ...mug, x: () => mug.x() - unit() * 0.8 }, { ...mug, duration: 1 - FADE, ease: ARRIVING }, FADE);
        } else {
          // Over the whole of the exit, from where they stood by the picture.
          timeline.to(leave("astronaut"), astronaut, 0).to(leave("mug"), mug, 0);
        }
        // The corners are worked out from the layout, so again whenever it is measured.
        const remeasure = () => {
          foot = parseFloat(getComputedStyle(home).paddingBottom);
          const at = timeline.progress();
          timeline.progress(0).invalidate().progress(at);
        };
        ScrollTrigger.addEventListener("refresh", remeasure);
        remeasure();

        return () => {
          gsap.ticker.remove(track);
          stage.removeAttribute("data-still");
          ScrollTrigger.removeEventListener("refresh", remeasure);
        };
      });
    },
    { scope: stageRef },
  );

  const sounds = (on: boolean) => gsap.set(stageRef.current?.querySelector(".sounds") ?? null, { opacity: on ? 1 : 0 });

  return (
    <div ref={stageRef} className="toon-stage">
     <div className="toon-follow">
      <div className="toon-held" />
      <div data-enter data-depth="-0.05" className="toon toon-ufo">
        <div data-leave="ufo">
          <AsciiDrawing Svg={LongBeamUfoSvg} animate={ufo.animate} rows={90} grain={0.45} />
        </div>
      </div>
      <div data-enter data-depth="0.07" data-stays="" className="toon toon-mug">
        <div data-leave="mug">
          <div data-drift="mug">
            <AsciiDrawing Svg={CoffeeMugSvg} cols={18} rows={18} sharpness={4} />
          </div>
        </div>
      </div>
      <div data-enter data-depth="0.035" data-stays="" className="toon toon-astronaut">
        <div data-leave="astronaut">
          <div data-drift="astronaut">
            <AsciiDrawing Svg={AstronautSvg} animate={animateAstronaut} sharpness={4} />
          </div>
        </div>
      </div>
      <div data-enter data-depth="-0.02" className="toon toon-dino">
        <div data-leave="dino">
          <div className="toon-flip">
            <AsciiDrawing Svg={DinoSvg} animate={animateStageDino} />
          <button
            type="button"
            className="toon-dino-head"
            aria-label="Hear what the dino is listening to (opens in a new tab)"
            onPointerEnter={() => sounds(true)}
            onPointerLeave={() => sounds(false)}
            onFocus={() => sounds(true)}
            onBlur={() => sounds(false)}
            onClick={() => window.open(DINO_SONGS[Math.max(0, mood)], "_blank", "noopener,noreferrer")}
            />
          </div>
        </div>
      </div>
     </div>
    </div>
  );
}
