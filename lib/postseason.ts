// Yahoo labels every postseason game "playoff", consolation bracket included. This marks the games
// that weren't for the title as "consolation": eliminated and non-playoff teams often stop setting
// lineups, so those games would skew records and playoff stats.
//
// The title bracket is replayed from regular-season seeding (record, then points for): every
// postseason game between two teams still alive in the bracket is "playoff", and its loser is out.
// The third-place game (the two semifinal losers, in the last week) also stays "playoff".

export type GameType = "regular" | "playoff" | "consolation";

export interface PostseasonGame {
  season_year: number;
  week: number;
  matchup_type: string;
  team1_name: string;
  team1_score: number;
  team2_name: string;
  team2_score: number;
  winner: string;
  is_tied: boolean;
}

export interface SeasonSettings {
  season_year: number;
  playoff_start_week: string;
  end_week: string;
  num_playoff_teams: string;
}

/** Game type for every game, in the same order as `games`. */
export function classifyGames(games: PostseasonGame[], settings: SeasonSettings[]): GameType[] {
  const types: GameType[] = games.map((g) => (g.matchup_type === "regular" ? "regular" : "consolation"));
  for (const s of settings) {
    const year = s.season_year;
    const n = Number(s.num_playoff_teams);
    const start = Number(s.playoff_start_week);
    const last = Number(s.end_week);

    const record = new Map<string, { wins: number; pf: number }>();
    games.forEach((g) => {
      if (g.season_year !== year || g.matchup_type !== "regular") return;
      for (const [team, pts, won] of [
        [g.team1_name, g.team1_score, g.winner === g.team1_name],
        [g.team2_name, g.team2_score, g.winner === g.team2_name],
      ] as const) {
        const r = record.get(team) ?? { wins: 0, pf: 0 };
        r.wins += g.is_tied ? 0.5 : won ? 1 : 0;
        r.pf += pts;
        record.set(team, r);
      }
    });
    const seeds = [...record].sort((a, b) => b[1].wins - a[1].wins || b[1].pf - a[1].pf).map(([t]) => t);
    const seed = new Map(seeds.map((t, i) => [t, i + 1]));
    const alive = new Set(seeds.slice(0, n));
    let lastOut = new Set<string>();

    for (let w = start; w <= last; w++) {
      const out = new Set<string>();
      games.forEach((g, i) => {
        if (g.season_year !== year || g.week !== w || g.matchup_type === "regular") return;
        const [a, b] = [g.team1_name, g.team2_name];
        if (alive.has(a) && alive.has(b)) {
          types[i] = "playoff";
          // A tie goes to the higher seed.
          const loser = g.is_tied ? (seed.get(a)! < seed.get(b)! ? b : a) : g.winner === a ? b : a;
          out.add(loser);
        } else if (w === last && lastOut.has(a) && lastOut.has(b)) {
          types[i] = "playoff"; // third-place game
        }
      });
      for (const t of out) alive.delete(t);
      lastOut = out;
    }
  }
  return types;
}
