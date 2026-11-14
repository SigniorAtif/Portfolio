/** A finished note from the contact page: each blank and choice, and the whole sentence as `text`. */
export type Note = {
  name: string;
  thing: string;
  email: string;
  ask: string;
  deadline: string;
  text: string;
};

/** How long the stand-in takes, so the page's sending state is real. */
const STAND_IN_MS = 400;

/**
 * Delivers a note to Atif's inbox. This is where the request to the mail
 * endpoint goes: it should resolve once the note is accepted and throw when it
 * is not, so the page can say it did not go through. There is no mail backend
 * yet, so for now nothing leaves the browser: it only waits, then resolves.
 */
export async function sendNote(note: Note): Promise<void> {
  // The note becomes the request's body; until there is a request it goes nowhere.
  void note;
  await new Promise((resolve) => setTimeout(resolve, STAND_IN_MS));
}
