import { hellos, milestones } from "@/content/greetings";
import type { Word } from "./veilEngine";

// Picks the words a direct home load is greeted with. Every reason for the
// words to change goes through `pickGreetings`: the visit count and the date
// (both easter eggs). Everyone else gets the same run, in the same order.

// The run: a soft first word, a quick even run, and a last word held still
// before everything gathers into the portrait.
const FIRST_MS = 1400;
const FIRST_PAUSE = 80;
const RUN_MS = 190;
const LAST_MS = 900;
// Phrases are read, not glanced at, so each one stays up for longer.
const PHRASE_FIRST_MS = 1600;
const PHRASE_MS = 1300;
// The day's greeting is what the dots gather from, so it is held longest.
const DAY_MS = 2200;

const VISITS = "veil-visits"; // localStorage: visits so far on this device
const COUNTED = "veil-counted"; // sessionStorage: this visit is already counted

/**
 * This visit's number on this device. A visit is a browser session, so the
 * count goes up on the first load of a session only, whichever page that is.
 * 0 when storage is blocked, which never matches a milestone.
 */
export function countVisit(): number {
  try {
    let visits = Number(localStorage.getItem(VISITS)) || 0;
    if (sessionStorage.getItem(COUNTED) !== "1") {
      // The flag goes first: if it cannot be kept, the count must not climb on every load.
      sessionStorage.setItem(COUNTED, "1");
      visits += 1;
      localStorage.setItem(VISITS, String(visits));
    }
    return visits;
  } catch {
    return 0;
  }
}

export type Visitor = {
  /** This visit's number, from `countVisit`. */
  visits: number;
  /** False for a word no face on this device can draw: it would come out as empty boxes. */
  canDraw: (text: string) => boolean;
  /** Today's greeting, on a day the site dresses up for (content/dates). */
  day?: string;
};

/** Times a list of words for the run: soft in, quick through, held at the end. */
function timed(texts: string[]): Word[] {
  return texts.map((text, index) => {
    if (index === 0) return { text, ms: FIRST_MS, pause: FIRST_PAUSE };
    return { text, ms: index === texts.length - 1 ? LAST_MS : RUN_MS };
  });
}

/**
 * The words to spell, in order. `milestone` marks a milestone visit, which
 * counts as finding the "visits" egg; `dated` marks a day's greeting, which
 * counts as finding the "dates" egg.
 *
 * Both stand in for the run. On a milestone visit that falls on such a day,
 * the milestone's phrases come first and the day's greeting closes them:
 * "Again?", "Welcome back", "Eid Mubarak".
 */
export function pickGreetings({ visits, canDraw, day }: Visitor): { words: Word[]; milestone: boolean; dated: boolean } {
  const phrases = milestones[visits] ?? [];
  // A greeting no face here can draw is skipped, and the day passes unmarked.
  const greeting = day && canDraw(day) ? day : null;
  if (phrases.length || greeting) {
    const texts = greeting ? [...phrases, greeting] : phrases;
    const words = texts.map((text, index): Word => {
      const ms = greeting && index === texts.length - 1 ? DAY_MS : index === 0 ? PHRASE_FIRST_MS : PHRASE_MS;
      return index === 0 ? { text, ms, pause: FIRST_PAUSE } : { text, ms };
    });
    return { words, milestone: phrases.length > 0, dated: greeting !== null };
  }

  return { words: timed(hellos.filter(canDraw)), milestone: false, dated: false };
}
