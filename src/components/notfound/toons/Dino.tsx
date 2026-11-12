// Ported from iuridepaula/portfolio (MIT, see ./index.ts). Drawing unchanged.
import { LOOP, LOOP_EASE_IN_OUT, part, random, type Toon, type ToonSvgProps } from "./types";

export function DinoSvg({ ref }: ToonSvgProps) {
  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="-16 -1 134 100.5" aria-hidden="true">
      <g className="dino">
        <g className="left-arm">
          <path
            fill="none"
            stroke="#7f4fb2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="5.138"
            d="M55,63.8c0,0-8,2.9-12.6,0.9s-6.3-6.3-6.2-10.2"
          />
        </g>
        <g className="tail">
          <path fill="#7f4fb2" d="M69 74.1c5.7.7 10.7-1.8 12.8-3 .5-.3 1.1.1 1 .7-1.8 11.9-23.1 13.6-23.9 14L69 74.1z" />
        </g>
        <g className="left-leg">
          <path
            fill="#7f4fb2"
            d="M55.3 93.6c-.2-2.2-.4-6.9-.1-10.7.2-2-1.2-3.7-3.2-4-1.8-.3-3.5.9-4 2.6l-3.6 11.8c-.3.8.3 1.6 1.2 1.6H54c.8.1 1.3-.5 1.3-1.3z"
          />
        </g>
        <g className="head">
          <g className="back-hair">
            <path fill="#002c58" d="M59.6 15.7S59.7 7 56.8 7s-7 7.4-7 7.4l9.8 1.3z" />
            <path fill="#002c58" d="M66.5 19.7s2.3-8.4-.5-9.1-8.6 5.4-8.6 5.4l9.1 3.7z" />
          </g>
          <path className="teeth1" fill="#e7edf1" d="M47.1 48.6H44l1.2 2.7c.1.3.6.3.7 0l1.2-2.7z" />
          <path
            fill="#ab63d6"
            d="M66.5 53c-.9-2.1-1.2-5.3-1.2-8.9 0-7.4 1.5-16.6 2.1-22.1.3-2.5-1.3-4.9-3.8-5.5-2.7-.6-6.6-1.5-10.8-2-10.8-1.2-24.7-.5-31.3 10-1.8 2.8-8 17.9-1.1 21.7 5.6 3 24.3 3.4 30.1 2.7-.3 4-11.5 10.7-11.5 22.3 0 9.1 7.7 16.3 16.9 16.3 9.3 0 16.9-7.6 16.9-16.9 0-7.4-4.6-13.6-6.3-17.6z"
          />
          <path
            fill="#9660c7"
            d="M67.5 22c-.7 5.4-2.1 14.6-2.1 22.1 0 0-3.8.6-4.8-8.7s7.1-18.6-7.7-20.8h-.1c4.3.5 8.1 1.3 10.8 2 2.5.6 4.2 2.9 3.9 5.4z"
          />
          <path
            className="mouth-chill"
            fill="none"
            stroke="#002c58"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth=".428"
            d="M47.7 49.1c9 .1 12.9-2 14-5.5"
          />
          <path
            className="mouth-smirk"
            style={{ display: "none" }}
            fill="none"
            stroke="#002c58"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth=".428"
            d="M54.6,47.1c-0.6,0-0.7,1-3,1"
          />
          <path className="teeth2" fill="#e7edf1" d="M47.7 49.1l1.6 3c.2.3.7.3.9 0l1.2-2.6.2-.5-3.9.1z" />
          <g className="headphone">
            <path fill="#ff0110" d="M71.5 28.1l.6-3.5-6.2-.6-.9 3.8 6.5.3z" />
            <path
              fill="#ff0110"
              d="M61.1 35.1c0 7.9 6.3 8 8.5 8 3.5 0 4.1-3.6 4.1-8s-.6-8-4.1-8c-4.1 0-8.5.9-8.5 8z"
            />
            <path fill="#ff5153" d="M63.8 35.1c0 4.5 2.3 8 5.8 8 3 0 6.3-3.6 6.3-8s-2.8-8-6.3-8-5.8 3.5-5.8 8z" />
            <path
              fill="#ff5153"
              d="M33.4 15.7c-.4-.4-.4-.7-.3-1.2 2.1-12.1 24.2-7.2 34-3.8 8.3 3 6.7 11 5.8 14-.2.7-.9 1.1-1.5 1l-4.4-.3h-.7c-.9-.1-1.6-1-1.3-1.9.5-1.4 1-3.4 1.2-5.4.2-2.6-.4-5.1-3-5.9-5.7-1.6-24-7.1-27.2 2.8 0 0-.8.2-1.4.3-.5.2-1.2.4-1.2.4z"
            />
            <path
              className="sounds"
              fill="none"
              stroke="#fff"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeMiterlimit="10"
              d="M76.5 32.5c2.1-1.8 4.4-3.5 6.7-4.9m-10 .5c.7-1.7.8-7.1-.6-8.6m4.6 18.7c2.5-.4 2 .1 2 2.3 2-.8 5.4.3 7.2 1.8m-11.6.8c-4 3.8 3.6 1.8 3 4.3-.3.9-2.5 1.4-2.4 2.5.7.8 1.7 1.2 2.8 1.3"
            />
          </g>
          <g className="eye">
            <circle cx="53" cy="40.3" r="2.8" fill="#002c58" />
            <circle className="bright" cx="53.7" cy="38.7" r=".7" fill="#e7edf1" />
          </g>
          <g className="front-hair">
            <path fill="#002c58" d="M34.8 15.3c-.3-.6-2.8-4.8-4.4-3.7-1.5 1.1-.9 4.8-.8 5.6 1.7-.8 3.4-1.4 5.2-1.9z" />
            <path fill="#002c58" d="M42.2 14.2c-.5-1.1-3.2-6.6-4.8-6-1.4.5-2.1 5.1-2.4 7.1 2.3-.6 4.8-1 7.2-1.1z" />
            <path fill="#002c58" d="M50.8 14.4c-.2-1.4-2-9.4-4.2-9.4-2.3 0-4.1 8-4.3 9.2 2.9-.2 5.8-.1 8.5.2z" />
          </g>
        </g>
        <g className="right-leg">
          <path
            fill="#ab63d6"
            d="M67.4 93.6c-.2-2.2-.4-6.9-.1-10.7.2-2-1.2-3.7-3.2-4-1.8-.3-3.5.9-4 2.6l-3.6 11.8c-.3.8.3 1.6 1.2 1.6h8.4c.8.1 1.4-.5 1.3-1.3z"
          />
        </g>
        <g className="right-arm">
          <path
            fill="none"
            stroke="#ae71db"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="5.138"
            d="M64.8 59.4s4.1 6.6-.6 8.3c-4.8 1.6-9-.3-11.5-3.3"
          />
        </g>
      </g>
    </svg>
  );
}

