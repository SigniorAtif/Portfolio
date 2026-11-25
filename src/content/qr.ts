// The QR code the hero's dust forms (components/hero/BustStage): the address of
// /q, as version 2 at error correction M, 25 modules square. Made once with
//   qrencode -v 2 -l M -m 0 -t ASCII "https://www.ahmedatif.in/q"
// and kept as data, so the site needs no encoder. "#" is a dark module. If the
// address changes, make it again and check it still scans (zbarimg, and a phone).

/** Summoned away from home, EggHost leaves this in sessionStorage and goes home; the hero forms the code on arrival. */
export const QR_PENDING = "qr-pending";

export const QR = [
  "#######...###.##..#######",
  "#.....#.#.####.#..#.....#",
  "#.###.#...#.......#.###.#",
  "#.###.#..#.#..##..#.###.#",
  "#.###.#.#..#...#..#.###.#",
  "#.....#...##.####.#.....#",
  "#######.#.#.#.#.#.#######",
  ".........###.#.##........",
  "#.#.#.#...#.##..#...#..#.",
  "...###.#.#..#...#.#.....#",
  "##...##.#..##.#..###..###",
  "######.#.#.######.#....#.",
  "##.#.##..#.###.#####.#.##",
  ".#..#..#..##.#..#.#..#..#",
  "#..#.##.#....#..####..###",
  ".###.......#.#.#..#.#..#.",
  "#.###.#.##...#########...",
  "........#.#.#..##...##.##",
  "#######...#..#.##.#.##.##",
  "#.....#..##.##..#...##.##",
  "#.###.#.#.####..######...",
  "#.###.#...#......#.####..",
  "#.###.#.#.#.#.#.#...#...#",
  "#.....#..##.#####.#.##.#.",
  "#######.#..###.##..#...##",
] as const;
