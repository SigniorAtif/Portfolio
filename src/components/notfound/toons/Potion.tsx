// Ported from iuridepaula/portfolio (MIT, see ./index.ts). Drawing unchanged.
import { LOOP_EASE_IN_OUT, part, runSmil, type Toon, type ToonSvgProps } from "./types";

export function PotionSvg({ ref }: ToonSvgProps) {
  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="-17 0 134 100" aria-hidden="true">
      <g className="potion-potion">
        <g className="vase">
          <g className="bottle">
            <path
              fill="#00c8c8"
              d="M55.6 23.2H44.8c-2.1 0-3.8-1.8-3.8-3.8l.1-6.4c0-1.6 1.4-3 3-3l12.6.1c1.6 0 3 1.4 3 3l-.1 6.4c-.3 2-2 3.7-4 3.7z"
            />
            <path
              fill="#fff"
              d="M64.7 25.8c0-.2.2-6.2.2-6.2.1-2.2-1.8-4.1-4-4l-20.4-.1c-2.2 0-4 1.8-4 4.1 0 0 .1 5.9 0 6.2C25.8 31 18.6 42 18.6 54.7 18.4 72.5 32.6 87 50.1 87c17.5.1 31.9-14.3 32-32.2.1-12.8-7-23.7-17.4-29zm10.1 28.8c-.1 13.7-11.1 24.7-24.6 24.7-13.5-.1-24.4-11.2-24.3-24.9S37 29.7 50.5 29.7c13.4.1 24.4 11.2 24.3 24.9z"
              opacity=".8"
            />
            <path
              fill="#e8d7ef"
              d="M50.4 29.7c-13.5 0-24.5 11.1-24.6 24.7 0 13.7 10.8 24.9 24.3 24.9s24.5-11.1 24.6-24.7c.2-13.7-10.8-24.8-24.3-24.9z"
              opacity=".8"
            />

            <g className="liquids">
              <path className="liquid2" fill="#4612a5">
                <animate
                  dur="1.6s"
                  repeatCount="indefinite"
                  attributeName="d"
                  values="M73.5 50.4c-.9-4.8-4.5-4.5-7.9-3.8-9.9 1.8-23.5 13-31.1 14.3-5.4 1-8-5.2-7.4-2.2 2.3 12.7 14.6 21.3 27.4 19 12.8-2.2 21.3-14.4 19-27.3z;
                         M73.5 50.4c-.9-4.8-1 5.3-4.4 5.9-11 2-19.7-6.3-36-3.9-5.5.8-6.6 3.3-6.1 6.3 2.3 12.7 14.6 21.3 27.4 19 12.9-2.2 21.4-14.4 19.1-27.3z;
                         M73.5 50.4c-.9-4.8-4.5-4.5-7.9-3.8-9.9 1.8-23.5 13-31.1 14.3-5.4 1-8-5.2-7.4-2.2 2.3 12.7 14.6 21.3 27.4 19 12.8-2.2 21.3-14.4 19-27.3z;"
                  calcMode="spline"
                  keySplines="0.455 0.03 0.515 0.955;
                         0.455 0.03 0.515 0.955"
                />
              </path>
              <path className="liquid" fill="#5918df">
                <animate
                  dur="1.4s"
                  repeatCount="indefinite"
                  attributeName="d"
                  values="M27.1 58.8c-.9-4.8 2.6-5.8 6.1-6.3 9.9-1.8 26.5 3.9 34.1 2.6 5.4-1 5.7-7.7 6.2-4.6 2.3 12.7-6.2 25.1-19 27.4-12.8 2.3-25-6.2-27.4-19.1z;
                         M27.1 58.8c-.9-4.8 2.8 2.9 6.2 2.2 9.9-1.8 21.9-13.1 33-14.6 5.5-.7 6.6.9 7.1 3.9 2.3 12.7-6.2 25.1-19 27.4-12.7 2.5-24.9-6-27.3-18.9z;
                         M27.1 58.8c-.9-4.8 2.6-5.8 6.1-6.3 9.9-1.8 26.5 3.9 34.1 2.6 5.4-1 5.7-7.7 6.2-4.6 2.3 12.7-6.2 25.1-19 27.4-12.8 2.3-25-6.2-27.4-19.1z;"
                  calcMode="spline"
                  keySplines="0.455 0.03 0.515 0.955;
                         0.455 0.03 0.515 0.955"
                />
              </path>
            </g>
          </g>
          <g className="drops">
            <ellipse
              className="drop2"
              cx="49.4"
              cy="37.5"
              fill="#5918df"
              rx="4.6"
              ry="4.6"
            />
            <ellipse
              className="drop"
              cx="59.8"
              cy="42"
              fill="#5918df"
              rx="2.8"
              ry="2.8"
            />
          </g>
        </g>
      </g>

    </svg>
  );
}

export const potion: Toon = {
  id: "potion",
  label: "A round flask of purple potion, rocking from side to side as it sloshes and bubbles.",
  Svg: PotionSvg,
  animate(svg, tl) {
    // The liquid sloshes by SMIL in the drawing itself.
    runSmil(svg, tl);
    const rise = { yPercent: 100, rotation: 0, scale: 1 };
    tl.addLabel("start", 0)
      .to(part(svg, "potion-potion"), { duration: 3, transformOrigin: "50% 90%", rotation: 15, ...LOOP_EASE_IN_OUT }, "start")
      // Slower than the original's half second, so a bubble is seen on more than a few 12 fps frames.
      .fromTo(
        part(svg, "drop"),
        rise,
        { duration: 1, transformOrigin: "20% 120%", rotation: 360, yPercent: -100, scale: 0, repeat: -1 },
        "start",
      )
      .fromTo(
        part(svg, "drop2"),
        rise,
        { duration: 1.4, transformOrigin: "0% 120%", rotation: -360, yPercent: -100, scale: 0, repeat: -1 },
        "start",
      );
  },
};
