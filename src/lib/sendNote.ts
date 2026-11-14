import type { Note } from "@/content/contact";

/**
 * Delivers a note to Atif's inbox through the site's mail endpoint. Resolves
 * once the note is accepted and throws when it is not, so the page can say it
 * did not go through.
 */
export async function sendNote(note: Note): Promise<void> {
  const response = await fetch("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note),
  });
  if (!response.ok) throw new Error(`The note was not accepted (${response.status}).`);
}
