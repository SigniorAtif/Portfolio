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
   */
  enabled: true,
  headline: ["Easier to show you", "than tell you."],
  intro:
    "Under a minute of the things I've built, all of them running. It starts on the desktop I made and goes through what I wrote on it.",
  poster: "/reel/poster.webp",
  /**
   * The browser takes the first one it can play whose `media` matches, so
   * phones (narrow, or short when held sideways) get a 720p cut at a third
   * of the weight. It is H.264 only: at that bitrate VP9 smears the small type
   * in the QR scene. Cut in the sibling `portfolio-reel` HyperFrames project.
   */
  sources: [
    { src: "/reel/reel-720.mp4", type: "video/mp4", media: "(max-width: 767px), (max-height: 500px)" },
    { src: "/reel/reel.webm", type: "video/webm" },
    { src: "/reel/reel.mp4", type: "video/mp4" },
  ] as { src: string; type: string; media?: string }[],
  /** The cut has no soundtrack yet. Set to true when one is added and the sound toggle comes back. */
  hasAudio: false,
  /** Timed against the final cut. */
  chapters: [
    { at: 0, name: "Intro", note: "easier to show you than tell you" },
    { at: 4, name: "rury", note: "new wallpaper, the whole shell recolours" },
    { at: 8, name: "rury", note: "left and right panels" },
    { at: 14, name: "rury", note: "the bar: hover anything, switch to boost" },
    { at: 22, name: "ruyah", note: "two screens, one film, in step" },
    { at: 26, name: "ruyah", note: "41 ms apart, measured" },
    { at: 29, name: "Connector", note: "Claude Code reading the open note" },
    { at: 33, name: "QuExchange", note: "a file as a deck of QR frames" },
    { at: 36, name: "Tasks", note: "offline, then it syncs" },
    { at: 38, name: "Pixan", note: "the landing page, as it loads" },
    { at: 42, name: "GDG KIIT", note: "one build, desktop and phone" },
    { at: 48, name: "Built with", note: "Next.js, Postgres, QML, Hyprland" },
  ] satisfies ReelChapter[],
} as const;

/** Width over height of the cut. The tile and the grown video both keep it. */
export const REEL_ASPECT = 16 / 9;

/**
 * The grown video, inside a gutter all round. On a landscape screen it is the
 * largest box of the reel's shape that fits, so the whole frame stays on
 * screen (the cut sets type close to its edges). The reel only grows on
 * landscape screens; for a portrait one this returns the whole padded screen.
 * The work section's curtain opens on the same box.
 */
export function fitReel(width: number, height: number, gutter: number): { width: number; height: number } {
  const w = Math.max(width - gutter * 2, 1);
  const h = Math.max(height - gutter * 2, 1);
  if (height >= width) return { width: w, height: h };
  const fit = Math.min(w, h * REEL_ASPECT);
  return { width: fit, height: fit / REEL_ASPECT };
}

export function timestamp(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
