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
] as const satisfies readonly Egg[];

export type EggId = (typeof eggs)[number]["id"];

/** The eggs the page can see being found: the ones the count is out of. */
export const tracked = eggs.filter((egg) => egg.tracked);
