// The real all-time series between two managers (playoffs in, consolation games out, as on /stats),
// the nemesis to default to, and the deficit the two-minute drill starts from.

export interface SeriesGame {
  season_year: number;
  week: number;
  team1_manager: string;
  team1_score: number;
  team2_manager: string;
  team2_score: number;
  is_tied: boolean | number;
}

export interface Series {
  wins: number;
  losses: number;
  ties: number;
  /** Most recent meeting, from your side. */
  last?: { season: number; week: number; mine: number; theirs: number };
  /** Your most recent loss to them, from your side. */
  lastLoss?: { season: number; week: number; mine: number; theirs: number };
}

function fromMySide(g: SeriesGame, me: string) {
  const mine = g.team1_manager === me ? g.team1_score : g.team2_score;
  const theirs = g.team1_manager === me ? g.team2_score : g.team1_score;
  return { season: g.season_year, week: g.week, mine, theirs };
}

const chronological = (a: SeriesGame, b: SeriesGame) => a.season_year - b.season_year || a.week - b.week;

export function series(games: SeriesGame[], me: string, rival: string): Series {
  const between = games
    .filter((g) => (g.team1_manager === me && g.team2_manager === rival) || (g.team1_manager === rival && g.team2_manager === me))
    .sort(chronological);
  const s: Series = { wins: 0, losses: 0, ties: 0 };
  for (const g of between) {
    const r = fromMySide(g, me);
    if (g.is_tied || r.mine === r.theirs) s.ties++;
    else if (r.mine > r.theirs) s.wins++;
    else {
      s.losses++;
      s.lastLoss = r;
    }
    s.last = r;
  }
  return s;
}

/** The rival with the best record against you (most net wins over you, then most games). */
export function nemesis(games: SeriesGame[], me: string, rivals: string[]): string {
  const ranked = rivals
    .map((r) => ({ r, s: series(games, me, r) }))
    .sort((a, b) => b.s.losses - b.s.wins - (a.s.losses - a.s.wins) || b.s.losses + b.s.wins - (a.s.losses + a.s.wins) || a.r.localeCompare(b.r));
  return ranked[0].r;
}

/** Points you're down: 4 plus one per 15 fantasy points of your last loss to them, up to 6 (a TD always wins). */
export function deficit(s: Series): number {
  if (!s.lastLoss) return 4;
  return 4 + Math.min(2, Math.floor((s.lastLoss.theirs - s.lastLoss.mine) / 15));
}

/** "KLENSCH LEADS 14-9", "NARDONE LEADS 9-8-1", "SERIES TIED 5-5". */
export function seriesLine(s: Series, meShort: string, rivalShort: string): string {
  const t = s.ties ? `-${s.ties}` : "";
  if (s.wins === s.losses) return `SERIES TIED ${s.wins}-${s.losses}${t}`;
  return s.wins > s.losses ? `${meShort} LEADS ${s.wins}-${s.losses}${t}` : `${rivalShort} LEADS ${s.losses}-${s.wins}${t}`;
}
