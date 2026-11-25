"use client";

import { useSyncExternalStore } from "react";
import { today } from "@/content/dates";

const still = () => () => {};

/**
 * The footer's line for a day the site dresses up for (content/dates), such as
 * Atif's birthday. Nothing on other days, and nothing in the server's HTML:
 * the day is read in the browser, so a cached page never shows yesterday's.
 */
export function DayLine() {
  const line = useSyncExternalStore(still, () => today()?.line ?? null, () => null);
  if (!line) return null;
  return <p className="kicker text-ink">{line}</p>;
}
