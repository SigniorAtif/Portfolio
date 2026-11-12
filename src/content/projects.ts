// Single source of truth for the deck, the project pages and the agent-readable
// output (llms.txt / markdown). Every fact here was read from the project's own
// README or docs; anything unconfirmed is marked TODO and must not ship as-is.

export type ProjectFact = { value: string; label: string };

export type Project = {
  slug: string;
  order: number;
  name: string;
  kind: string;
  oneLiner: string;
  summary: string;
  stack: string[];
  facts: ProjectFact[];
  live?: string;
  source?: string;
  /** Required attribution for forks and shared work. Rendered on the page. */
  credit?: string;
  /** Path under /public once captured. Missing media falls back to a dot plate. */
  media?: string;
};

export const projects: Project[] = [
  {
    slug: "tasks",
    order: 1,
    name: "Tasks",
    kind: "Product",
    oneLiner: "A calendar and task app for students that still works offline.",
    summary:
      "Recurrence engine, timetable day and week views, installable PWA. Built as a pnpm monorepo with an API, a web app and a shared core package.",
    stack: ["React 19", "Vite", "Postgres 18", "better-auth", "Zod 4", "Playwright"],
    facts: [
      { value: "3", label: "timezones in the test run" },
      { value: "90%", label: "branch gate on the recurrence engine" },
      { value: "2", label: "architectures built, staging and prod" },
    ],
    live: "https://tasks.ahmedatif.in",
    source: "https://github.com/SigniorAtif/Tasks",
  },
  {
    slug: "ruyah",
    order: 2,
    name: "ruyah",
    kind: "Sync engine",
    oneLiner:
      "Watch the same film together from two places. Only timing crosses the network.",
    summary:
      "Each side plays its own local copy. A relay passes clock-synced, scheduled play and seek events, and drift is corrected by nudging playback rate before any visible seek.",
    stack: ["Next.js 16", "React 19", "ws relay", "Vitest"],
    facts: [
      { value: "0.98x", label: "to 1.02x rate nudge for drift" },
      { value: "1 s", label: "gap over 3 heartbeats before a seek" },
      { value: "4 KB", label: "message cap, 50 per second" },
      { value: "90 s", label: "grace period per seat" },
    ],
    live: "https://ruyah.ahmedatif.in",
    source: "https://github.com/SigniorAtif/ruyah",
    media: "/work/ruyah.webp",
  },
  {
    slug: "claude-code-connector",
    order: 3,
    name: "Claude Code Connector",
    kind: "Tool for agents",
    oneLiner:
      "An Obsidian plugin that tells Claude Code which note, section and selection is open.",
    summary:
      "The plugin writes editor state to a local file; a Claude Code hook injects it into the prompt once, and again only when it changes. Listed in the Obsidian community plugin directory.",
    stack: ["TypeScript", "esbuild", "Obsidian API"],
    facts: [],
    live: "https://community.obsidian.md/plugins/claude-code-connector",
    source: "https://github.com/SigniorAtif/Obsidian-CC-connector",
    media: "/work/claude-code-connector.webp",
  },
  {
    slug: "pixan",
    order: 4,
    name: "Pixan",
    kind: "Product",
    oneLiner: "A privacy-first social app with end-to-end encrypted messages.",
    summary:
      "Connect by QR or a 9-digit tag only, no searchable profiles. Default-deny row security on every table, keys stay on the device, installable with offline and background sync.",
    stack: ["Next.js 15", "Supabase", "Cloudflare R2", "X25519", "XChaCha20-Poly1305"],
    facts: [
      { value: "9", label: "SQL migrations, default-deny throughout" },
      { value: "5", label: "posts a day, by design" },
    ],
    // Co-founded; the frontend is my own work. The repo is private, so there is no source link.
  },
  {
    slug: "quexchange",
    order: 5,
    name: "QuExchange",
    kind: "Experiment",
    oneLiner: "Send a file between devices as a deck of QR frames. No network at all.",
    summary:
      "One device plays the file as QR frames, the other reads them with its camera and reassembles the chunks.",
    stack: ["Next.js 16", "TypeScript", "Tailwind 4"],
    facts: [],
    live: "https://quexchange.vercel.app",
    source: "https://github.com/SigniorAtif/quexchange",
    media: "/work/quexchange.webp",
  },
  {
    slug: "rury",
    order: 6,
    name: "rury",
    kind: "Desktop",
    oneLiner: "The Quickshell desktop for Hyprland I work in every day.",
    summary:
      "Bar, dock, overview, lock screen and wallpaper-driven theming, with reworked lock, parallax and background motion, a Lua config and its own installer.",
    stack: ["QML", "Quickshell", "Hyprland", "matugen"],
    facts: [{ value: "41", label: "standalone widgets in the lab so far" }],
    source: "https://github.com/SigniorAtif/Rury-dot-files",
    credit: "Forked from end-4/dots-hyprland (GPL v3).",
  },
];

export const featured = projects.slice().sort((a, b) => a.order - b.order);
