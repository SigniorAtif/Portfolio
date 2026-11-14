"use client";

import { useRef } from "react";
import Link from "next/link";
import { Decode } from "@/components/motion/Text";
import { SwapLabel } from "@/components/ui/SwapLabel";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

export type Strand = { title: string; text: string; projects: { slug: string; name: string }[] };

/**
 * What he does, as three wide panels. With room and motion allowed, the
 * screen holds and the panels travel sideways under the scroll; a line along
 * the bottom shows how far along. Otherwise the panels simply stack.
 */
export function AboutStrands({ strands }: { strands: Strand[] }) {
  const ref = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const section = ref.current;
      const track = trackRef.current;
      if (!section || !track) return;

      const mm = gsap.matchMedia();
      mm.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
        section.dataset.track = "";
        const travel = () => Math.max(0, track.scrollWidth - window.innerWidth);
        const size = () => (section.style.height = `${window.innerHeight + travel()}px`);
        size();
        ScrollTrigger.addEventListener("refreshInit", size);

        const scrollTrigger = { trigger: section, start: "top top", end: "bottom bottom", scrub: true, invalidateOnRefresh: true };
        gsap.to(track, { x: () => -travel(), ease: "none", scrollTrigger });
        gsap.fromTo("[data-bar]", { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger });

        return () => {
          ScrollTrigger.removeEventListener("refreshInit", size);
          delete section.dataset.track;
          section.style.height = "";
        };
      });
    },
    { scope: ref },
  );

  return (
    <section ref={ref} aria-labelledby="strands-title" className="about-strands">
      <div className="about-strands-stick">
        <div ref={trackRef} className="about-strands-track">
          <header className="about-panel about-panel-lead">
            <Decode as="p" className="kicker">
              03 / What I do
            </Decode>
            <h2 id="strands-title" className="text-[clamp(40px,6vw,96px)] font-medium leading-[0.98] tracking-[-0.04em]">
              Three things, mostly.
            </h2>
            <p className="kicker max-[899px]:hidden">Keep scrolling →</p>
          </header>

          {strands.map((strand, i) => (
            <article key={strand.title} className="about-panel">
              <span aria-hidden="true" className="dot-ink block text-[clamp(72px,11vw,180px)] font-extrabold leading-[0.8] tracking-[-0.05em]">
                0{i + 1}
              </span>
              <div className="flex flex-col gap-6">
                <h3 className="text-[clamp(40px,6.4vw,104px)] font-medium leading-[0.96] tracking-[-0.04em]">{strand.title}</h3>
                <p className="max-w-[32rem] text-[18px] leading-[1.5] text-body">{strand.text}</p>
                <ul className="flex flex-wrap gap-x-7 gap-y-2 pt-2 text-[18px]">
                  {strand.projects.map((project) => (
                    <li key={project.slug}>
                      <Link href={`/work#${project.slug}`} className="link-line inline-flex items-baseline text-body hover:text-ink">
                        <SwapLabel>{project.name}</SwapLabel>
                        <span aria-hidden="true" className="arrow text-sm text-muted">
                          ↗
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
        <span data-bar aria-hidden="true" className="about-strands-bar" />
      </div>
    </section>
  );
}
