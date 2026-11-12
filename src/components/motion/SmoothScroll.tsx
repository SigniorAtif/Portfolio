"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { reducedMotion } from "@/lib/motion";

/**
 * Smooth wheel scrolling for the whole page, on GSAP's clock so scrubbed
 * ScrollTriggers and Lenis never disagree by a frame. Touch devices and
 * reduced motion keep native scrolling.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (reducedMotion() || window.matchMedia("(pointer: coarse)").matches) return;

    const lenis = new Lenis({ lerp: 0.1, syncTouch: false, autoRaf: false, anchors: true });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, []);

  return children;
}
