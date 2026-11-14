// Ported from iuridepaula/portfolio (MIT, see ./index.ts). The two shapes shared a page there; here they share a frame.
import { LOOP_EASE_IN_OUT, part, type Toon, type ToonSvgProps } from "./types";

export function ShapesSvg({ ref }: ToonSvgProps) {
  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="-17 0 134 100" aria-hidden="true">
      {/* Both were one purple in the original, where they sat in different places. Stacked here, the
          triangle is lighter so the dots can tell the two apart. */}
      <g className="open">
        <path
          fill="#4612a5"
          d="M90 70.2l-2-44.1c-.5-9.3-8.4-16.5-17.8-16.1l-44.1 2c-9.3.5-16.5 8.4-16.1 17.8l2 44.1c.4 9.3 8.4 16.6 17.7 16.1l44.1-2c9.4-.5 16.6-8.4 16.2-17.8z"
        />
      </g>
      <g className="smart">
        <path
          fill="#e8d7ef"
          transform="translate(22 22) scale(0.56)"
          d="M80.1 39.2L34.2 11.9c-8.8-5.2-19.9 1-20.1 11.2l-.7 53.4c-.1 10.2 10.8 16.7 19.8 11.8l46.6-26.1c8.9-5 9.1-17.8.3-23z"
        />
      </g>
    </svg>
  );
}

export const shapes: Toon = {
  id: "shapes",
  label: "A rounded square and a rounded triangle, turning slowly against each other.",
  Svg: ShapesSvg,
  animate(svg, tl) {
    tl.addLabel("start", 0)
      .to(part(svg, "smart"), { duration: 8, rotation: -360, transformOrigin: "50% 50%", ...LOOP_EASE_IN_OUT }, "start")
      .to(part(svg, "open"), { duration: 7, rotation: 360, transformOrigin: "50% 50%", ...LOOP_EASE_IN_OUT }, "start");
  },
};
