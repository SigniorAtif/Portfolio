// Ported from iuridepaula/portfolio (MIT, see ./index.ts). Drawing unchanged.
import { LOOP, LOOP_EASE_IN_OUT, part, random, type Toon, type ToonSvgProps } from "./types";

type UfoSvgProps = ToonSvgProps & {
  /** Can be made taller than the 404's frame to show more of the beam, which runs on far below it. */
  viewBox?: string;
  /**
   * Shades the ship for the dot renderer, where the original's bright colours all come
   * out as the same full dot: the saucer and its feet go dimmer than the alien, and a
   * row of lights runs round the rim.
   */
  textured?: boolean;
};

export function UfoSvg({ ref, viewBox = "2 -4 96 72", textured = false }: UfoSvgProps) {
  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={viewBox} aria-hidden="true">
      <linearGradient id="ufo-beam" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#0ff" stopOpacity=".75" />
        <stop offset="100%" stopColor="#0ff" stopOpacity="0" />
      </linearGradient>
      <g className="trish">
        <g className="light">
          <path fill="url(#ufo-beam)" d="M50 12.5L0 191.6h100L50 12.5z" />
        </g>
        <g className="ship">
          <path
            fill={textured ? "#3d1263" : "#5f1b9a"}
            d="M60.7 20.2c.1-2.4-5-5.2-10.4-5.3s-10.7 2-10.8 4.5c0 1.4 1.5 3.2 3.9 4.5l-.1 2.5c0 .1.1.3.3.3H45c.1 0 .3-.1.3-.3l.1-1.7c1.4.5 2.9.9 4.5.9 1.7.1 3.4-.2 4.9-.7l-.1 1.7c0 .1.1.3.3.3h1.4c.1 0 .3-.1.3-.3l.1-2.5c2.3-1 3.9-2.5 3.9-3.9z"
          />
          <ellipse cx="50.3" cy="17.2" fill={textured ? "#8a4fb5" : "#a95ed4"} rx="11.8" ry="6.8" />
          {textured &&
            [
              [40.6, 18.4],
              [43.6, 20.9],
              [47.6, 22.3],
              [53, 22.3],
              [57, 20.9],
              [60, 18.4],
            ].map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r="1.1" fill="#fff" />)}
          <g className="body">
            <path
              fill="#00b1e5"
              d="M50.2 19.7c1.6.1 3.1-.2 4.3-.8 0-.1 0-.2.1-.4l.2-5.9c.1-2.3-1.8-4.3-4.2-4.4-2.4-.1-4.4 1.8-4.5 4.1l-.2 5.9v.5c1.2.8 2.7 1 4.3 1z"
            />
            <g className="eye">
              <ellipse cx="50.4" cy="13.3" fill="#fff" rx="2.5" ry="2.5" />
              <ellipse cx="50.4" cy="13.3" fill="#004e88" rx="1" ry="1" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

/**
 * The saucer as the site shows it: a frame 120 units tall instead of 72, so more of the
 * beam is in it, and the ship shaded so it has some texture. Draw it on 90 rows, not 54.
 */
export function LongBeamUfoSvg(props: ToonSvgProps) {
  return <UfoSvg {...props} viewBox="2 -4 96 120" textured />;
}

export const ufo: Toon = {
  id: "ufo",
  label: "A small alien in a flying saucer, drifting about and swinging its light beam.",
  Svg: LongBeamUfoSvg,
  rows: 90,
  grain: 0.45,
  animate(svg, tl) {
    const trish = part(svg, "trish");
    const ship = part(svg, "ship");
    const eye = part(svg, "eye");

    // The old version flew a random motion path across the whole page. The
    // frame here is small, so the same idea is kept to short hops with the
    // beam swinging from the ship.
    const hop = (sign: 1 | -1) => ({
      xPercent: random(-14, 14),
      yPercent: random(-1, 5),
      rotation: sign * random(8, 18),
      duration: 2,
      ease: "sine.inOut",
    });

    tl.addLabel("start", 0)
      .to(ship, { duration: 0.25, rotation: 5, transformOrigin: "50% 75%", ...LOOP_EASE_IN_OUT }, "start")
      // Blinks, slow enough to land on a 12 fps frame.
      .to(
        eye,
        {
          keyframes: [{ scaleY: 0.1, duration: 0.1 }, { scaleY: 1, duration: 0.1 }],
          transformOrigin: "50% 50%",
          repeat: -1,
          repeatDelay: 1.618,
        },
        "start",
      )
      .to(
        trish,
        {
          keyframes: [hop(1), hop(-1), hop(1), hop(-1), hop(1), hop(-1)],
          transformOrigin: "50% 5%",
          ...LOOP,
        },
        "start",
      );
  },
};
