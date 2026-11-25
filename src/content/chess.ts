// The chess egg's puzzle (components/eggs/ChessPuzzle). A classic stands in
// until Atif picks his own: the end of Morphy's game at the Paris opera, 1858.
// Checked with a solver: Qb8+ is the only first move that mates in two, and
// Black's reply to it is forced.

export type Side = "w" | "b";
export type Kind = "K" | "Q" | "R" | "B" | "N" | "P";
export type Piece = { id: string; side: Side; kind: Kind; at: string };
/** A move from one square to another, and what is read out once it is played. */
export type Move = { from: string; to: string; say: string };

export const NAMES: Record<Kind, string> = { K: "king", Q: "queen", R: "rook", B: "bishop", N: "knight", P: "pawn" };

export const FILES = "abcdefgh";

/** The position, as the board part of a FEN. White to play. */
const FEN = "4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4";

/** White's two moves with Black's forced reply between them. White's are the ones to find. */
export const LINE: Move[] = [
  { from: "b3", to: "b8", say: "Queen to b8, check." },
  { from: "d7", to: "b8", say: "Black's knight takes it." },
  { from: "d1", to: "d8", say: "Rook to d8. Checkmate." },
];

export const BRIEF = "White to play. Mate in two.";
export const SOURCE = "Morphy found it at the opera, Paris, 1858.";

/** The pieces where they stand at the start, read from the FEN. Each keeps its starting square as its id. */
export function start(): Piece[] {
  const pieces: Piece[] = [];
  FEN.split("/").forEach((row, r) => {
    let file = 0;
    for (const letter of row) {
      if (/\d/.test(letter)) {
        file += Number(letter);
        continue;
      }
      const side: Side = letter === letter.toUpperCase() ? "w" : "b";
      const at = `${FILES[file]}${8 - r}`;
      pieces.push({ id: at, side, kind: letter.toUpperCase() as Kind, at });
      file++;
    }
  });
  return pieces;
}

/** Each piece drawn on a 9 by 9 grid of dots, standing on its bottom row. */
export const SPRITES: Record<Kind, string[]> = {
  K: [
    "....#....",
    "...###...",
    "....#....",
    "..#####..",
    ".#######.",
    ".#######.",
    "..#####..",
    "...###...",
    ".#######.",
  ],
  Q: [
    ".#..#..#.",
    ".#..#..#.",
    ".##.#.##.",
    ".#######.",
    "..#####..",
    "...###...",
    "...###...",
    "..#####..",
    ".#######.",
  ],
  R: [
    ".#.#.#.#.",
    ".#######.",
    "..#####..",
    "...###...",
    "...###...",
    "...###...",
    "..#####..",
    "..#####..",
    ".#######.",
  ],
  B: [
    "....#....",
    "...###...",
    "..##.##..",
    "..###.#..",
    "..#####..",
    "...###...",
    "....#....",
    "..#####..",
    ".#######.",
  ],
  N: [
    "...#.#...",
    "..#####..",
    ".###.##..",
    "#######..",
    "##..###..",
    "...####..",
    "..#####..",
    "..#####..",
    ".#######.",
  ],
  P: [
    ".........",
    ".........",
    "....#....",
    "...###...",
    "...###...",
    "....#....",
    "...###...",
    "..#####..",
    ".#######.",
  ],
};
