"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { BRIEF, FILES, LINE, NAMES, SOURCE, SPRITES, start, type Kind, type Move, type Piece } from "@/content/chess";
import { found } from "@/lib/eggs";

/** Every square, top left first, as the board is seen with White at the bottom. */
const SQUARES = Array.from({ length: 64 }, (_, i) => `${FILES[i % 8]}${8 - Math.floor(i / 8)}`);
/** How long Black takes to answer, and how long a wrong move rests before it goes back. */
const REPLY_MS = 650;
const BACK_MS = 420;
/** Where the cursor starts: the middle of the board, giving nothing away. */
const FIRST = "e4";

const file = (square: string) => FILES.indexOf(square[0]);
const rank = (square: string) => Number(square[1]);
/** a1 is dark, as on every real board. */
const dark = (square: string) => (file(square) + rank(square)) % 2 === 1;
const named = (piece: Piece) => `${piece.side === "w" ? "white" : "black"} ${NAMES[piece.kind]}`;
const upper = (text: string) => text[0].toUpperCase() + text.slice(1);

/** Plays a move on a set of pieces: whatever stands on the far square is taken. */
const play = (move: Move, pieces: Piece[]) =>
  pieces.filter((piece) => piece.at !== move.to).map((piece) => (piece.at === move.from ? { ...piece, at: move.to } : piece));

function Sprite({ kind }: { kind: Kind }) {
  return (
    <svg viewBox="0 0 9 9" className="chess-sprite">
      {SPRITES[kind].flatMap((row, y) =>
        Array.from(row, (cell, x) => (cell === "#" ? <circle key={`${x}-${y}`} cx={x + 0.5} cy={y + 0.5} r={0.36} /> : null)),
      )}
    </svg>
  );
}

/**
 * The chess egg: "Chess" on About opens a mate in two, drawn in dots. White's
 * pieces are solid dots, Black's are rings. Press a piece, then a square; the
 * arrow keys walk the board and Enter does the pressing. The line is fixed:
 * the right move gets Black's reply on its own, a wrong one slides back with
 * "Not quite." and the board starts over. Mate records the egg. Esc closes.
 * Styles are `.chess` in globals.css.
 */
export function ChessPuzzle({ onClose }: { onClose: () => void }) {
  const [pieces, setPieces] = useState(start);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [cursor, setCursor] = useState(FIRST);
  const [last, setLast] = useState<Move | null>(null);
  const [solved, setSolved] = useState(false);
  // A count beside the words, so the same words twice are still read out twice.
  const [said, setSaid] = useState({ text: BRIEF, n: 0 });
  const busy = useRef(false);
  const timers = useRef<number[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const say = (text: string) => setSaid((now) => ({ text, n: now.n + 1 }));
  const later = (then: () => void, ms: number) => timers.current.push(window.setTimeout(then, ms));
  const square = (name: string) => boardRef.current?.querySelector<HTMLButtonElement>(`[data-square="${name}"]`);

  useEffect(() => {
    const pending = timers.current;
    square(FIRST)?.focus({ preventScroll: true });
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  // Esc closes it from anywhere, wherever focus has got to.
  useEffect(() => {
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [onClose]);

  const attempt = (from: string, to: string) => {
    const move = LINE[step];
    setPicked(null);
    if (move.from === from && move.to === to) {
      setPieces((now) => play(move, now));
      setLast(move);
      if (step + 1 === LINE.length) {
        setSolved(true);
        say(`${move.say} ${SOURCE}`);
        found("chess");
        return;
      }
      say(move.say);
      busy.current = true;
      const reply = LINE[step + 1];
      later(() => {
        setPieces((now) => play(reply, now));
        setLast(reply);
        setStep(step + 2);
        say(`${reply.say} Your move.`);
        busy.current = false;
      }, REPLY_MS);
      return;
    }
    // Wrong: it goes there, rests, and the whole board goes back to the start.
    busy.current = true;
    say(step === 0 ? "Not quite." : "Not quite. From the top.");
    setPieces((now) => now.map((piece) => (piece.at === from ? { ...piece, at: to } : piece)));
    later(() => {
      setPieces(start());
      setStep(0);
      setLast(null);
      busy.current = false;
    }, BACK_MS);
  };

  const press = (name: string) => {
    setCursor(name);
    if (busy.current || solved) return;
    const piece = pieces.find((one) => one.at === name);
    if (piece?.side === "w") {
      if (picked === name) {
        setPicked(null);
        return say(`${upper(NAMES[piece.kind])} put back on ${name}.`);
      }
      setPicked(name);
      return say(`${upper(NAMES[piece.kind])} on ${name}. Where to?`);
    }
    if (!picked) return say(piece ? `That one is Black's ${NAMES[piece.kind]}.` : `${name} is empty.`);
    attempt(picked, name);
  };

  // The arrows walk the board, as it is seen: up is towards Black.
  const walk = (event: KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, [number, number]> = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    const by = steps[event.key];
    if (!by) return;
    event.preventDefault();
    const f = Math.min(7, Math.max(0, file(cursor) + by[0]));
    const r = Math.min(8, Math.max(1, rank(cursor) + by[1]));
    const next = `${FILES[f]}${r}`;
    setCursor(next);
    square(next)?.focus({ preventScroll: true });
  };

  return (
    <div
      className="term-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chess-title"
        className="egg-sheet chess"
        data-solved={solved || undefined}
        data-lenis-prevent
        onKeyDown={(event) => {
          // Two stops, the board and the close button: Tab only ever swaps between them.
          if (event.key !== "Tab") return;
          event.preventDefault();
          if (document.activeElement === closeRef.current) square(cursor)?.focus();
          else closeRef.current?.focus();
        }}
      >
        <div className="term-bar">
          <span id="chess-title">Chess / Mate in two</span>
          <button ref={closeRef} type="button" className="term-close" onClick={onClose}>
            esc
          </button>
        </div>
        <div className="chess-body">
          <div ref={boardRef} role="group" aria-label="Board, White at the bottom" className="chess-board" onKeyDown={walk}>
            {SQUARES.map((name) => {
              const piece = pieces.find((one) => one.at === name);
              return (
                <button
                  key={name}
                  type="button"
                  data-square={name}
                  data-dark={dark(name) || undefined}
                  data-picked={picked === name || undefined}
                  data-last={(last && (last.from === name || last.to === name)) || undefined}
                  tabIndex={name === cursor ? 0 : -1}
                  aria-label={`${name}, ${piece ? named(piece) : "empty"}${picked === name ? ", picked up" : ""}`}
                  className="chess-square"
                  onClick={() => press(name)}
                >
                  {name[1] === "1" && <span className="chess-file">{name[0]}</span>}
                  {name[0] === "a" && <span className="chess-rank">{name[1]}</span>}
                </button>
              );
            })}
            <div className="chess-pieces" aria-hidden="true">
              {pieces.map((piece) => (
                <span
                  key={piece.id}
                  className="chess-piece"
                  data-side={piece.side}
                  style={{ "--x": file(piece.at), "--y": 8 - rank(piece.at) } as CSSProperties}
                >
                  <Sprite kind={piece.kind} />
                </span>
              ))}
            </div>
          </div>
          <p role="status" className="chess-said">
            {said.text}
            {said.n % 2 ? " " : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
