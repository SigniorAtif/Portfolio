"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { reducedMotion } from "@/lib/motion";

const DRIFT = 46; // px a row moves each second when the page is still
const PUSH = 0.55; // extra px per px/s of scroll speed
const MAX_LEAN = 9; // degrees the rows lean into a fast scroll

/**
 * The toolbox as two lines of large type running opposite ways. They drift on
 * their own, run faster with the scroll and lean into it, then settle. The
 * real list is read out once; the moving copies are decoration.
 */
export function AboutMarquee({ items }: { items: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const half = Math.ceil(items.length / 2);
  const rows = [items.slice(0, half), items.slice(half)];

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || reducedMotion()) return;
      const lines = Array.from(root.querySelectorAll<HTMLElement>("[data-row]"));
      const offsets = lines.map(() => 0);
      // Measured on refresh, never in the tick: reading a width there, between the
      // writes to each row, lays the page out again on every frame.
      let spans = lines.map(() => 1);
      const measure = () => (spans = lines.map((line) => line.scrollWidth / 2 || 1));
      measure();
      ScrollTrigger.addEventListener("refresh", measure);
      void document.fonts.ready.then(measure);
      let speed = 0;
      let lean = 0;
      let visible = false;

      const watch = ScrollTrigger.create({
        trigger: root,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => (visible = self.isActive),
        onUpdate: (self) => (speed = self.getVelocity()),
      });

      const tick = (_time: number, delta: number) => {
        if (!visible) return;
        const dt = Math.min(delta, 50) / 1000;
        speed *= 0.9; // scroll speed rings off once the scrolling stops
        lean += (Math.max(-MAX_LEAN, Math.min(MAX_LEAN, speed / 260)) - lean) * 0.12;
        lines.forEach((line, i) => {
          const dir = i % 2 ? 1 : -1;
          const span = spans[i];
          offsets[i] = (offsets[i] + (DRIFT + Math.abs(speed) * PUSH) * dt) % span;
          const x = dir < 0 ? -offsets[i] : offsets[i] - span;
          line.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0) skewX(${(-lean * dir).toFixed(2)}deg)`;
        });
      };
      gsap.ticker.add(tick);

      return () => {
        watch.kill();
        ScrollTrigger.removeEventListener("refresh", measure);
        gsap.ticker.remove(tick);
        lines.forEach((line) => (line.style.transform = ""));
      };
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className="about-marquee">
      <ul className="sr-only">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {rows.map((row, i) => (
        <div key={i} data-row data-back={i % 2 ? "" : undefined} aria-hidden="true" className="about-marquee-row">
          {[0, 1].map((copy) => (
            <ul key={copy}>
              {row.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ))}
        </div>
      ))}
    </div>
  );
}
