import { cacheLife } from "next/cache";

// The games Atif has finished to the last achievement, for the panel on About
// (components/eggs/SteamPanel), read through app/api/steam. The ones in the
// Completionist showcase on his Steam profile come first, in the order he set
// there; every other game he has 100% follows, newest finish first. Server
// only: the key is read from the environment here and never leaves this file.
// Anything Steam can't give comes back as "unavailable" with the reason, and
// the panel falls back to the site's own eggs.
//
// Needs, in the environment:
//   STEAM_API_KEY  a Web API key from steamcommunity.com/dev/apikey
//   STEAM_ID       the profile's SteamID64; its "Game details" must be Public

const API = "https://api.steampowered.com";
/** Steam's number for the Completionist showcase among a profile's customizations. */
const COMPLETIONIST = 23;
const TIMEOUT_MS = 8_000;
/** Games per achievements call, so the URL stays short however big the library gets. */
const BATCH = 50;
/** More than any game has, so a call gives back every achievement a player holds. */
const EVERY = "10000";

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
export type SteamGames =
  | {
      status: "ok";
      /** The Completionist showcase, in its order. */
      showcased: Perfect[];
      /** Every other game at 100%, newest finish first. */
      rest: Perfect[];
    }
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
 * Every achievement Atif holds in each of these games, rarest first, with how
 * many each game has. One call per batch, rather than one per game.
 */
async function held(ids: number[], key: string, steamid: string) {
  const batches = Array.from({ length: Math.ceil(ids.length / BATCH) }, (_, i) => ids.slice(i * BATCH, (i + 1) * BATCH));
  const answers = await Promise.all(
    batches.map((batch) =>
      get<TopAchievements>("/IPlayerService/GetTopAchievementsForGames/v1/", {
        key,
        steamid,
        language: "english",
        max_achievements: EVERY,
        ...listed("appids", batch),
      }),
    ),
  );
  return new Map(answers.flatMap((answer) => answer.response?.games ?? []).map((game) => [game.appid, game]));
}

/**
 * The games Atif has finished to the last achievement: the showcase on his
 * profile, then the rest. A good answer is kept for hours, so Steam hears from
 * the site once a window at most; a failed one only for minutes, so a fix
 * shows up soon.
 */
export async function perfectGames(): Promise<SteamGames> {
  "use cache";
  const key = process.env.STEAM_API_KEY;
  const steamid = process.env.STEAM_ID;
  if (!key || !steamid) {
    cacheLife("minutes");
    return { status: "unavailable", reason: "no-key" };
  }
  try {
    const [owned, shelf] = await Promise.all([
      get<OwnedGames>("/IPlayerService/GetOwnedGames/v1/", {
        key,
        steamid,
        include_appinfo: "1",
        include_played_free_games: "1",
      }),
      showcased(key, steamid),
    ]);
    // Private game details answer with an empty response rather than an error.
    const games = owned.response?.games;
    if (!games) {
      cacheLife("minutes");
      return { status: "unavailable", reason: "private" };
    }
    // A game never launched has no achievements to its name, so only played ones are asked about.
    const tops = await held(
      games.filter((game) => game.playtime_forever > 0).map((game) => game.appid),
      key,
      steamid,
    );
    const done = (appid: number) => {
      const top = tops.get(appid);
      const total = top?.total_achievements ?? 0;
      return total > 0 && (top?.achievements?.length ?? 0) >= total;
    };
    const ids = [...new Set([...shelf, ...games.map((game) => game.appid).filter(done)])];
    if (!ids.length) {
      cacheLife("minutes");
      return { status: "unavailable", reason: "empty" };
    }
    const finished = await Promise.all(ids.map((appid) => progress(appid, key, steamid)));
    const owns = new Map(games.map((game) => [game.appid, game]));
    const perfect = ids.flatMap((appid, i): Perfect[] => {
      const game = owns.get(appid);
      if (!game) return [];
      const top = tops.get(appid);
      const total = finished[i]?.total || top?.total_achievements || 0;
      // The list comes rarest first, but the smallest share is picked rather than trusting the order.
      const rare = (top?.achievements ?? [])
        .map((item) => ({ name: item.name, percent: Number(item.player_percent_unlocked) }))
        .filter((item) => Number.isFinite(item.percent))
        .reduce<{ name: string; percent: number } | null>((low, item) => (!low || item.percent < low.percent ? item : low), null);
      return [
        {
          appid,
          name: game.name.replace(/[™®]/g, "").trim(),
          cover: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`,
          hours: Math.round(game.playtime_forever / 60),
          unlocked: finished[i]?.unlocked ?? top?.achievements?.length ?? total,
          total,
          completed: finished[i]?.completed ?? null,
          rarest: rare,
        },
      ];
    });
    const onShelf = new Set(shelf);
    cacheLife("hours");
    return {
      status: "ok",
      showcased: perfect.filter((game) => onShelf.has(game.appid)),
      rest: perfect
        .filter((game) => !onShelf.has(game.appid))
        .sort((a, b) => (b.completed ?? 0) - (a.completed ?? 0)),
    };
  } catch {
    cacheLife("minutes");
    return { status: "unavailable", reason: "error" };
  }
}
