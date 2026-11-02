import { getDraftModel } from "@/lib/draft-board";
import { allPickups } from "@/lib/front-office-data";
import { CURRENT_OWNERS } from "@/lib/legacy-data";
import { getAllPlaySeasons, weekLineup } from "@/lib/luck-lineups-data";
import { getAllTrades, getRosterSeasons, getSeasonModel, managerLabel } from "@/lib/rosters-data";
import { champions } from "@/lib/stats-data";

// "Wrapped": one manager's season in a page of highlights. Server-only.

export interface WrappedPick {
  player: string;
  round: number;
  pick: number;
  finish: number | null;
  value: number | null;
}

export interface WrappedWeek {
  week: number;
  points: number;
  opponent: string;
  opponentPoints: number;
  result: "W" | "L" | "T";
}

export interface Wrapped {
  season: number;
  manager: string;
  team: string;
  photo: string | null;
  finish: { rank: number; wins: number; losses: number; ties: number; pointsFor: number; champion: boolean } | null;
  draft: { grade: string; rank: number; n: number; points: number; first: WrappedPick | null; best: WrappedPick | null; worst: WrappedPick | null } | null;
  pickup: { player: string; pos: string; how: string; week: number; points: number; aboveAvg: number; starts: number } | null;
  trades: { count: number; won: number; lost: number; net: number };
  luck: { wins: number; losses: number; expectedWins: number; luck: number } | null;
  lineups: { efficiency: number; benchPerWeek: number; couldaWon: number; worst: { week: number; left: number; costGame: boolean } | null } | null;
  mvp: { player: string; points: number; starts: number } | null;
  bestWeek: WrappedWeek | null;
  worstWeek: WrappedWeek | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Seasons a manager played (known managers only), newest first. */
export function wrappedSeasons(manager: string): number[] {
  return getRosterSeasons().filter((y) => getSeasonModel(y)!.managers.includes(manager));
}

/** Known managers with at least one season, alphabetical. */
export function wrappedManagers(): string[] {
  const all = new Set<string>();
  for (const y of getRosterSeasons()) for (const m of getSeasonModel(y)!.managers) if (!m.endsWith("(unknown manager)")) all.add(m);
  return [...all].sort();
}

export function getWrapped(manager: string, season: number): Wrapped | null {
  const S = getSeasonModel(season);
  const weeks = S?.by.get(manager);
  if (!S || !weeks) return null;

  const st = S.standings.get(manager);
  const champ = champions.find((c) => c.season_year === season);
  const finish = st
    ? {
        rank: st.final_rank, wins: st.wins, losses: st.losses, ties: st.ties, pointsFor: st.points_for,
        champion: champ != null && managerLabel(champ.champion_manager, champ.champion_team_name) === manager,
      }
    : null;

  // Draft
  const D = getDraftModel().seasons.find((s) => s.year === season);
  const total = D?.totals.find((t) => t.manager === manager);
  const mine = D?.picks.filter((p) => p.manager === manager) ?? [];
  const asPick = (p: (typeof mine)[number] | undefined): WrappedPick | null =>
    p ? { player: p.player, round: p.round, pick: p.pick, finish: p.finish, value: p.value } : null;
  const valued = mine.filter((p) => p.value != null).sort((a, b) => b.value! - a.value!);
  const draft = D && total
    ? {
        grade: total.grade, rank: total.rank, n: D.n, points: total.pts,
        first: asPick(mine.find((p) => p.round === 1)),
        best: asPick(valued[0]),
        // Worst = biggest miss among the first five rounds, where it hurts.
        worst: asPick([...valued].filter((p) => p.round <= 5).sort((a, b) => a.value! - b.value!)[0]),
      }
    : null;

  // Best pickup, scored like the Waiver Wire Hall of Fame (points above a typical starter).
  const p = allPickups()
    .filter((x) => x.season === season && x.manager === manager && x.starts > 0)
    .sort((a, b) => b.aboveAvg - a.aboveAvg)[0];
  const pickup = p
    ? { player: p.player, pos: p.pos, how: p.how, week: p.week, points: round1(p.points), aboveAvg: round1(p.aboveAvg), starts: p.starts }
    : null;

  // Trades
  let won = 0;
  let lost = 0;
  let net = 0;
  const myTrades = getAllTrades().filter((t) => t.season === season && t.sides.some((s) => s.mgr === manager));
  for (const t of myTrades) {
    const me = t.sides.find((s) => s.mgr === manager)!;
    const others = t.sides.filter((s) => s !== me);
    if (me.won) won++;
    else if (others.some((o) => o.won)) lost++;
    net += me.total - others.reduce((a, o) => a + o.total, 0);
  }

  // Luck
  const ap = getAllPlaySeasons().find((s) => s.season === season && s.manager === manager);
  const luck = ap ? { wins: ap.wins, losses: ap.losses, expectedWins: ap.expectedWins, luck: ap.luck } : null;

  // Lineups (regular season)
  let act = 0;
  let opt = 0;
  let n = 0;
  let coulda = 0;
  let worst: { week: number; left: number; costGame: boolean } | null = null;
  for (const w of [...weeks.keys()].sort((a, b) => a - b)) {
    if (w >= S.playoffStart) continue;
    const wl = weekLineup(S, manager, w);
    if (!wl) continue;
    act += wl.actual;
    opt += wl.best;
    n++;
    const g = S.games.get(`${manager}|${w}`);
    const costGame = g?.result === "L" && wl.best > g.opponentPoints;
    if (costGame) coulda++;
    const left = wl.best - wl.actual;
    if (!worst || left > worst.left) worst = { week: w, left: round1(left), costGame };
  }
  const lineups = n ? { efficiency: act / opt, benchPerWeek: round1((opt - act) / n), couldaWon: coulda, worst } : null;

  // Team MVP
  const byPlayer = new Map<string, { points: number; starts: number }>();
  for (const rows of weeks.values()) {
    for (const r of rows) {
      if (!r.started) continue;
      const x = byPlayer.get(r.player) ?? { points: 0, starts: 0 };
      x.points += r.points ?? 0;
      x.starts++;
      byPlayer.set(r.player, x);
    }
  }
  const top = [...byPlayer].sort((a, b) => b[1].points - a[1].points)[0];
  const mvp = top ? { player: top[0], points: round1(top[1].points), starts: top[1].starts } : null;

  // Best and worst weeks
  const games: WrappedWeek[] = [];
  for (const [key, g] of S.games) {
    const sep = key.lastIndexOf("|");
    if (key.slice(0, sep) !== manager) continue;
    games.push({ week: Number(key.slice(sep + 1)), points: g.points, opponent: g.opponent, opponentPoints: g.opponentPoints, result: g.result });
  }
  games.sort((a, b) => b.points - a.points);

  return {
    season,
    manager,
    team: weeks.values().next().value?.[0]?.team ?? st?.team ?? manager,
    photo: CURRENT_OWNERS.find((o) => o.name === manager)?.image ?? null,
    finish,
    draft,
    pickup,
    trades: { count: myTrades.length, won, lost, net: round1(net) },
    luck,
    lineups,
    mvp,
    bestWeek: games[0] ?? null,
    worstWeek: games[games.length - 1] ?? null,
  };
}
