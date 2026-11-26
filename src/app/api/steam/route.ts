import { perfectGames } from "@/lib/steam";

/**
 * The games Atif has finished to the last achievement, for the panel on About.
 * Always a 200 with a `status`: "ok" with the showcase and the rest, or
 * "unavailable" with the reason (no key, a private profile, no game at 100%,
 * or Steam failing). The work and the cache live in lib/steam.
 */
export async function GET() {
  return Response.json(await perfectGames());
}
