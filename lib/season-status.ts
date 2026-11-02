import championsData from "@/data/champions.json";
import leagueInfo from "@/data/league_info.json";
import matchupsData from "@/data/matchups.json";

// Which season, if any, is still being played: the latest season with no champion yet.

export interface LiveSeason {
  season: number;
  /** Last week with results in the data. */
  throughWeek: number;
}

export function getSeasonRange(): { first: number; last: number } {
  const years = leagueInfo.map((l) => l.season_year);
  return { first: Math.min(...years), last: Math.max(...years) };
}

export function getLiveSeason(): LiveSeason | null {
  const { last } = getSeasonRange();
  if (championsData.some((c) => c.season_year === last)) return null;
  const weeks = matchupsData.filter((m) => m.season_year === last).map((m) => m.week);
  return { season: last, throughWeek: weeks.length ? Math.max(...weeks) : 0 };
}
