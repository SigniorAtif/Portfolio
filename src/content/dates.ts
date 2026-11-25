// An easter egg: the days the site dresses up for. Each is checked against the
// date on Atif's clock (IST), not the visitor's, so everyone sees the same day.
//
// Review this table every year: add the next year's Eid dates and drop the
// past ones. Last reviewed November 2026.
//
// The Eid dates follow the moon and are only known roughly in advance. Each is
// the date expected in India, and each covers three days from it, which
// absorbs a late sighting. Confirm them a week or so before, once the
// moon-sighting committees announce, and move a date if it changes.

import { timeZone } from "./contact";

/** What a day changes. Anything left out stays as it always is. */
export type Day = {
  id: "eid-al-fitr" | "eid-al-adha" | "boishakh" | "new-year" | "birthday";
  /** What the loader spells instead of its run of hellos, on a direct home load. */
  greeting?: string;
  /** A crescent moon among the dots of the starfields. */
  crescent?: boolean;
  /** A burst of stars in the footer's field, once a page. */
  burst?: boolean;
  /** A line at the foot of the footer. */
  line?: string;
};

type Entry = Day & {
  /** "MM-DD" for every year, or "YYYY-MM-DD" for that year only. */
  on: string[];
  /** Days in a row, counting the first. One when left out. */
  days?: number;
};

/** TODO(Atif): your birthday, as "MM-DD". Until it is set, the entry does nothing. */
const BIRTHDAY: string | null = null;

const DAYS: Entry[] = [
  // Expected 10 March 2027 and 27 February 2028.
  { id: "eid-al-fitr", on: ["2027-03-10", "2028-02-27"], days: 3, greeting: "Eid Mubarak", crescent: true },
  // Expected 17 May 2027 and 5 May 2028.
  { id: "eid-al-adha", on: ["2027-05-17", "2028-05-05"], days: 3, greeting: "Eid Mubarak", crescent: true },
  // Pohela Boishakh. West Bengal sometimes keeps it on the 15th.
  { id: "boishakh", on: ["04-14"], greeting: "শুভ নববর্ষ" },
  { id: "new-year", on: ["01-01"], burst: true },
  ...(BIRTHDAY ? [{ id: "birthday" as const, on: [BIRTHDAY], burst: true, line: "Atif's birthday today. Say hello." }] : []),
];

const DAY_MS = 86_400_000;
/** Whole days from one "YYYY-MM-DD" to another. Both are read as UTC midnight, so the gap is exact. */
const daysFrom = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);

/** A moment's date on Atif's clock, as "YYYY-MM-DD". */
export function dateIn(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timeZone.id, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** The day a date ("YYYY-MM-DD") is dressed up for, or null for an ordinary one. */
export function dayOn(date: string): Day | null {
  for (const entry of DAYS) {
    for (const on of entry.on) {
      const first = on.length === 5 ? `${date.slice(0, 4)}-${on}` : on;
      const gap = daysFrom(first, date);
      if (gap >= 0 && gap < (entry.days ?? 1)) return entry;
    }
  }
  return null;
}

/**
 * Development only: pretend today is another day, to see what it does. In the
 * browser console, then reload:
 *
 *   localStorage.setItem("eggs-today", "2027-03-10")            // a date on Atif's clock
 *   localStorage.setItem("eggs-today", "2026-12-31T18:30:00Z")  // a moment, read in IST
 *   localStorage.removeItem("eggs-today")                       // back to today
 *
 * Production builds never read it.
 */
const STUB = "eggs-today";

/** What today is dressed up for, if anything. Null on the server, where there is no today to speak of. */
export function today(): Day | null {
  if (typeof window === "undefined") return null;
  let date = dateIn(new Date());
  if (process.env.NODE_ENV !== "production") {
    try {
      const stub = window.localStorage.getItem(STUB);
      if (stub && /^\d{4}-\d{2}-\d{2}$/.test(stub)) date = stub;
      else if (stub && !Number.isNaN(Date.parse(stub))) date = dateIn(new Date(stub));
    } catch {
      // Storage blocked: today it is.
    }
  }
  return dayOn(date);
}
