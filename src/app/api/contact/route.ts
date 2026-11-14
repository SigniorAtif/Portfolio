import { asks, deadlines, noteText, type Note } from "@/content/contact";

/*
 * Takes a note from the contact page and mails it to Atif through Cloudflare
 * Email Service. Mail to a verified destination address of the Cloudflare
 * account is free and outside the sending quota, so the note goes to
 * CONTACT_TO (Atif's own inbox, verified under Email Routing), never to the
 * public address shown on the page.
 *
 * Needs, in the environment:
 *   CLOUDFLARE_ACCOUNT_ID   the account that has Email Routing on ahmedatif.in
 *   CLOUDFLARE_EMAIL_TOKEN  an API token with the "Email Sending: Edit" permission
 *   CONTACT_TO              the verified destination address the note lands in
 */

/** The sender. Must be on a domain that has Email Routing in the same account. */
const FROM = { address: "note@ahmedatif.in", name: "ahmedatif.in" };

/** Longest each part may be, and the whole request body, in characters. */
const LIMITS = { name: 80, thing: 300, email: 254, body: 4_096 };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * At most PER_SENDER notes from one address, and OVERALL from everyone, in
 * each WINDOW_MS. Kept in memory, so each running server instance counts on
 * its own: enough to blunt a burst, not a wall.
 */
const WINDOW_MS = 10 * 60_000;
const PER_SENDER = 5;
const OVERALL = 40;
const recent = new Map<string, number[]>();

function admit(sender: string, now: number): boolean {
  const fresh = (key: string) => (recent.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  const mine = fresh(sender);
  const everyone = fresh("*");
  if (mine.length >= PER_SENDER || everyone.length >= OVERALL) return false;
  recent.set(sender, [...mine, now]);
  recent.set("*", [...everyone, now]);
  // Forget senders whose notes are all out of the window, so the map cannot grow without end.
  if (recent.size > 1_000) {
    for (const [key, times] of recent) if (times.every((time) => now - time >= WINDOW_MS)) recent.delete(key);
  }
  return true;
}

const reply = (status: number) => Response.json({ ok: status === 200 }, { status });

/** Folds any run of whitespace, line breaks included, into one space. */
const clean = (value: unknown) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");
const fits = (value: string, max: number) => value !== "" && value.length <= max;

/** The note, if every part is there, within its length, and the ask and deadline are ones the page offers. */
function readNote(body: unknown): Note | null {
  if (typeof body !== "object" || body === null) return null;
  const raw = body as Record<string, unknown>;
  const note: Note = {
    name: clean(raw.name),
    thing: clean(raw.thing),
    ask: clean(raw.ask),
    deadline: clean(raw.deadline),
    email: clean(raw.email),
  };
  const whole =
    fits(note.name, LIMITS.name) &&
    fits(note.thing, LIMITS.thing) &&
    fits(note.email, LIMITS.email) &&
    EMAIL.test(note.email) &&
    asks.includes(note.ask) &&
    deadlines.includes(note.deadline);
  return whole ? note : null;
}

/** Browsers send Origin on a POST; a note must come from a page on this same host. */
function fromThisSite(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const senderOf = (request: Request) =>
  request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

export async function POST(request: Request) {
  if (!fromThisSite(request)) return reply(403);

  const { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_EMAIL_TOKEN: token, CONTACT_TO: to } = process.env;
  if (!account || !token || !to) {
    console.error("contact: mail is not set up; CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_EMAIL_TOKEN and CONTACT_TO are all needed");
    return reply(503);
  }

  const raw = await request.text();
  if (raw.length > LIMITS.body) return reply(413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return reply(400);
  }
  const note = readNote(body);
  if (!note) return reply(400);
  if (!admit(senderOf(request), Date.now())) return reply(429);

  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/email/sending/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to,
        // Replying in the inbox answers the visitor, not the site.
        reply_to: note.email,
        subject: `Note from ${note.name}`,
        text: `${noteText(note)}\n\nSent from the contact page. Reply to this mail to answer ${note.name}.`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const result = (await response.json().catch(() => null)) as {
      success?: boolean;
      errors?: { code: number; message: string }[];
      result?: { permanent_bounces?: string[] } | null;
    } | null;
    if (!response.ok || !result?.success || result.result?.permanent_bounces?.length) {
      console.error("contact: Cloudflare did not take the note", response.status, result?.errors ?? result?.result);
      return reply(502);
    }
  } catch (error) {
    console.error("contact: could not reach Cloudflare", error);
    return reply(502);
  }

  return reply(200);
}
