// Words for the loader's greetings on a direct home load (components/transition).
// The loader spells them in dots, in capitals, one after another.

/** Hello in each language the run goes through, in the order it goes through them, the same for everyone. */
export const hellos = [
  "Hello",
  "Hola",
  "مرحبا",
  "হ্যালো", // a stand-in until Atif picks the Bengali word
  "こんにちは",
  "안녕하세요",
  "Ciao",
  "Olá",
];

/**
 * An easter egg: what the dots spell instead of the run, on the visits worth
 * remarking on. A visit is a browser session, counted on this device.
 */
export const milestones: Record<number, string[]> = {
  5: ["Again?", "Welcome back"],
  20: ["Rent's due", "Just kidding", "Welcome back"],
};
