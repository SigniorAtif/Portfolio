// Ported from iuridepaula/portfolio (MIT, see ./index.ts). Drawing unchanged.
import { LOOP_EASE_IN_OUT, part, type Toon, type ToonSvgProps } from "./types";

export function MonsierSvg({ ref }: ToonSvgProps) {
  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="-17 0 134 100" aria-hidden="true">
      <g className="Monsier">
        <g className="legs">
          <path
            className="left-leg"
            fill="none"
            stroke="#ffae00"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="7.213"
            d="M34.4 90s8.1-.4 13.8-5.3"
          />
          <path
            className="right-leg"
            fill="none"
            stroke="#ffae00"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="7.213"
            d="M65.5 90s-8.1-.4-13.8-5.3"
          />
        </g>
        <g className="arms">
          <path
            className="left-arm"
            fill="none"
            stroke="#ffae00"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="5.246"
            d="M32.8 66.1s-6.4 5.2-10.6-2"
          />
          <path
            className="right-arm"
            fill="none"
            stroke="#ffae00"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="5.246"
            d="M66.8 66.1s6.4 5.2 10.6-2"
          />
        </g>
        <path
          className="body"
          fill="#0cc"
          d="M28.8 64.4c-.7 1.9-.5 3.9 4.4 5.4 0 0-1.3 7.7 2.4 11.9 0 0-2.6 2.2-3.7 4.7-1 2.2 15.1-.4 18.2-1 3.9.7 18.9 3.2 17.9 1-1.1-2.5-3.7-4.7-3.7-4.7 3.7-4.2 2.4-11.9 2.4-11.9 4.9-1.5 5.2-3.5 4.5-5.4-1.6-4.1-11.4-7-20.7-7-9.3.1-20.1 3-21.7 7z"
        />
        <g className="head">
          <path
            fill="#ffae00"
            d="M27.2 34.4c2.8 0 5 2.3 5 5.2s-2.3 5.2-5 5.2-5-2.3-5-5.2 2.2-5.2 5-5.2z"
          />
          <path
            fill="#ffae00"
            d="M72.8 34.4c2.8 0 5 2.3 5 5.2s-2.3 5.2-5 5.2-5-2.3-5-5.2 2.1-5.2 5-5.2z"
          />
          <path
            fill="#fff"
            d="M50 10c13.1 0 23.8 12.9 23.8 28.8S63.2 67.6 50 67.6 26.2 54.7 26.2 38.8 36.9 10 50 10z"
          />
          <path
            fill="#ffae00"
            d="M50 14.9c11.9 0 21.6 10.4 21.6 23.3S62 61.5 50 61.5 28.4 51.2 28.4 38.3 38.1 14.9 50 14.9z"
          />
          <path
            fill="#fff"
            d="M50 47.4c7.5 0 13.5 6 13.5 13.5V66c0 7.5-6 13.5-13.5 13.5s-13.5-6-13.5-13.5v-5.1c-.1-7.5 6-13.5 13.5-13.5z"
          />
          <path
            fill="#fff"
            d="M50.1 11.8c4.8 0 8.6-1.6 8.6 3.2v5.7c0 4.8-3.9 8.7-8.7 8.7-4.8 0-8.7-3.9-8.7-8.7V15c0-4.7 4-3.2 8.8-3.2z"
          />
          <g className="mustache">
            <path
              className="right-mustache"
              fill="#c2e3ed"
              d="M50.5 45.8s-1 7.8 6.5 7.8h8s1-7.5-6-7.5-8.5-.3-8.5-.3z"
            />
            <path
              className="left-mustache"
              fill="#c2e3ed"
              d="M49.3 45.8s.9 7.8-6.4 7.8h-8s-1-7.5 6-7.5c6.9 0 8.4-.3 8.4-.3z"
            />
          </g>
          <path
            className="nose"
            fill="#ff3e4b"
            d="M53.3 44.3c0 1.8-1.4 3.3-3.3 3.3-1.8 0-3.3-1.5-3.3-3.3 0-1.8 3.3-7.3 3.3-7.3s3.3 5.5 3.3 7.3z"
          />
          <g className="eyes">
            <path
              fill="none"
              stroke="#003359"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeMiterlimit="10"
              strokeWidth="1.312"
              d="M39.3 35.2c1 .9 2.4 1.4 3.9 1.4 1.4 0 2.8-.5 3.8-1.4"
            />
            <path
              fill="none"
              stroke="#003359"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeMiterlimit="10"
              strokeWidth="1.312"
              d="M53 35.2c1 .9 2.4 1.4 3.9 1.4 1.4 0 2.8-.5 3.8-1.4"
            />
          </g>
        </g>
      </g>

    </svg>
  );
}

export const monsier: Toon = {
  id: "monsier",
  label: "A white-bearded monk meditating, swaying his head and floating a little off the ground.",
  Svg: MonsierSvg,
  animate(svg, tl) {
    const head = part(svg, "head");
    tl.set(head, { transformOrigin: "50% 90%", rotation: 5 })
      .addLabel("start", 0)
      .to(head, { duration: 3, rotation: -5, ...LOOP_EASE_IN_OUT }, "start")
      .to(
        [part(svg, "left-arm"), part(svg, "left-mustache")],
        { duration: 2, transformOrigin: "90% 50%", rotation: -20, ...LOOP_EASE_IN_OUT },
        "start",
      )
      .to(
        [part(svg, "right-arm"), part(svg, "right-mustache")],
        { duration: 2, transformOrigin: "10% 50%", rotation: 20, ...LOOP_EASE_IN_OUT },
        "start",
      )
      .to(part(svg, "Monsier"), { duration: 2, yPercent: -10, ...LOOP_EASE_IN_OUT }, "start");
  },
};
