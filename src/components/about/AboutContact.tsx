"use client";

import { useRef } from "react";
import { SpaceField } from "@/components/footer/SpaceField";
import { Decode } from "@/components/motion/Text";
import { gsap, inView, useGSAP } from "@/lib/gsap";
import { DUR, EASE, reducedMotion } from "@/lib/motion";
import { personal } from "@/content/about";
import { site, socials } from "@/content/site";
import { SwapLabel } from "@/components/ui/SwapLabel";
import { Twinkles } from "./Sparks";

const REACH_PX = 170; // how far from the pointer a letter still feels it
const LIFT_EM = 0.16;

/**
 * The ask: the email as one huge link whose letters rise in one by one, then
 * lift in a wave under the mouse as it passes along the line.
 */
export function AboutContact({ kicker = "07 / Say hello" }: { kicker?: string }) {
  const ref = useRef<HTMLElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);

  useGSAP(
    () => {
      const link = linkRef.current;
      if (!link || reducedMotion()) return;
      gsap.from(link.querySelectorAll("[data-char]"), {
        yPercent: 115,
        duration: DUR.rise,
        ease: EASE.out,
        stagger: 0.022,
        scrollTrigger: inView(link),
      });
    },
    { scope: ref },
  );

  const wave = (event: React.PointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType !== "mouse" || reducedMotion()) return;
    const size = parseFloat(getComputedStyle(event.currentTarget).fontSize);
    for (const char of event.currentTarget.querySelectorAll<HTMLElement>("[data-char]")) {
      const box = char.getBoundingClientRect();
      const near = Math.max(0, 1 - Math.abs(box.left + box.width / 2 - event.clientX) / REACH_PX);
      gsap.to(char, { y: -near * near * LIFT_EM * size, duration: 0.45, ease: EASE.out, overwrite: "auto" });
    }
  };

  const rest = (event: React.PointerEvent<HTMLAnchorElement>) => {
    gsap.to(event.currentTarget.querySelectorAll("[data-char]"), { y: 0, duration: 0.8, ease: EASE.out, overwrite: "auto" });
  };

  return (
    <section ref={ref} aria-labelledby="contact-title" className="relative isolate overflow-clip px-[var(--gutter)] py-[clamp(96px,18vh,220px)]">
      <div className="absolute inset-0 -z-10">
        <SpaceField fill density={1.5} />
      </div>
      <div className="relative flex flex-col items-start gap-7">
        <Decode as="p" className="kicker">
          {kicker}
        </Decode>
        <h2 id="contact-title" className="sr-only">
          Contact
        </h2>
        <a
          ref={linkRef}
          href={`mailto:${site.email}`}
          aria-label={site.email}
          onPointerMove={wave}
          onPointerLeave={rest}
          className="about-email"
        >
          {site.email.split("").map((char, i) => (
            <span key={i} data-char aria-hidden="true">
              {char}
            </span>
          ))}
        </a>
        <Twinkles
          stars={[
            { x: "88%", y: "-8%", size: 20 },
            { x: "70%", y: "96%", size: 12 },
            { x: "97%", y: "62%", size: 10 },
          ]}
        />
        <ul className="flex flex-wrap gap-x-7 gap-y-2 font-mono text-sm tracking-[0.06em] text-muted">
          {[...socials, ...personal].map((link) => (
            <li key={link.href}>
              <a href={link.href} target="_blank" rel="noopener noreferrer" className="link-line hover:text-ink">
                <SwapLabel>{link.label}</SwapLabel>
                <span aria-hidden="true" className="arrow">
                  ↗
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
