// The stadium scoreboard ticker on /stats: the latest complete week's results. The page builds it on
// the server (getScoreboard); the client component only imports the types.
import { matchups } from "@/lib/stats-data";
import type { Matchup } from "@/types/stats";

export type ScoreLine = { winner: string; winnerScore: string; loser: string; loserScore: string; tied: boolean };
export type Scoreboard = { season: number; week: number; label: string; games: ScoreLine[] };

const pts = (n: number) => n.toFixed(1);

/** The latest week of the latest season in which every game has a score on both sides. */
export function latestWeek(games: Matchup[]): Scoreboard | null {
  const played = games.filter((m) => m.matchup_type !== "consolation");
  if (!played.length) return null;
  const season = Math.max(...played.map((m) => m.season_year));
  const weeks = [...new Set(played.filter((m) => m.season_year === season).map((m) => m.week))].sort((a, b) => b - a);
  for (const week of weeks) {
    const wk = played.filter((m) => m.season_year === season && m.week === week);
    if (!wk.every((m) => m.team1_score > 0 && m.team2_score > 0)) continue;
    const playoff = wk.some((m) => m.matchup_type === "playoff");
    return {
      season,
      week,
      label: `${playoff ? "PLAYOFFS · " : ""}WEEK ${week} · FINAL`,
      games: wk.map((m) => {
        const oneWins = m.team1_score >= m.team2_score;
        return {
          winner: (oneWins ? m.team1_name : m.team2_name).toUpperCase(),
          winnerScore: pts(oneWins ? m.team1_score : m.team2_score),
          loser: (oneWins ? m.team2_name : m.team1_name).toUpperCase(),
          loserScore: pts(oneWins ? m.team2_score : m.team1_score),
          tied: m.is_tied || m.team1_score === m.team2_score,
        };
      }),
    };
  }
  return null;
}

export const getScoreboard = () => latestWeek(matchups);
