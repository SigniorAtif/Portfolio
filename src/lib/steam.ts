import { cacheLife } from "next/cache";

// The games Atif has finished to the last achievement, for the panel on About
// (components/eggs/SteamPanel), read through app/api/steam. They are the games
// in the Completionist showcase on his Steam profile, in the order he set
// there. Server only: the key is read from the environment here and never
// leaves this file. Anything Steam can't give comes back as "unavailable" with
// the reason, and the panel falls back to the site's own eggs.
//
// Needs, in the environment:
//   STEAM_API_KEY  a Web API key from steamcommunity.com/dev/apikey
//   STEAM_ID       the profile's SteamID64; its "Game details" must be Public

const API = "https://api.steampowered.com";
/** Steam's number for the Completionist showcase among a profile's customizations. */
const COMPLETIONIST = 23;
const TIMEOUT_MS = 8_000;

export type Perfect = {
  appid: number;
  name: string;
  /** Portrait cover art, from Steam's CDN. */
  cover: string;
  hours: number;
  unlocked: number;
  total: number;
  /** When the last achievement fell, in ms since the epoch, or null if Steam didn't say. */
  completed: number | null;
  /** The rarest achievement in it, and the share of all its players who have it. */
  rarest: { name: string; percent: number } | null;
};
export type Showcase =
  | { status: "ok"; games: Perfect[] }
  | { status: "unavailable"; reason: "no-key" | "private" | "empty" | "error" };

type Customizations = {
  response?: { customizations?: { customization_type: number; active?: boolean; slots?: { appid?: number }[] }[] };
};
type OwnedGames = { response?: { games?: { appid: number; name: string; playtime_forever: number }[] } };
type TopAchievements = {
  response?: {
    games?: { appid: number; total_achievements?: number; achievements?: { name: string; player_percent_unlocked: string }[] }[];
  };
};
type PlayerAchievements = { playerstats?: { achievements?: { achieved: number; unlocktime: number }[] } };

/** One call to the Web API. A failure says which call and how, never the URL, which holds the key. */
async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(path, API);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`steam ${path}: ${response.status}`);
  return (await response.json()) as T;
}

/** The games in the profile's Completionist showcase, in its order. */
async function showcased(key: string, steamid: string): Promise<number[]> {
  const profile = await get<Customizations>("/IPlayerService/GetProfileCustomization/v1/", { key, steamid });
  const shelf = profile.response?.customizations?.find(
    (item) => item.customization_type === COMPLETIONIST && item.active !== false,
  );
  return (shelf?.slots ?? []).flatMap((slot) => (slot.appid ? [slot.appid] : []));
}

/** How many of a game's achievements are unlocked, of how many, and when the last one fell. */
async function progress(appid: number, key: string, steamid: string) {
  try {
    const mine = await get<PlayerAchievements>("/ISteamUserStats/GetPlayerAchievements/v1/", {
      key,
      steamid,
      appid: String(appid),
    });
    const all = mine.playerstats?.achievements ?? [];
    const got = all.filter((item) => item.achieved);
    return {
      unlocked: got.length,
      total: all.length,
      completed: got.length ? Math.max(...got.map((item) => item.unlocktime)) * 1000 : null,
    };
  } catch {
    return null;
  }
}

/** Steam's way of passing a list: `name[0]`, `name[1]`, and so on. */
const listed = (name: string, ids: number[]) => Object.fromEntries(ids.map((id, i) => [`${name}[${i}]`, String(id)]));

/**
 * The games Atif has finished to the last achievement, as his profile shows
 * them. A good answer is kept for hours, so Steam hears from the site once a
 * window at most; a failed one only for minutes, so a fix shows up soon.
 */
export async function perfectGames(): Promise<Showcase> {
  "use cache";
  const key = process.env.STEAM_API_KEY;
  const steamid = process.env.STEAM_ID;
  if (!key || !steamid) {
    cacheLife("minutes");
    return { status: "unavailable", reason: "no-key" };
  }
  try {
    const ids = await showcased(key, steamid);
    if (!ids.length) {
      cacheLife("minutes");
      return { status: "unavailable", reason: "empty" };
    }
    const [owned, top, done] = await Promise.all([
      get<OwnedGames>("/IPlayerService/GetOwnedGames/v1/", {
        key,
        steamid,
        include_appinfo: "1",
        include_played_free_games: "1",
        ...listed("appids_filter", ids),
      }),
      // Rarest first, so the first achievement given back for each game is its rarest.
      get<TopAchievements>("/IPlayerService/GetTopAchievementsForGames/v1/", {
        key,
        steamid,
        language: "english",
        max_achievements: "1",
        ...listed("appids", ids),
      }),
      Promise.all(ids.map((appid) => progress(appid, key, steamid))),
    ]);
    // Private game details answer with an empty response rather than an error.
    const games = owned.response?.games;
    if (!games) {
      cacheLife("minutes");
      return { status: "unavailable", reason: "private" };
    }
    const owns = new Map(games.map((game) => [game.appid, game]));
    const tops = new Map((top.response?.games ?? []).map((game) => [game.appid, game]));
    const shelf = ids.flatMap((appid, i): Perfect[] => {
      const game = owns.get(appid);
      if (!game) return [];
      const best = tops.get(appid);
      const total = done[i]?.total || best?.total_achievements || 0;
      const rare = best?.achievements?.[0];
      const percent = Number(rare?.player_percent_unlocked);
      return [
        {
          appid,
          name: game.name.replace(/[™®]/g, "").trim(),
          cover: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`,
          hours: Math.round(game.playtime_forever / 60),
          unlocked: done[i]?.unlocked ?? total,
          total,
          completed: done[i]?.completed ?? null,
          rarest: rare && Number.isFinite(percent) ? { name: rare.name, percent } : null,
        },
      ];
    });
    if (!shelf.length) {
      cacheLife("minutes");
      return { status: "unavailable", reason: "empty" };
    }
    cacheLife("hours");
    return { status: "ok", games: shelf };
  } catch {
    cacheLife("minutes");
    return { status: "unavailable", reason: "error" };
  }
}
