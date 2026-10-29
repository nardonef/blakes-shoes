import { getRosterSeasons, getSeasonModel, type SeasonModel } from "@/lib/rosters-data";

// "Luck & Lineups" stats for the Stats page. Server-only; the page gets these small summaries.
// Regular season only: playoff brackets don't have a full slate of games each week.

export interface AllPlayCareer {
  manager: string;
  games: number;
  realPct: number;
  allPlayPct: number;
  /** realPct - allPlayPct, in percentage points. */
  luck: number;
}

export interface AllPlaySeason {
  season: number;
  manager: string;
  wins: number;
  losses: number;
  expectedWins: number;
  /** wins - expectedWins */
  luck: number;
}

export interface LineupEfficiency {
  manager: string;
  weeks: number;
  /** Actual starting points as a share of the best legal lineup from the same roster (0-1). */
  efficiency: number;
  benchPerWeek: number;
  /** Regular-season losses the manager's own best lineup would have won. */
  couldaWon: number;
  losses: number;
}

export interface LuckAndLineups {
  careers: AllPlayCareer[];
  luckiest: AllPlaySeason[];
  unluckiest: AllPlaySeason[];
  lineups: LineupEfficiency[];
}

const known = (m: string) => !m.endsWith("(unknown manager)");
const round1 = (n: number) => Math.round(n * 10) / 10;
const MIN_CAREER_GAMES = 40;

const FLEX_ELIGIBLE: Record<string, string[]> = {
  "W/R/T": ["WR", "RB", "TE"],
  "W/R": ["WR", "RB"],
};

/** Best points a roster could have started given that week's starting slots. Fixed slots take the best
 *  player at their position; flex slots then take the best remaining eligible player. */
export function optimalPoints(
  slots: string[],
  roster: { pos: string; points: number }[],
): number {
  const pool = [...roster].sort((a, b) => b.points - a.points);
  const used = new Set<number>();
  const take = (ok: (pos: string) => boolean) => {
    const i = pool.findIndex((p, j) => !used.has(j) && ok(p.pos));
    if (i < 0) return 0;
    used.add(i);
    return pool[i].points;
  };
  let total = 0;
  for (const s of slots.filter((s) => !FLEX_ELIGIBLE[s])) total += take((pos) => pos === s);
  for (const s of slots.filter((s) => FLEX_ELIGIBLE[s])) total += take((pos) => FLEX_ELIGIBLE[s].includes(pos));
  return total;
}

function regularWeeks(S: SeasonModel): Map<number, { manager: string; points: number; won: boolean }[]> {
  const out = new Map<number, { manager: string; points: number; won: boolean }[]>();
  for (const [key, g] of S.games) {
    const sep = key.lastIndexOf("|");
    const manager = key.slice(0, sep);
    const week = Number(key.slice(sep + 1));
    if (week >= S.playoffStart || g.result === "T") continue;
    out.set(week, [...(out.get(week) ?? []), { manager, points: g.points, won: g.result === "W" }]);
  }
  return out;
}

export function getAllPlay(): Pick<LuckAndLineups, "careers" | "luckiest" | "unluckiest"> {
  const career = new Map<string, { w: number; l: number; rw: number; rl: number }>();
  const seasons: AllPlaySeason[] = [];
  for (const y of getRosterSeasons()) {
    const S = getSeasonModel(y)!;
    const acc = new Map<string, { w: number; l: number; rw: number; rl: number }>();
    for (const teams of regularWeeks(S).values()) {
      for (const t of teams) {
        const a = acc.get(t.manager) ?? { w: 0, l: 0, rw: 0, rl: 0 };
        for (const o of teams) {
          if (o === t) continue;
          if (t.points > o.points) a.w++;
          else if (t.points < o.points) a.l++;
        }
        if (t.won) a.rw++;
        else a.rl++;
        acc.set(t.manager, a);
      }
    }
    for (const [manager, a] of acc) {
      if (!known(manager)) continue;
      const games = a.rw + a.rl;
      const expectedWins = (a.w / (a.w + a.l)) * games;
      seasons.push({ season: y, manager, wins: a.rw, losses: a.rl, expectedWins: round1(expectedWins), luck: round1(a.rw - expectedWins) });
      const c = career.get(manager) ?? { w: 0, l: 0, rw: 0, rl: 0 };
      c.w += a.w; c.l += a.l; c.rw += a.rw; c.rl += a.rl;
      career.set(manager, c);
    }
  }
  const careers = [...career]
    .map(([manager, c]) => {
      const games = c.rw + c.rl;
      const realPct = c.rw / games;
      const allPlayPct = c.w / (c.w + c.l);
      return { manager, games, realPct, allPlayPct, luck: round1((realPct - allPlayPct) * 100) };
    })
    .filter((c) => c.games >= MIN_CAREER_GAMES)
    .sort((a, b) => b.luck - a.luck);
  const bySeasonLuck = [...seasons].sort((a, b) => b.luck - a.luck);
  return { careers, luckiest: bySeasonLuck.slice(0, 5), unluckiest: bySeasonLuck.slice(-5).reverse() };
}

/** One team-week: what the manager started vs the best lineup on that roster. */
export function weekLineup(S: SeasonModel, manager: string, week: number): { actual: number; best: number } | null {
  const rows = S.by.get(manager)?.get(week);
  const starters = rows?.filter((r) => r.started) ?? [];
  if (!rows || !starters.length) return null;
  // A player's position: listed position, else a non-flex slot he started in. Unknown = can't be moved.
  const posOf = (player: string, slot: string) =>
    S.info.get(player)?.pos?.split(",")[0] || (FLEX_ELIGIBLE[slot] || slot === "BN" || slot === "IR" ? "" : slot);
  const actual = starters.reduce((a, r) => a + (r.points ?? 0), 0);
  const best = optimalPoints(
    starters.map((r) => r.slot),
    rows.filter((r) => r.slot !== "IR").map((r) => ({ pos: posOf(r.player, r.slot), points: r.points ?? 0 })),
  );
  return { actual, best: Math.max(actual, best) };
}

export function getLineupEfficiency(): LineupEfficiency[] {
  const acc = new Map<string, { act: number; opt: number; weeks: number; couldaWon: number; losses: number }>();
  for (const y of getRosterSeasons()) {
    const S = getSeasonModel(y)!;
    for (const [manager, weeks] of S.by) {
      if (!known(manager)) continue;
      for (const w of weeks.keys()) {
        if (w >= S.playoffStart) continue;
        const wl = weekLineup(S, manager, w);
        if (!wl) continue;
        const { actual, best } = wl;
        const a = acc.get(manager) ?? { act: 0, opt: 0, weeks: 0, couldaWon: 0, losses: 0 };
        a.act += actual;
        a.opt += best;
        a.weeks++;
        const g = S.games.get(`${manager}|${w}`);
        if (g?.result === "L") {
          a.losses++;
          if (best > g.opponentPoints) a.couldaWon++;
        }
        acc.set(manager, a);
      }
    }
  }
  return [...acc]
    .filter(([, a]) => a.weeks >= MIN_CAREER_GAMES)
    .map(([manager, a]) => ({
      manager,
      weeks: a.weeks,
      efficiency: a.act / a.opt,
      benchPerWeek: round1((a.opt - a.act) / a.weeks),
      couldaWon: a.couldaWon,
      losses: a.losses,
    }))
    .sort((a, b) => b.efficiency - a.efficiency);
}

export function getLuckAndLineups(): LuckAndLineups {
  return { ...getAllPlay(), lineups: getLineupEfficiency() };
}
