// Every easter egg on the site, for the tracker, the toast and /eggs. An egg
// that ships adds its entry here, in the order /eggs lists them. Untracked eggs
// live where the page can't see them being found (a response header, a text
// file), so /eggs lists them without counting them.

export type Egg = {
  id: string;
  /** Shown once it is found. */
  name: string;
  /** Shown on /eggs while it is missing, with hints turned on. */
  hint: string;
  /** The page it hides on. */
  where: string;
  /** False when the page can't tell it was found. */
  tracked: boolean;
};

export const eggs = [
  {
    id: "dino",
    name: "The dino's song",
    hint: "Someone on home is wearing headphones. Ask what's playing.",
    where: "Home",
    tracked: true,
  },
  {
    id: "sleep",
    name: "Asleep at the desk",
    hint: "Leave the portrait alone for a minute and a half.",
    where: "Home",
    tracked: true,
  },
  {
    id: "rury",
    name: "rury",
    hint: "Type the name of the desktop this site was written in.",
    where: "Anywhere",
    tracked: true,
  },
  {
    id: "parade",
    name: "Toon parade",
    hint: "An old cheat code still works here. Up is where it starts.",
    where: "Anywhere",
    tracked: true,
  },
  {
    id: "ask",
    name: "To play chess",
    hint: "Keep rolling what you want.",
    where: "Contact",
    tracked: true,
  },
  {
    id: "deadline",
    name: "Yesterday",
    hint: "Keep rolling when you want it.",
    where: "Contact",
    tracked: true,
  },
  {
    id: "howl",
    name: "Howl",
    hint: "The castle has a name. Try it in the address bar.",
    where: "Contact",
    tracked: true,
  },
  {
    id: "terminal",
    name: "The terminal",
    hint: "Developers keep a key for this, just above Tab.",
    where: "Anywhere",
    tracked: true,
  },
  {
    id: "header",
    name: "Hi, human",
    hint: "Every page says hello where only developers look. Read the response headers.",
    where: "The network tab",
    tracked: false,
  },
  {
    id: "files",
    name: "The text files",
    hint: "Crawlers get a file of instructions. So do humans, and so do security researchers.",
    where: "The address bar",
    tracked: false,
  },
] as const satisfies readonly Egg[];

export type EggId = (typeof eggs)[number]["id"];

/** The eggs the page can see being found: the ones the count is out of. */
export const tracked = eggs.filter((egg) => egg.tracked);
