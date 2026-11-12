"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Decode, Lines, Rise } from "@/components/motion/Text";
import { SkeletonReveal, useLoadedMedia } from "@/components/ui/Skeleton";
import { reel, timestamp } from "@/content/reel";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { reducedMotion } from "@/lib/motion";
import { useReducedMotion } from "@/lib/useReducedMotion";

// Scroll spent on each phase of the takeover, in viewport heights.
const GROW_VH = 1.5; // tile grows until only a margin of the page is left around it
const GROW_VH_PHONE = 0.9;
const HOLD_VH = 0; // extra scroll with the video grown, before the next section starts up
const COVER_VH = 1; // the next section scrolls up over the video; it is see-through until it lands, so this is the hold
const TILE_RADIUS = 20;
const TEXT_GONE_AT = 0.6; // share of the grow by which all text has left

const hasVideo = reel.sources.length > 0;
const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

/**
 * The showreel. At rest it is an ordinary composed section: a two-part
 * headline around a paragraph, a chapter list and the video as one small
 * tile. When the tile reaches the middle of the screen the section pins and
 * the tile grows until the video fills the viewport but for a gutter all
 * round, corners still rounded; the text slides out of its way. After a
 * short hold the next section scrolls up over it.
 *
 * The video is laid out at viewport size from the start and only ever scaled
 * and clipped, so the picture is not resampled or distorted on the way.
 */
