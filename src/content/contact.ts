// Words for the contact page: the note a visitor fills in, the thank-you once it is sent, and the line under the clock.

/** What they want from Atif. Each one has to read on after "And I want". */
export const asks = ["you to build it", "help with the hard part", "a second opinion", "to say hello"];

/** When they want it. Each one has to end the sentence. */
export const deadlines = ["this month", "this quarter", "whenever it's right"];

/** Grey examples shown in the empty blanks. */
export const hints = {
  name: "your name",
  thing: "a thing worth building",
  email: "you@somewhere.com",
};

/** The send button and the line under it. `caption` takes Atif's address. */
export const delivery = {
  send: "Send to Atif",
  sending: "Sending",
  caption: (email: string) => `It goes straight to Atif's inbox. He answers from ${email}.`,
  failed: "That did not go through. Try again, or copy the note.",
};

/**
 * What replaces the note once it is sent. `title` takes the visitor's first
 * name, which may be empty. `sign` is the small line under it: the address
 * they gave is set between its two halves.
 */
export const thanks = {
  title: (name: string) => `${name ? `Thanks, ${name}.` : "Thanks."} The castle has your note.`,
  sign: ["Atif will write back to", "."] as [string, string],
  /** Over the note itself, shown back to them. */
  recap: "What you sent",
  again: "Write another",
  copy: "Copy the note",
  copied: "Copied",
};

export const timeZone = { id: "Asia/Kolkata", short: "IST" };

/** Draft copy. What Atif is likely doing, by the hour on his clock: the first entry whose `before` is past the hour wins. */
export const moods = [
  { before: 4, text: "Still up, most likely." },
  { before: 10, text: "Asleep. Replies after ten." },
  { before: 19, text: "At the desk." },
  { before: 24, text: "Building something." },
];
