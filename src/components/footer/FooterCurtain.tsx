"use client";

import { useEffect, useRef } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { reducedMotion } from "@/lib/motion";

const MAX_BLUR_PX = 14;
const MAX_DIM = 0.45; // how far the page behind sinks towards the ground colour
const DRIFT_VH = 12; // how far the held page still creeps up while the footer rises

/**
 * Makes the footer arrive as a sheet instead of as more page. Place it
 * between `<main>` and the footer.
 *
 * When the end of the page is reached, `<main>` stops scrolling (it sticks
 * with its bottom edge on the viewport's bottom edge) and the footer slides
 * up over it from beneath. A fixed veil between the two blurs and dims the
 * held page in step with how much of the footer is showing. The held page is
 * not quite frozen: it keeps creeping up a little, much slower than the
 * footer, so the two read as layers at different depths.
 *
 * The footer needs an opaque background and a z-index above the veil's.
 */
export function FooterCurtain() {
  const veilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const veil = veilRef.current;
    const page = veil?.previousElementSibling;
    const footer = veil?.nextElementSibling;
    if (!veil || !(page instanceof HTMLElement) || !(footer instanceof HTMLElement)) return;

    // Hold the page: a negative sticky offset equal to the part of it that
    // does not fit the viewport pins its bottom edge to the viewport's.
    const hold = () => {
      page.style.position = "sticky";
      page.style.top = `${Math.min(0, window.innerHeight - page.offsetHeight)}px`;
    };
    const sizes = new ResizeObserver(hold);
    sizes.observe(page);
    window.addEventListener("resize", hold);
    hold();

    // Blur follows the scroll, so it is skipped under reduced motion: the
    // footer still slides over the held page, which simply stays sharp.
    const blur = reducedMotion()
      ? null
      : ScrollTrigger.create({
          trigger: footer,
          start: "top bottom",
          end: "bottom bottom",
          onUpdate: ({ progress }) => {
            // No backdrop filter at all while the footer is out of sight.
            veil.style.visibility = progress > 0 ? "visible" : "hidden";
            veil.style.setProperty("--reveal", progress.toFixed(3));
            // The footer's backdrop reads this to drift up behind the content.
            footer.style.setProperty("--reveal", progress.toFixed(3));
            // The gap this opens under the page is always behind the footer,
            // which rises several times faster.
            const drift = (progress * DRIFT_VH * window.innerHeight) / 100;
            page.style.transform = progress > 0 ? `translate3d(0, ${(-drift).toFixed(1)}px, 0)` : "";
          },
        });

    return () => {
      blur?.kill();
      footer.style.removeProperty("--reveal");
      sizes.disconnect();
      window.removeEventListener("resize", hold);
      page.style.transform = "";
      page.style.position = "";
      page.style.top = "";
    };
  }, []);

  return (
    <div
      ref={veilRef}
      aria-hidden="true"
      className="pointer-events-none invisible fixed inset-0 z-10"
      style={
        {
          "--reveal": 0,
          backdropFilter: `blur(calc(var(--reveal) * ${MAX_BLUR_PX}px))`,
          WebkitBackdropFilter: `blur(calc(var(--reveal) * ${MAX_BLUR_PX}px))`,
          background: `color-mix(in srgb, var(--ground) calc(var(--reveal) * ${MAX_DIM * 100}%), transparent)`,
        } as React.CSSProperties
      }
    />
  );
}
