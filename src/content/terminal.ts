// The commands of the site's terminal (components/eggs/Terminal), shared with
// the console's bare words (components/eggs/Console). Everything here is plain
// text and data: each command returns the lines it prints and, at most, one
// thing for its host to do. What it lists comes from the content modules, so
// a new project or page shows up in `ls` with no change here.

import { SINCE, homeTown, statement, story } from "./about";
import { timeZone } from "./contact";
import { projects } from "./projects";
import { pages } from "./site";

/** Something a command asks its host to do once its lines are printed. */
export type Action =
  | { kind: "clear" }
  | { kind: "exit" }
  /** A new tab. */
  | { kind: "open"; href: string }
  /** This tab, through the veil. */
  | { kind: "go"; href: string }
  | { kind: "summon"; egg: "parade" | "rury" | "terminal" };

export type Result = { lines: string[]; action?: Action };

/** What a command may need to know about the visit, and which host is asking. */
export type Context = { found: number; total: number; now: Date; host: "terminal" | "console" };

export const PROMPT = "guest@ahmedatif:~$";
export const WELCOME = ["rury tty1 · ahmedatif.in", "Type help to see what this does. Esc or exit to leave."];

/** The pages, by the word `open` takes for each. */
const PLACES: Record<string, string> = {
  home: "/",
  ...Object.fromEntries(pages.map((page) => [page.label.toLowerCase(), page.href])),
  eggs: "/eggs",
};

const projectBy = (slug: string) => projects.find((project) => project.slug === slug.toLowerCase());

const clock = (now: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: timeZone.id,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now) + ` ${timeZone.short}`;

/** Each listed command and the line `help` gives it. Aliases the console uses are kept out of the list. */
const HELP: [string, string][] = [
  ["help", "this list"],
  ["ls", "the pages and the projects"],
  ["cat about", "who builds this"],
  ["cat <project>", "a project, in full"],
  ["open <project|page>", "a project's live site, or a page here"],
  ["neofetch", "the machine it was written on"],
  ["whoami", "who you are to this site"],
  ["date", "the time where Atif is"],
  ["eggs", "how many you have found"],
  ["parade", "summon the toons"],
  ["rury", "the bar, on or off"],
  ["sudo hire atif", "the shortest way to a note"],
  ["clear", "a clean screen"],
  ["exit", "back to the page"],
];

/** The bare words the console answers to; the rest live in the terminal. */
export const CONSOLE_WORDS = ["help", "neofetch", "hire", "eggs", "parade", "terminal"] as const;
const CONSOLE_HELP: [string, string][] = [
  ["help", "this list"],
  ["neofetch", "the machine it was written on"],
  ["hire", "the shortest way to a note"],
  ["eggs", "how many you have found"],
  ["parade", "summon the toons"],
  ["terminal", "the rest of the commands, in the page"],
];

const pad = (text: string, width: number) => text + " ".repeat(Math.max(1, width - text.length));

const LOGO = ["   ●●●●●  ", "  ●●   ●● ", "  ●●●●●●● ", "  ●●   ●● ", "  ●●   ●● ", "          ", "          "];

function neofetch(now: Date): string[] {
  const years = now.getFullYear() - SINCE;
  const facts = [
    "atif@rury",
    "---------",
    `${pad("OS", 8)}rury`,
    `${pad("WM", 8)}Hyprland`,
    `${pad("Uptime", 8)}since ${SINCE} (${years} years)`,
    `${pad("Rank", 8)}9th, International Codewars Olympiad`,
    `${pad("Home", 8)}${homeTown}`,
    `${pad("Shell", 8)}this one`,
  ];
  return facts.map((fact, i) => `${LOGO[i] ?? " ".repeat(10)}  ${fact}`);
}

function cat(target: string | undefined): string[] {
  if (!target) return ["cat: which one? Try ls."];
  if (target === "about") return [statement, "", ...story.flatMap((paragraph) => [paragraph, ""])].slice(0, -1);
  const project = projectBy(target);
  if (!project) return [`cat: ${target}: no such file`];
  return [
    `${project.name} · ${project.kind}`,
    project.oneLiner,
    "",
    project.summary,
    "",
    `stack   ${project.stack.join(", ")}`,
    ...project.facts.map((fact) => `        ${fact.value} ${fact.label}`),
    ...(project.live ? [`live    ${project.live}`] : []),
    ...(project.source ? [`source  ${project.source}`] : []),
  ];
}

