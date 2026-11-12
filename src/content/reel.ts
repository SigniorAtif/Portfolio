// The showreel: where the files live and what is on screen when.

export type ReelChapter = {
  /** Seconds into the reel. */
  at: number;
  name: string;
  /** What is on screen. */
  note: string;
};

export const reel = {
  /**
   * Set to false to drop the section (and its nav links) from the landing.
   * Do that if the site goes live before the real reel is cut.
   */
  enabled: true,
  headline: ["Easier to show you", "than tell you."],
  intro:
    "Half a minute of the things I've built, all of them running. It starts on the desktop I made and goes through what I wrote on it.",
  poster: "/reel/poster.webp",
  /**
   * Empty until the reel is cut. Then list `/reel/reel.webm` and
   * `/reel/reel.mp4` here (best format first) and the tile starts playing.
   */
  sources: [] as { src: string; type: string }[],
  /** Draft timings from the storyboard. Re-time against the final cut. */
  chapters: [
    { at: 0, name: "rury", note: "lock screen into the desktop" },
    { at: 5, name: "rury", note: "new wallpaper, the whole shell recolours" },
    { at: 9, name: "Tasks", note: "an offline edit syncing" },
    { at: 14, name: "ruyah", note: "two screens, one film, in step" },
    { at: 19, name: "Connector", note: "Claude Code reading the open note" },
    { at: 24, name: "Pixan, QuExchange", note: "quick cuts" },
    { at: 29, name: "rury", note: "back to the desktop, lock" },
  ] satisfies ReelChapter[],
} as const;

export function timestamp(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
