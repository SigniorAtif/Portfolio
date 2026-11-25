"use client";

import { useEffect, useRef, useState } from "react";
import { AsciiMug, AsciiToon } from "@/components/notfound/AsciiToon";
import { toons } from "@/components/notfound/toons";
import { found } from "@/lib/eggs";
import { gsap } from "@/lib/gsap";
import { reducedMotion } from "@/lib/motion";

const SPEED = 220; // how fast the row marches, in px a second
const HOLD = 4; // how long the still row stands under reduced motion, in seconds

/**
 * The Konami code's easter egg: every toon, the five the site never shows
 * included, marches once along the bottom of the screen from right to left,
 * each one hopping to its own beat, and then the parade is gone. Under reduced
 * motion they stand in a row instead, then fade. It never takes a click or a
 * scroll. Played by `summon("parade")`; summoning it again starts it over.
 * Styles are `.parade` in globals.css.
 */
export function ToonParade({ onDone }: { onDone: () => void }) {
  const bandRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [still] = useState(reducedMotion);

  useEffect(() => {
    found("parade");
    const band = bandRef.current;
    const row = rowRef.current;
    if (!band || !row) return;
    // The band (its shade and the cast) fades in, and fades out once the cast is through.
    const run = gsap.timeline({ onComplete: onDone }).fromTo(band, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 0);
    if (still) run.to(band, { autoAlpha: 0, duration: 0.6 }, `+=${HOLD}`);
    else
      run
        .fromTo(row, { x: window.innerWidth }, { x: -row.offsetWidth, duration: (window.innerWidth + row.offsetWidth) / SPEED, ease: "none" }, 0)
        .to(band, { autoAlpha: 0, duration: 0.4 });
    return () => {
      run.kill();
    };
  }, [still, onDone]);

  return (
    <div ref={bandRef} aria-hidden="true" className="parade" data-reduced={still || undefined}>
      <div ref={rowRef} className="parade-row">
        {toons.map((toon) => (
          <div key={toon.id} className="parade-toon" data-toon={toon.id}>
            <AsciiToon id={toon.id} />
            {/* The astronaut never goes anywhere without his mug. */}
            {toon.id === "astronaut" && <AsciiMug className="parade-mug" />}
          </div>
        ))}
      </div>
    </div>
  );
}
