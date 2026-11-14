"use client";

import { useRef } from "react";
import { SpaceField } from "@/components/footer/SpaceField";
import { FadeUp } from "@/components/motion/FadeUp";
import { Decode, Rise } from "@/components/motion/Text";
import { DotText } from "@/components/notfound/DotText";
import { OnScreen } from "@/components/ui/OnScreen";
import { gsap, useGSAP } from "@/lib/gsap";
import { reducedMotion } from "@/lib/motion";
import { site } from "@/content/site";
import { Twinkles } from "./Sparks";

export type Fact = { label: string; value?: string };

/**
 * The first screen: the name assembling out of dots over drifting dust, the
 * one sentence under it, then four facts. Scrolling away, the name lifts and
 * thins out faster than the words, so the two part like layers.
 */
export function AboutOpening({ facts }: { facts: Fact[] }) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion()) return;
      const scrollTrigger = { trigger: ref.current, start: "top top", end: "bottom top", scrub: true };
      gsap.to("[data-name]", { yPercent: -26, scale: 1.08, opacity: 0.15, ease: "none", scrollTrigger });
      gsap.to("[data-words]", { yPercent: -8, ease: "none", scrollTrigger });
    },
    { scope: ref },
  );

  return (
    <section ref={ref} id="top" className="relative isolate flex min-h-svh flex-col justify-end overflow-clip px-[var(--gutter)] pb-[clamp(28px,5vh,56px)] pt-28">
      <div className="absolute inset-0 -z-10">
        <SpaceField fill density={1.3} />
      </div>

      <div data-name aria-hidden="true" className="relative mx-auto w-full max-w-[1500px] origin-bottom">
        {/* Unmounted off screen: it draws every frame. Coming back to the top, the name assembles again. */}
        <OnScreen margin={0.1} className="h-[clamp(150px,min(33vw,42svh),520px)] w-full">
          <DotText text={site.first} weight={800} dots={3200} className="h-full w-full" />
        </OnScreen>
        <Twinkles
          stars={[
            { x: "7%", y: "12%", size: 18 },
            { x: "91%", y: "4%", size: 12 },
            { x: "62%", y: "-6%", size: 9 },
            { x: "97%", y: "70%", size: 16 },
            { x: "1%", y: "78%", size: 10 },
          ]}
        />
      </div>

      <div data-words className="mt-[clamp(20px,4vh,48px)] grid items-end gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="flex flex-col gap-4">
          <Decode as="p" className="kicker">
            About
          </Decode>
          <Rise as="h1" delay={0.5} className="max-w-[18ch] text-[clamp(30px,4.2vw,64px)] font-medium leading-[1.04] tracking-[-0.035em]">
            {site.headline}
          </Rise>
        </div>
        <FadeUp as="dl" each="cards" delay={0.9} at={1} className="grid grid-cols-2 gap-x-8 gap-y-5 border-t border-line pt-5">
          {facts.map((fact) => (
            <div key={fact.label} className="flex flex-col gap-1.5">
              <dt className="kicker">{fact.label}</dt>
              <dd className="text-[16px] leading-[1.35]">
                {fact.value ?? <span aria-hidden="true" className="mt-2 block h-2.5 w-28 rounded-full bg-line" />}
              </dd>
            </div>
          ))}
        </FadeUp>
      </div>
    </section>
  );
}