function open(target: string | undefined): Result {
  if (!target) return { lines: ["open: which one? Try ls."] };
  const place = PLACES[target.toLowerCase()];
  if (place) return { lines: [`Going to ${target.toLowerCase()}.`], action: { kind: "go", href: place } };
  const project = projectBy(target);
  if (!project) return { lines: [`open: ${target}: no such project or page`] };
  const href = project.live ?? project.source;
  if (!href) return { lines: [`open: ${project.name} has nothing public to open yet.`] };
  return { lines: [`Opening ${href.replace(/^https?:\/\//, "")} in a new tab.`], action: { kind: "open", href } };
}

const hire: Result = {
  lines: ["Permission granted. Taking you to the note."],
  action: { kind: "go", href: "/contact?ask=build" },
};

/** Runs one line of input. Never throws: anything it does not know is answered, not ignored. */
export function run(input: string, context: Context): Result {
  const words = input.trim().split(/\s+/).filter(Boolean);
  const [command = "", ...rest] = words;
  const args = rest.join(" ");

  switch (command.toLowerCase()) {
    case "":
      return { lines: [] };
    case "help":
      if (context.host === "console") return { lines: CONSOLE_HELP.map(([name, what]) => `${pad(name, 12)}${what}`) };
      return { lines: HELP.map(([name, what]) => `${pad(name, 22)}${what}`) };
    case "ls":
      return {
        lines: [
          `${pad("pages/", 11)}${Object.keys(PLACES).join("  ")}`,
          `${pad("projects/", 11)}${projects.map((project) => project.slug).join("  ")}`,
        ],
      };
    case "cat":
      return { lines: cat(rest[0]) };
    case "open":
      return open(rest[0]);
    case "neofetch":
      return { lines: neofetch(context.now) };
    case "whoami":
      return { lines: ["guest. Curious enough to open a terminal on a portfolio, which Atif counts in your favour."] };
    case "date":
      return { lines: [clock(context.now)] };
    case "eggs":
      return {
        lines: [
          `${context.found} of ${context.total} found.`,
          context.found === context.total ? "Every one. The footer noticed." : "The list, with hints: open eggs",
        ],
      };
    case "parade":
      return { lines: ["Summoning the cast."], action: { kind: "summon", egg: "parade" } };
    case "rury":
      return { lines: ["Toggling the bar."], action: { kind: "summon", egg: "rury" } };
    case "hire":
      return hire;
    case "terminal":
      if (context.host === "terminal") return { lines: ["You're in it."] };
      return { lines: ["Opening the terminal."], action: { kind: "summon", egg: "terminal" } };
    case "sudo":
      if (/^hire atif$/i.test(args)) return hire;
      if (/^rm -rf \/\*?$/.test(args)) return { lines: ["Nice try."] };
      if (!args) return { lines: ["sudo: what for?"] };
      return { lines: ["guest is not in the sudoers file. This incident will be reported."] };
    case "clear":
      return { lines: [], action: { kind: "clear" } };
    case "exit":
      return { lines: [], action: { kind: "exit" } };
    default:
      return { lines: [`command not found: ${command}. Try help.`] };
  }
}

/** The words Tab can finish: commands first, then what `cat` and `open` take. */
const COMMANDS = ["help", "ls", "cat", "open", "neofetch", "whoami", "date", "eggs", "parade", "rury", "sudo", "clear", "exit"];
const TARGETS: Record<string, string[]> = {
  cat: ["about", ...projects.map((project) => project.slug)],
  open: [...Object.keys(PLACES), ...projects.map((project) => project.slug)],
  sudo: ["hire atif"],
};

/**
 * Finishes the word being typed. One match fills it in; several fill in what
 * they share and come back as `options` to print; none leaves the input as is.
 */
export function complete(input: string): { value: string; options: string[] } {
  const spaced = input.replace(/^\s+/, "");
  const space = spaced.indexOf(" ");
  const head = space === -1 ? spaced : spaced.slice(0, space);
  const typed = space === -1 ? spaced : spaced.slice(space + 1);
  const pool = space === -1 ? COMMANDS : (TARGETS[head.toLowerCase()] ?? []);
  const matches = pool.filter((word) => word.startsWith(typed.toLowerCase()));
  if (matches.length === 0) return { value: input, options: [] };
  const shared = matches.reduce((common, word) => {
    let i = 0;
    while (i < common.length && common[i] === word[i]) i++;
    return common.slice(0, i);
  });
  const done = matches.length === 1 ? `${shared} ` : shared;
  const value = space === -1 ? done : `${head} ${done}`;
  return { value, options: matches.length > 1 ? matches : [] };
}