export function Reel() {
  const sectionRef = useRef<HTMLElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLVideoElement & HTMLImageElement>(null);
  const coveredRef = useRef(false);

  const [chapter, setChapter] = useState(0);
  const [muted, setMuted] = useState(true);
  const loaded = useLoadedMedia(mediaRef);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const section = sectionRef.current;
      const slot = slotRef.current;
      const stage = stageRef.current;
      const cover = coverRef.current;
      if (!section || !slot || !stage || !cover || reducedMotion()) return;

      const ease = gsap.parseEase("power2.inOut");
      // Everything the frame loop needs, measured on refresh.
      const m = { vw: 1, vh: 1, s0: 1, insetX: 0, insetY: 0, radius: TILE_RADIUS, pad: 0, dx: 0, grow: 1, total: 1 };

      /** Offset of the tile's centre inside the section, ignoring transforms and pinning. */
      const slotCentre = () => {
        let x = slot.offsetWidth / 2;
        let y = slot.offsetHeight / 2;
        for (let node: HTMLElement | null = slot; node && node !== section; node = node.offsetParent as HTMLElement | null) {
          x += node.offsetLeft;
          y += node.offsetTop;
        }
        return { x, y };
      };

      const measure = () => {
        m.vw = document.documentElement.clientWidth;
        m.vh = window.innerHeight;
        const width = slot.offsetWidth;
        const height = slot.offsetHeight;
        // Scale at which the viewport-sized stage just covers the tile; the
        // clip then trims whatever sticks out past the tile's own shape.
        m.s0 = Math.max(width / m.vw, height / m.vh);
        m.insetX = (m.vw - width / m.s0) / 2;
        m.insetY = (m.vh - height / m.s0) / 2;
        m.radius = TILE_RADIUS / m.s0;
        // Grown, the video stops one gutter short of every edge and keeps its corners.
        m.pad = parseFloat(getComputedStyle(section).paddingLeft) || 0;
        const centre = slotCentre();
        m.dx = m.vw / 2 - centre.x;
        m.grow = (m.vw < 768 ? GROW_VH_PHONE : GROW_VH) * m.vh;
        m.total = m.grow + (HOLD_VH + COVER_VH) * m.vh;

        stage.dataset.takeover = "";
        stage.style.width = `${m.vw}px`;
        stage.style.height = `${m.vh}px`;
        stage.style.marginLeft = `${-m.vw / 2}px`;
        stage.style.marginTop = `${-m.vh / 2}px`;

        // Pull the next section up so that it reaches the top of the screen
        // exactly as the pin lets go: it scrolls over the fixed video instead
        // of following it. The distance is where the section's bottom edge
        // sits on screen while pinned.
        cover.style.marginBottom = `${-(m.vh / 2 - centre.y + section.offsetHeight)}px`;
      };

      const apply = (progress: number) => {
        const g = ease(clamp((progress * m.total) / m.grow));
        const rest = 1 - g;
        stage.style.transform = `translate3d(${(m.dx * g).toFixed(2)}px,0,0) scale(${(m.s0 + (1 - m.s0) * g).toFixed(5)})`;
        stage.style.clipPath = `inset(${(m.insetY * rest + m.pad * g).toFixed(2)}px ${(m.insetX * rest + m.pad * g).toFixed(2)}px round ${(m.radius * rest + TILE_RADIUS * g).toFixed(2)}px)`;

        // Text leaves along its own axis and is gone before the video gets there.
        const out = clamp(g / TEXT_GONE_AT);
        if (topRef.current) topRef.current.style.transform = `translate3d(${(-6 * out).toFixed(2)}vw, ${(-125 * out).toFixed(2)}%, 0)`;
        if (bottomRef.current) bottomRef.current.style.transform = `translate3d(${(6 * out).toFixed(2)}vw, ${(125 * out).toFixed(2)}%, 0)`;
        if (sideRef.current) {
          sideRef.current.style.opacity = (1 - out).toFixed(3);
          sideRef.current.style.transform = `translate3d(0, ${(32 * out).toFixed(1)}px, 0) scale(${(1 - 0.04 * out).toFixed(4)})`;
        }
        if (hintRef.current) hintRef.current.style.opacity = (1 - clamp(g * 4)).toFixed(3);
        // Caption and sound control belong to the grown state only.
        const chrome = chromeRef.current;
        if (chrome) {
          const on = clamp((g - 0.92) / 0.08);
          chrome.style.opacity = on.toFixed(3);
          chrome.style.pointerEvents = on > 0.99 ? "auto" : "none";
        }
      };

      ScrollTrigger.addEventListener("refreshInit", measure);
      measure();

      ScrollTrigger.create({
        trigger: slot,
        start: "center center",
        end: () => `+=${m.total}`,
        pin: section,
        scrub: true,
        invalidateOnRefresh: true,
        onRefresh: (self) => apply(self.progress),
        onUpdate: (self) => apply(self.progress),
        // Once the next section has covered the video there is nothing to play for.
        onLeave: () => {
          coveredRef.current = true;
          if (hasVideo) mediaRef.current?.pause();
        },
        onEnterBack: () => {
          coveredRef.current = false;
          if (hasVideo) void mediaRef.current?.play().catch(() => {});
        },
      });

      return () => {
        ScrollTrigger.removeEventListener("refreshInit", measure);
        delete stage.dataset.takeover;
        for (const prop of ["width", "height", "margin-left", "margin-top", "transform", "clip-path"]) {
          stage.style.removeProperty(prop);
        }
        cover.style.marginBottom = "";
      };
    },
    { scope: sectionRef },
  );

  // Plays while on screen, pauses when out, and reports the current chapter.
  useEffect(() => {
    const video = mediaRef.current;
    const slot = slotRef.current;
    if (!hasVideo || !video || !slot) return;
    const watcher = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !coveredRef.current) void video.play().catch(() => {});
      else video.pause();
    });
    watcher.observe(slot);
    const onTime = () => {
      let index = 0;
      reel.chapters.forEach((item, i) => {
        if (video.currentTime >= item.at) index = i;
      });
      setChapter(index);
    };
    video.addEventListener("timeupdate", onTime);
    return () => {
      watcher.disconnect();
      video.removeEventListener("timeupdate", onTime);
    };
  }, []);

  const seek = (index: number) => {
    const video = mediaRef.current;
    if (!video) return;
    video.currentTime = reel.chapters[index].at;
    setChapter(index);
    void video.play().catch(() => {});
  };

  const current = reel.chapters[chapter];
  const caption = hasVideo ? `${timestamp(current.at)} / ${current.name}: ${current.note}` : "Showreel / being cut";
  const headline = "text-[clamp(44px,7.2vw,112px)] font-medium leading-[0.98] tracking-[-0.045em]";

  return (
    <>
      <section
        ref={sectionRef}
        id="reel"
        aria-labelledby="reel-title"
        className="relative isolate overflow-x-clip px-[var(--gutter)] pb-[clamp(48px,8vh,96px)] pt-[clamp(72px,12vh,128px)]"
      >
        <h2 id="reel-title" className="sr-only">
          {reel.headline.join(" ")}
        </h2>
        <Decode as="p" className="kicker">
          02 / Reel
        </Decode>

        <div aria-hidden="true" className="mt-5 overflow-clip py-[0.14em]">
          <div ref={topRef}>
            <Rise aria="none" className={headline}>
              {reel.headline[0]}
            </Rise>
          </div>
        </div>

        <div className="mt-[clamp(24px,3.4vw,52px)] grid grid-cols-[minmax(0,1fr)] items-end gap-x-10 gap-y-8 motion-safe:lg:grid-cols-[minmax(0,1fr)_minmax(0,40%)]">
          <div ref={sideRef} className="flex max-w-[46ch] flex-col gap-7 max-lg:order-last">
            <Lines as="p" className="text-[clamp(17px,1.35vw,21px)] leading-[1.45] text-body">
              {reel.intro}
            </Lines>
            <ol className="flex flex-col border-t border-line font-mono text-[12px] tracking-[0.04em]">
              {reel.chapters.map((item, i) => {
                const active = hasVideo && i === chapter;
                const row = (
                  <>
                    {active && (
                      // One marker that travels between rows instead of each row switching its own on.
                      <motion.span
                        layoutId="reel-chapter"
                        aria-hidden="true"
                        className="absolute inset-y-0 left-0 w-[2px] bg-ink"
                        transition={{ type: "spring", stiffness: 420, damping: 38 }}
                      />
                    )}
                    <span className="w-10 shrink-0 tabular-nums text-muted">{timestamp(item.at)}</span>
                    <span className={active ? "text-ink" : "text-body"}>{item.name}</span>
                    <span className="min-w-0 flex-1 truncate text-right text-muted">{item.note}</span>
                  </>
                );
                const rowClass = "relative flex w-full items-baseline gap-4 border-b border-line py-2 pl-3 text-left";
                return (
                  <li key={i}>
                    {hasVideo ? (
                      <button type="button" onClick={() => seek(i)} aria-current={active} className={`${rowClass} hover:text-ink`}>
                        {row}
                      </button>
                    ) : (
                      <div className={rowClass}>{row}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="relative z-10">
            <div ref={slotRef} className="relative aspect-video">
              <div ref={stageRef} className="reel-stage">
                <SkeletonReveal loaded={loaded} className="h-full w-full">
                  <div className="relative h-full w-full">
                    {hasVideo ? (
                      <video
                        ref={mediaRef}
                        muted={muted}
                        loop
                        playsInline
                        preload="metadata"
                        poster={reel.poster}
                        controls={reduced}
                        aria-label="Showreel: rury, Tasks, ruyah, Claude Code Connector, Pixan and QuExchange in use"
                        className="h-full w-full object-cover portrait:object-contain"
                      >
                        {reel.sources.map((source) => (
                          <source key={source.src} src={source.src} type={source.type} />
                        ))}
                      </video>
                    ) : (
                      <Image
                        ref={mediaRef}
                        src={reel.poster}
                        alt="Placeholder frame for the showreel, which is still being cut"
                        fill
                        sizes="100vw"
                        className="object-cover portrait:object-contain"
                      />
                    )}
                  </div>
                </SkeletonReveal>

                <div
                  ref={chromeRef}
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-4 p-[calc(var(--gutter)*1.75)] opacity-0"
                >
                  <Decode as="p" className="kicker !text-ink">
                    {caption}
                  </Decode>
                  {hasVideo && (
                    <button
                      type="button"
                      aria-pressed={!muted}
                      onClick={() => setMuted((value) => !value)}
                      className="kicker h-11 shrink-0 rounded-full border border-line-strong bg-ground/60 px-5 !text-ink backdrop-blur"
                    >
                      Sound {muted ? "off" : "on"}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <p ref={hintRef} aria-hidden="true" className="kicker mt-3 motion-reduce:hidden">
              Keep scrolling ↓
            </p>
          </div>
        </div>

        <div aria-hidden="true" className="mt-[clamp(24px,3.4vw,52px)] overflow-clip py-[0.14em] text-right">
          <div ref={bottomRef}>
            <Rise aria="none" at={0.97} className={headline}>
              {reel.headline[1]}
            </Rise>
          </div>
        </div>
      </section>
      {/* Negative margin set by the takeover: lets the next section slide over the pinned video. */}
      <div ref={coverRef} aria-hidden="true" />
    </>
  );
}
