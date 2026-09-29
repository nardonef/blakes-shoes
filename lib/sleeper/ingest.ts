import { SleeperHttpError, type SleeperGet } from "./client";
import type {
  BracketMatch,
  SeasonPayload,
  SleeperLeague,
  SleeperMatchup,
  SleeperRoster,
  SleeperUser,
} from "./types";

export type ChainEnd = "no-previous" | "max-seasons" | "cycle" | "missing-league";

export interface LeagueChain {
  /** newest first */
  leagues: SleeperLeague[];
  stoppedBecause: ChainEnd;
}

const DEFAULT_WEEKS = 18;

/** Walk previous_league_id back from a league to the first season Sleeper knows about. */
export async function fetchLeagueChain(
  api: SleeperGet,
  leagueId: string,
  opts: { maxSeasons?: number } = {},
): Promise<LeagueChain> {
  const maxSeasons = opts.maxSeasons ?? 25;
  const leagues: SleeperLeague[] = [];
  const seen = new Set<string>();
  let id: string | null = leagueId;

  while (id && id !== "0") {
    if (seen.has(id)) return { leagues, stoppedBecause: "cycle" };
    if (leagues.length >= maxSeasons) return { leagues, stoppedBecause: "max-seasons" };
    seen.add(id);

    let league: SleeperLeague | null;
    try {
      league = await api.get<SleeperLeague>(`/league/${id}`);
    } catch (error) {
      if (error instanceof SleeperHttpError && error.status === 404) league = null;
      else throw error;
    }
    if (!league) return { leagues, stoppedBecause: "missing-league" };
    leagues.push(league);
    id = league.previous_league_id;
  }
  return { leagues, stoppedBecause: "no-previous" };
}

/** Fetch everything the transform needs for one league-season. */
export async function fetchSeason(api: SleeperGet, league: SleeperLeague): Promise<SeasonPayload> {
  const id = league.league_id;
  const lastWeek = league.settings.last_scored_leg ?? league.settings.leg ?? DEFAULT_WEEKS;
  const weeks = Array.from({ length: lastWeek }, (_, i) => i + 1);

  const [users, rosters, winnersBracket, weekly] = await Promise.all([
    api.get<SleeperUser[]>(`/league/${id}/users`),
    api.get<SleeperRoster[]>(`/league/${id}/rosters`),
    api.get<BracketMatch[]>(`/league/${id}/winners_bracket`),
    Promise.all(weeks.map((w) => api.get<SleeperMatchup[]>(`/league/${id}/matchups/${w}`))),
  ]);

  return {
    league,
    users: users ?? [],
    rosters: rosters ?? [],
    winnersBracket: winnersBracket ?? [],
    matchupsByWeek: Object.fromEntries(weeks.map((w, i) => [w, weekly[i] ?? []])),
  };
}

/** Full history for a league: every season in its chain, oldest first. */
export async function fetchHistory(api: SleeperGet, leagueId: string, opts: { maxSeasons?: number } = {}) {
  const chain = await fetchLeagueChain(api, leagueId, opts);
  const seasons = await Promise.all(chain.leagues.map((l) => fetchSeason(api, l)));
  return { chain, seasons: seasons.reverse() };
}

/** Username -> the leagues that user is in for a season; null if the username does not exist. */
export async function findUserLeagues(
  api: SleeperGet,
  username: string,
  season: number,
): Promise<SleeperLeague[] | null> {
  const user = await api.get<{ user_id: string }>(`/user/${encodeURIComponent(username)}`);
  if (!user) return null;
  return (await api.get<SleeperLeague[]>(`/user/${user.user_id}/leagues/nfl/${season}`)) ?? [];
}
