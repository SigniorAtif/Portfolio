// Words and facts for the about page and for home's Myself section.

/** Draft copy, to polish later. Read out word by word on home, and the first paragraph of the story. */
export const statement =
  "I've been writing code since 2015, long before anyone asked me to. Mostly small, stubborn things: a planner that works with the wifi dead, tools that hand agents the boring half, and the desktop I'm typing this on. None of it is theoretical.";

/**
 * The rest of the story. Draft copy, carried over from the old portfolio's own
 * words and only tidied; to polish with the statement.
 */
export const story = [
  "Over the years I have been into game development, machine learning, the web and competitive programming, and used all four across contests and real prototypes.",
  "From interschool wins to hackathons and national showdowns, and now ranked 9th globally at the International Codewars Olympiad. What carried me through all of it is stubborn curiosity and a love for problem-solving.",
];

/** The year the counter starts from. */
export const SINCE = 2015;

export type Chapter = {
  /** `null` is the present: the counter ends on the current year. */
  year: number | null;
  title?: string;
  /** One line under the title. */
  text?: string;
  where?: string;
  /** True while the year itself is a guess that holds the layout open. */
  unconfirmed?: boolean;
};

/**
 * Oldest first. 2015 and the lines of copy are from the old portfolio, and
 * 2025 is the old site's date for the degree. More chapters go in between.
 */
export const chapters: Chapter[] = [
  { year: SINCE, title: "First code", text: "A kid with a niche in problem solving." },
  { year: 2025, title: "B.Tech in Computer Science", where: "KIIT" },
  { year: null, title: "9th in the world", text: "International Codewars Olympiad." },
];

/** The three things the hero says he builds, with the project kinds that prove each. */
export const strands = [
  {
    title: "Products",
    text: "Things people install and keep. A planner that works with the wifi dead, a film night that only sends timing, a social app that encrypts before it sends.",
    kinds: ["Product", "Sync engine", "Experiment"],
  },
  {
    title: "Tools for agents",
    text: "Agents ask too many questions. These answer first: the note, the section and the selection I have open, handed over before the prompt.",
    kinds: ["Tool for agents"],
  },
  {
    title: "The desktop",
    text: "Bar, dock, overview and lock screen, themed off the wallpaper. I work inside it every day, so it has to hold.",
    kinds: ["Desktop"],
  },
];

export type Skill = { name: string; tools: string[] };

/** The main skills and what each is done with, as listed on the old portfolio. */
export const skills: Skill[] = [
  {
    name: "Game Development",
    tools: ["Unreal Engine", "Unity", "Blueprints", "C++", "C#", "Animation Blueprints", "AI Behavior Trees", "Lighting Systems", "Multiplayer Networking"],
  },
  { name: "Machine Learning", tools: ["Python", "PyTorch", "TensorFlow", "Keras", "NumPy", "Pandas", "OpenCV", "FastAPI", "Flask"] },
  { name: "Web Development", tools: ["JavaScript", "TypeScript", "React", "Vue", "GSAP", "React-Spring", "Express", "Node"] },
  { name: "Problem Solving (DSA)", tools: ["C++", "Python", "C#", "Java"] },
];

/** Spoken languages by level. `strength` is how many of the three dots are lit. */
export const spoken = [
  {
    level: "Fluent",
    strength: 3,
    languages: [
      { code: "en-US", name: "English" },
      { code: "bn-IN", name: "Bengali" },
    ],
  },
  { level: "Intermediate", strength: 2, languages: [{ code: "hi-IN", name: "Hindi" }] },
  {
    level: "Basic",
    strength: 1,
    languages: [
      { code: "ar-SA", name: "Arabic" },
      { code: "de-DE", name: "German" },
    ],
  },
];

/** What else takes his time. */
export const busy = ["Al-Qur'an", "Poetry", "Physics", "Chess", "Video Games"];

/** Where he is from. */
export const homeTown = "Malda, West Bengal";

/** Links that belong on the about page only. */
export const personal = [{ label: "Instagram", href: "https://www.instagram.com/signior_atif/" }];