/**
 * The old Dino picked one of four songs per visit, and the song set the beat
 * and the face. Each mood below goes with the song at the same index.
 */
const MOODS = [
  { beat: 0.3, nod: 9.6, eyesShut: true },
  { beat: 1, nod: 9.6, eyesShut: true },
  { beat: 0.2, nod: 6.4, eyesShut: false },
  { beat: 0.3, nod: 9.6, eyesShut: false },
];

/** What is in the headphones, one per mood. Opened by a click where the dino is shown as himself. */
export const DINO_SONGS = [
  "https://www.youtube.com/watch?v=EpX1_YJPGAY", // a dog
  "https://open.spotify.com/track/39uLYYZytVUwcjgeYLI409", // Howl's Moving Castle
  "https://www.youtube.com/watch?v=hvL1339luv0", // a cat
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // the original
];

/** A mood (and so a song) for this visit. Only call from client code after mount. */
export function randomDinoMood(): number {
  return random(0, MOODS.length - 1);
}

export const dino: Toon = {
  id: "dino",
  label: "A dinosaur in headphones, dancing to music.",
  Svg: DinoSvg,
  animate: (svg, tl) => animateDino(svg, tl, randomDinoMood()),
};

/** Fills a paused timeline with the dance for one mood. */
export function animateDino(svg: SVGSVGElement, tl: gsap.core.Timeline, mood: number): void {
  const { beat, nod, eyesShut } = MOODS[mood];
  const eye = part(svg, "eye");
  const bright = part(svg, "bright");

  if (eyesShut) {
    // Lost in the music: eyes shut, grinning, no teeth.
    tl.set([bright, part(svg, "teeth1"), part(svg, "teeth2"), part(svg, "mouth-chill")], { display: "none" }, 0)
      .set(part(svg, "mouth-smirk"), { display: "inline" }, 0)
      .set(eye, { scaleY: 0.1, transformOrigin: "50% 50%" }, 0);
  }

  tl.addLabel("start", 0)
    .to(part(svg, "left-leg"), { duration: beat, skewX: -20, transformOrigin: "50% 100%", ...LOOP }, "start")
    .to(part(svg, "right-leg"), { duration: beat, skewX: 20, transformOrigin: "50% 100%", ...LOOP }, "start")
    .to(part(svg, "headphone"), { duration: beat / 2, scale: 1.1, transformOrigin: "20% 20%", ...LOOP }, "start")
    .to([part(svg, "left-arm"), part(svg, "right-arm")], { duration: beat, yPercent: 20, ...LOOP_EASE_IN_OUT }, "start")
    .to(part(svg, "tail"), { duration: beat, transformOrigin: "25% 50%", rotation: 20, ...LOOP_EASE_IN_OUT }, "start")
    .to(part(svg, "head"), { duration: beat, transformOrigin: "85% 100%", rotation: nod, ...LOOP_EASE_IN_OUT }, "start");

  if (!eyesShut) {
    // Blinks every few seconds, slow enough to land on a 12 fps frame.
    const blink = { repeat: -1, repeatDelay: 3 };
    tl.to(
      eye,
      { keyframes: [{ scaleY: 0.1, duration: 0.1 }, { scaleY: 1, duration: 0.1 }], transformOrigin: "50% 50%", ...blink },
      "start",
    ).to(bright, { keyframes: [{ autoAlpha: 0, duration: 0.1 }, { autoAlpha: 1, duration: 0.1 }], ...blink }, "start");
  }
}
