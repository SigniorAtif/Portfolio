"use client";

import { useRef } from "react";
import { AsciiDrawing } from "@/components/notfound/AsciiToon";
import { AstronautSvg, animateAstronaut } from "@/components/notfound/toons/Astronaut";
import { CoffeeMugSvg } from "@/components/notfound/toons/CoffeeMug";
import { DINO_SONGS, DinoSvg, animateDino, randomDinoMood } from "@/components/notfound/toons/Dino";
import { LongBeamUfoSvg, ufo } from "@/components/notfound/toons/UFO";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

const random = gsap.utils.random;

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
 * fixed to the viewport, so the text scrolls past them. As the next section
 * arrives the camera pushes through, with the old portfolio's ending: the
 * dino shrinks away and the saucer takes off, while the astronaut swells into the bottom right
 * corner and the mug into the top left, to the sizes and places they had
 * there, and stay for the rest of the page.
 *
 * Each toon sits in nested wrappers, one per motion (entrance, exit, idle
 * drift), so no two animations write to the same element. The drift is the
 * innermost: it spins, and anything it wrapped would be swung round with it.
 *
 * Place inside the section the toons belong to. `until` is the id of the
 * section they leave through. Reduced motion sets them in the section as
 * still drawings instead (see `.toon-stage` in globals.css).
 */
export function ToonStage({ until }: { until: string }) {
  const stageRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const stage = stageRef.current;
      const home = stage?.closest("section");
      const exit = document.getElementById(until);
      if (!stage || !home || !exit) return;

      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        // The big drifts are done on the canvases, not inside the drawings, where they
        // would carry the toon out of its frame of dots.
        const drift = { duration: 5, ease: "power2.inOut", repeat: -1, yoyo: true, transformOrigin: "50% 50%" };
        const drifts = gsap
          .timeline({ paused: true })
          .to(
            stage.querySelector('[data-drift="mug"]'),
            { yPercent: random(-10, 50), xPercent: random(-10, 40), rotation: random(0, 360), ...drift },
            0,
          )
          .to(
            stage.querySelector('[data-drift="astronaut"]'),
            { yPercent: random(-28, -14), rotation: random(-80, 80), ...drift },
            0,
          );

        // The toons are fixed to the viewport at the place the picture holds. Wherever the
        // picture really is (rising to that place, or leaving it), the whole company is
        // carried the same distance, so it never slides across the photo. The exit lets go.
        const follow = stage.querySelector<HTMLElement>(".toon-follow")!;
        const tile = home.querySelector<HTMLElement>(".myself-tile");
        const held = stage.querySelector<HTMLElement>(".toon-held")!; // sits at the place the toons are laid out round
        const setY = gsap.quickSetter(follow, "y", "px");
        let exitTl: gsap.core.Timeline | null = null;
        const track = () => {
          // Let go slowly, and only fully once the picture has left the screen.
          const letGo = gsap.utils.clamp(0, 1, (exitTl?.progress() ?? 0) / 0.7) ** 2;
          if (!tile || letGo === 1) return setY(0);
          setY((tile.getBoundingClientRect().top - held.offsetTop) * (1 - letGo));
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

        gsap.from(stage.querySelectorAll("[data-enter]"), {
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
        // grew x4 against the left edge, 8rem down.
        const leave = (name: string) => stage.querySelector<HTMLElement>(`[data-leave="${name}"]`)!;
        const unit = () => (window.innerWidth <= 568 ? window.innerHeight : window.innerWidth) * 0.2;
        const box = (name: string) => leave(name).closest<HTMLElement>(".toon")!; // laid out by CSS, never moved by this timeline
        // Measured up from the stage's bottom edge: a refresh can land while the footer has
        // <main> transformed, when the stage is as tall as <main> and its top is far off screen.
        const centre = (el: HTMLElement) => ({
          x: el.offsetLeft + el.offsetWidth / 2,
          y: window.innerHeight - (stage.offsetHeight - el.offsetTop - el.offsetHeight / 2),
        });
        exitTl = gsap
          .timeline({
            scrollTrigger: { trigger: exit, start: "top bottom", end: "top top", scrub: 0.6, invalidateOnRefresh: true },
          })
          // The dino shrinks away the way he arrived, never dropping through the floor.
          .to(
            leave("dino"),
            { scale: 0, xPercent: 40, autoAlpha: 0, transformOrigin: "50% 100%", duration: 0.3, ease: "power2.in" },
            0,
          )
          // The saucer takes off the way it came.
          .to(leave("ufo"), { yPercent: -260, xPercent: -40, autoAlpha: 0, duration: 0.5, ease: "power3.in" }, 0)
          .to(
            leave("astronaut"),
            {
              x: () => window.innerWidth - centre(box("astronaut")).x,
              y: () => window.innerHeight * 1.1 - unit() / 2 - centre(box("astronaut")).y,
              // The canvas is 1.44 times as wide as the astronaut in it.
              scale: () => (unit() * 4 * 1.44) / box("astronaut").offsetWidth,
              duration: 0.7,
              ease: "power3.inOut",
            },
            0.3,
          )
          .to(
            leave("mug"),
            {
              x: () => unit() / 8 - centre(box("mug")).x,
              y: () => 128 + unit() / 8 - centre(box("mug")).y,
              scale: () => unit() / box("mug").offsetWidth,
              duration: 0.7,
              ease: "power3.inOut",
            },
            0.3,
          );

        return () => gsap.ticker.remove(track);
      });
    },
    { scope: stageRef },
  );

  const sounds = (on: boolean) => gsap.set(stageRef.current?.querySelector(".sounds") ?? null, { opacity: on ? 1 : 0 });

  return (
    <div ref={stageRef} className="toon-stage">
     <div className="toon-follow">
      <div className="toon-held" />
      <div data-enter className="toon toon-ufo">
        <div data-leave="ufo">
          <AsciiDrawing Svg={LongBeamUfoSvg} animate={ufo.animate} rows={90} grain={0.45} />
        </div>
      </div>
      <div data-enter className="toon toon-mug">
        <div data-leave="mug">
          <div data-drift="mug">
            <AsciiDrawing Svg={CoffeeMugSvg} cols={18} rows={18} sharpness={4} />
          </div>
        </div>
      </div>
      <div data-enter className="toon toon-astronaut">
        <div data-leave="astronaut">
          <div data-drift="astronaut">
            <AsciiDrawing Svg={AstronautSvg} animate={animateAstronaut} sharpness={4} />
          </div>
        </div>
      </div>
      <div data-enter className="toon toon-dino">
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
