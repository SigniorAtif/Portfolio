"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Bodoni_Moda, Noto_Naskh_Arabic, Noto_Serif_Bengali, Noto_Serif_Devanagari } from "next/font/google";
import { gsap, inView, useGSAP } from "@/lib/gsap";
import { found, useEggs } from "@/lib/eggs";
import { EASE, reducedMotion } from "@/lib/motion";
import { site } from "@/content/site";

// Used for the footer name only. Variable font, so the weight is set in CSS.
const bodoni = Bodoni_Moda({ subsets: ["latin"], axes: ["opsz"], display: "swap", preload: false });

// The easter egg's scripts. Never preloaded: the browser only fetches a font
// once text is set in it, so nothing is downloaded until the egg runs.
const bengali = Noto_Serif_Bengali({ subsets: ["bengali"], weight: "700", display: "block", preload: false });
const arabic = Noto_Naskh_Arabic({ subsets: ["arabic"], weight: "700", display: "block", preload: false });
const devanagari = Noto_Serif_Devanagari({ subsets: ["devanagari"], weight: "700", display: "block", preload: false });

type Script = {
  id: string;
  /** The name's two words, first and last. */
  words: [string, string];
  /** Latin is set a letter to a span; the others as whole words, or splitting them breaks joining and conjuncts. */
  perLetter: boolean;
  font: { className: string; style: { fontFamily: string } };
  rtl?: boolean;
  /**
   * The most it is drawn at, against the Latin. Their marks above the line (the
   * Bengali and Devanagari ি, the Arabic hamza) stand taller than Bodoni's
   * capitals and would be cut off by the footer's top edge at full size.
   */
  size: number;
};

/** In the order the egg cycles through them, starting from the name as the page sets it. */
const SCRIPTS: Script[] = [
  { id: "latin", words: [site.first, site.last], perLetter: true, font: bodoni, size: 1 },
  { id: "bengali", words: ["আতিফ", "আহমেদ"], perLetter: false, font: bengali, size: 0.76 },
  { id: "arabic", words: ["عاطف", "أحمد"], perLetter: false, font: arabic, rtl: true, size: 0.78 },
  { id: "devanagari", words: ["आतिफ़", "अहमद"], perLetter: false, font: devanagari, size: 0.76 },
];

/** The taps it takes, all inside WINDOW_MS, to change the script. */
const TAPS = 5;
const WINDOW_MS = 2000;
/** The share of the footer's width a whole-word script may fill. */
const FILL = 0.94;

/**
 * The oversized name closing the footer. The letters stand on the footer's
 * bottom edge, stretched tall, and each rises out of that edge the first time
 * the mark scrolls into view. Decorative: the name is already in the footer.
 * Once a visitor has found every easter egg, it turns lime.
 *
 * An easter egg: five quick clicks or taps and the name drops through the
 * edge, and rises again in the next script, Bengali, Arabic, Devanagari and
 * back to Latin. Each script is shrunk from its foot, never past its `size`,
 * and further if it would run wider than the footer; it is a visual scale, so
 * the footer keeps its height. Under reduced motion it simply swaps.
 */
export function FooterMark() {
  const ref = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const { complete } = useEggs();
  const [at, setAt] = useState(0);
  const taps = useRef<number[]>([]);
  const busy = useRef(false);
  const toured = useRef(false);
  const script = SCRIPTS[at];

  useGSAP(
    () => {
      if (!ref.current || reducedMotion()) return;
      gsap.from(".footmark-in span", {
        yPercent: 115,
        duration: 1.1,
        ease: EASE.out,
        stagger: 0.06,
        scrollTrigger: inView(ref.current, 0.92),
      });
    },
    { scope: ref },
  );

  // A new script, before it is painted: held under the edge, shrunk to fit once its font is in, then raised.
  useLayoutEffect(() => {
    const line = lineRef.current;
    if (!line || (at === 0 && !toured.current)) return;
    const spans = line.querySelectorAll("span");
    const still = reducedMotion();
    if (at === 0) {
      // Back on Latin, a full tour done. The page already has its font.
      if (!still) gsap.fromTo(spans, { yPercent: 115 }, { yPercent: 0, duration: 0.8, ease: EASE.out, stagger: 0.05 });
      busy.current = false;
      found("names");
      return;
    }
    let live = true;
    const fit = () => {
      // Layout widths, which no transform touches: the words' full span, either way round.
      const boxes = Array.from(spans, (span) => [span.offsetLeft, span.offsetLeft + span.offsetWidth]);
      const width = Math.max(...boxes.map(([, right]) => right)) - Math.min(...boxes.map(([left]) => left));
      const room = (ref.current?.clientWidth ?? 0) * FILL;
      line.style.scale = String(Math.min(script.size, width > 0 ? room / width : 1));
    };
    if (!still) gsap.set(spans, { yPercent: 115 });
    const rise = () => {
      if (!live) return;
      fit();
      if (!still) gsap.to(spans, { yPercent: 0, duration: 0.8, ease: EASE.out, stagger: 0.08 });
      busy.current = false;
    };
    // Only the font itself, not next/font's fallback after it: that face points at a
    // system font many machines lack, and asking for it fails the whole load. A load
    // that fails anyway still lets the name rise, in whatever the browser has.
    const family = script.font.style.fontFamily.split(",")[0];
    document.fonts.load(`700 1em ${family}`, script.words.join(" ")).then(rise, rise);
    window.addEventListener("resize", fit);
    return () => {
      live = false;
      window.removeEventListener("resize", fit);
      line.style.scale = "";
    };
  }, [at, script]);

  const tap = () => {
    if (busy.current) return;
    const now = performance.now();
    taps.current = [...taps.current.filter((time) => now - time < WINDOW_MS), now];
    if (taps.current.length < TAPS) return;
    taps.current = [];
    busy.current = true;
    const next = (at + 1) % SCRIPTS.length;
    if (next === 0) toured.current = true;
    const spans = lineRef.current?.querySelectorAll("span");
    if (!spans || reducedMotion()) return setAt(next);
    gsap.to(spans, { yPercent: 115, duration: 0.45, ease: "power2.in", stagger: 0.03, onComplete: () => setAt(next) });
  };

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-complete={complete || undefined}
      data-script={script.id}
      className={`footmark ${bodoni.className}`}
      onClick={tap}
    >
      <div ref={lineRef} dir={script.rtl ? "rtl" : undefined} className={`footmark-in ${script.font.className}`}>
        {script.perLetter
          ? script.words.flatMap((word, w) =>
              Array.from(word, (letter, i) => (
                <span key={`${at}-${w}-${i}`} className={w ? "text-muted" : "text-ink"}>
                  {letter}
                </span>
              )),
            )
          : script.words.map((word, w) => (
              <span key={`${at}-${w}`} className={w ? "text-muted" : "text-ink"}>
                {word}
              </span>
            ))}
      </div>
    </div>
  );
}
