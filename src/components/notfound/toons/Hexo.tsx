// Ported from iuridepaula/portfolio (MIT, see ./index.ts). Drawing unchanged.
import { LOOP, LOOP_EASE_IN_OUT, part, type Toon, type ToonSvgProps } from "./types";

export function HexoSvg({ ref }: ToonSvgProps) {
  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="-17 0 134 100" aria-hidden="true">
      <g className="Hexo-Hexo">
        <g className="Hexo-body">
          <path
            className="right-arm"
            fill="none"
            stroke="#9FD4E5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="8.141"
            d="M69 60.2s15.6 2.2 13.2 18.4c-2.6 17.5-18.7 3.6-24.5 8.9"
          />
          <path
            className="left-arm"
            fill="none"
            stroke="#D1F4FC"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="8.141"
            d="M37.4 61.6C22.9 93 26.6 56.1 12 62.3"
          />
          <g className="head">
            <path
              className="skin"
              fill="#D1F4FC"
              d="M36.1 19.4l21.4-9.5c4.7-2.1 10.3-.9 13.7 2.9l15.7 17.4c3.5 3.8 4.1 9.5 1.5 14L76.7 64.4c-2.5 4.5-7.7 6.8-12.8 5.7 0 0-19.8-4.1-25.3-5.7-4-1.1-6.6-5.3-7-9.6l-2.4-23.3c-.6-5.1 2.2-10 6.9-12.1z"
            />
            <path
              className="face"
              fill="none"
              stroke="#004E88"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeMiterlimit="10"
              strokeWidth=".775"
              d="M42.6 42.1c-.3 1.6-1.9 2.7-3.5 2.3-1.6-.3-2.7-1.9-2.3-3.5m19.1 4c-.3 1.6-1.9 2.7-3.5 2.3-1.6-.3-2.7-1.9-2.3-3.5m-2.4 7.2c-.3 1.6-1.9 2.7-3.5 2.3-1.6-.3-2.7-1.9-2.3-3.5"
            />
            <path
              className="s"
              fill="#9FD4E5"
              d="M86.9 30.2L71.2 12.7c-.8-.9-1.7-1.7-2.8-2.3 4.7 6.3 7.6 14.3 7.6 23 0 15.8-9.2 29.2-22.2 34.4C59.2 69 63.9 70 63.9 70c5.1 1.1 10.2-1.2 12.8-5.7L88.4 44c2.6-4.4 2-10-1.5-13.8z"
            />
          </g>
          <g className="magento-s">
            <ellipse
              className="s"
              cx="14.8"
              cy="60.2"
              fill="#9FD4E5"
              rx="3.5"
              ry="1.3"
            />
          </g>
        </g>
        <g className="magento">
          <ellipse
            className="sphere"
            cx="14.8"
            cy="49.2"
            fill="#FF6D00"
            rx="4.8"
            ry="4.8"
          />
          <path
            className="logo"
            fill="#FFF"
            d="M16.8 47.3l-2.6-1.2-2 2 .6 3.6.9.6-.6-3.9.9-.9.7 4.5.5.3.5-.5-.8-4.4 1.2.5.6 3.8.7-.8z"
          />
        </g>
      </g>

    </svg>
  );
}

export const hexo: Toon = {
  id: "hexo",
  label: "A pale blue hexagon with a sleepy face, bobbing its head and balancing a small ball on one arm.",
  Svg: HexoSvg,
  animate(svg, tl) {
    const out = { ...LOOP, ease: "power2.out" } as const;
    tl.addLabel("start", 0)
      .to(part(svg, "head"), { duration: 2, transformOrigin: "50% 75%", scale: 1.05, yPercent: -5, ...LOOP_EASE_IN_OUT }, "start")
      .to(
        [part(svg, "right-arm"), part(svg, "left-arm")],
        { duration: 1.5, rotation: 5, transformOrigin: "90% 0%", ...LOOP_EASE_IN_OUT },
        "start",
      )
      // The ball hops off the arm and its shadow shrinks under it.
      .to(part(svg, "magento"), { duration: 2, yPercent: -20, ...out }, "start")
      .to(part(svg, "magento-s"), { duration: 2, scale: 0.7, opacity: 0.5, transformOrigin: "50% 50%", ...out }, "start");
  },
};
