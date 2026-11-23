import RivalryLoader from "@/components/rivalry/RivalryLoader";
import { leagueManagers } from "@/lib/games/managers";
import { gameRosters } from "@/lib/games/rosters";
import { nemesis, series, type Series, type SeriesGame } from "@/lib/rivalry/series";
import { statGames } from "@/lib/stats-data";

export const metadata = {
  title: "Rivalry Drive | Blake's Shoes",
  description: "Two minutes left, down to your nemesis. Your real roster against theirs, in 3D. Score to win.",
};

export default function RivalryPage() {
  const managers = leagueManagers();
  const games: SeriesGame[] = statGames.map((g) => ({
    season_year: g.season_year,
    week: g.week,
    team1_manager: g.team1_manager,
    team1_score: g.team1_score,
    team2_manager: g.team2_manager,
    team2_score: g.team2_score,
    is_tied: g.is_tied,
  }));
  const seriesBy: Record<string, Series> = {};
  const nemesisBy: Record<string, string> = {};
  for (const me of managers) {
    const others = managers.filter((m) => m !== me);
    for (const r of others) seriesBy[`${me}|${r}`] = series(games, me, r);
    nemesisBy[me] = nemesis(games, me, others);
  }
  return <RivalryLoader managers={managers} rosters={gameRosters()} seriesBy={seriesBy} nemesisBy={nemesisBy} />;
}
