import { getAllTrades, getRosterSeasons, getSeasonModel, type SeasonModel } from "@/lib/rosters-data";

// "Front Office" stats for the Stats page: trades, waiver pickups, and starters vs projections.
// Server-only; the page receives just these small summaries.

export interface TradeRecord {
  manager: string;
  trades: number;
  wins: number;
  losses: number;
  /** Points the manager's received players started for, minus what the other side's did. */
  net: number;
}

export interface ProjectionBeat {
  manager: string;
  weeks: number;
  total: number;
  perWeek: number;
}

export interface Pickup {
  season: number;
  manager: string;
  player: string;
  how: string;
  week: number;
  points: number;
  starts: number;
}

export interface FaabValue {
  manager: string;
  spent: number;
  points: number;
  perDollar: number;
}

export interface FrontOffice {
  trades: TradeRecord[];
  projections: ProjectionBeat[];
  pickups: Pickup[];
  faab: FaabValue[];
}

const known = (m: string) => !m.endsWith("(unknown manager)");
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Starting points mgr got from player in a season, from week `from` on. */
function startedFrom(S: SeasonModel, mgr: string, player: string, from: number) {
  let points = 0;
  let starts = 0;
  for (const [w, rows] of S.by.get(mgr) ?? []) {
    if (w < from) continue;
    for (const r of rows) if (r.player === player && r.started) { points += r.points ?? 0; starts++; }
  }
  return { points, starts };
}

export function getTradeRecords(): TradeRecord[] {
  const out = new Map<string, TradeRecord>();
  for (const t of getAllTrades()) {
    for (const s of t.sides) {
      if (!known(s.mgr)) continue;
      const others = t.sides.filter((o) => o !== s);
      const r = out.get(s.mgr) ?? { manager: s.mgr, trades: 0, wins: 0, losses: 0, net: 0 };
      r.trades++;
      if (s.won) r.wins++;
      else if (others.some((o) => o.won)) r.losses++;
      r.net += s.total - others.reduce((a, o) => a + o.total, 0);
      out.set(s.mgr, r);
    }
  }
  return [...out.values()].map((r) => ({ ...r, net: round1(r.net) })).sort((a, b) => b.net - a.net);
}

/** Managers with at least two seasons of starts, ranked by points over projection per week. */
export function getProjectionBeat(): ProjectionBeat[] {
  const acc = new Map<string, { weeks: number; total: number }>();
  for (const y of getRosterSeasons()) {
    for (const [mgr, weeks] of getSeasonModel(y)!.by) {
      if (!known(mgr)) continue;
      const a = acc.get(mgr) ?? { weeks: 0, total: 0 };
      for (const rows of weeks.values()) {
        const starters = rows.filter((r) => r.started && r.projected != null);
        if (!starters.length) continue;
        a.weeks++;
        for (const r of starters) a.total += (r.points ?? 0) - r.projected!;
      }
      acc.set(mgr, a);
    }
  }
  return [...acc]
    .filter(([, a]) => a.weeks >= 26)
    .map(([manager, a]) => ({ manager, weeks: a.weeks, total: round1(a.total), perWeek: round1(a.total / a.weeks) }))
    .sort((a, b) => b.perWeek - a.perWeek);
}

/** Every season's add/pickup scored by what it started for the team that added it, from the add week on. */
function allPickups(): (Pickup & { faab: number; faabWeek: number | null })[] {
  const out: (Pickup & { faab: number; faabWeek: number | null })[] = [];
  for (const y of getRosterSeasons()) {
    const S = getSeasonModel(y)!;
    const groups = new Map<string, typeof S.txns>();
    for (const t of S.txns) {
      if (t.type !== "add" || !known(t.mgr)) continue;
      const k = `${t.mgr}|${t.player}`;
      groups.set(k, [...(groups.get(k) ?? []), t]);
    }
    for (const adds of groups.values()) {
      const first = adds.reduce((a, b) => (b.date < a.date ? b : a));
      const paid = adds.filter((a) => a.faab > 0);
      const faabWeek = paid.length ? Math.min(...paid.map((a) => a.week)) : null;
      out.push({
        season: y,
        manager: first.mgr,
        player: first.player,
        how: first.label,
        week: first.week,
        ...startedFrom(S, first.mgr, first.player, first.week),
        faab: paid.reduce((a, t) => a + t.faab, 0),
        faabWeek,
      });
    }
  }
  return out;
}

export function getFrontOffice(): FrontOffice {
  const pickups = allPickups();

  const faab = new Map<string, { spent: number; points: number }>();
  for (const p of pickups) {
    if (!p.faab) continue;
    const S = getSeasonModel(p.season)!;
    const f = faab.get(p.manager) ?? { spent: 0, points: 0 };
    f.spent += p.faab;
    f.points += startedFrom(S, p.manager, p.player, p.faabWeek!).points;
    faab.set(p.manager, f);
  }

  return {
    trades: getTradeRecords(),
    projections: getProjectionBeat(),
    pickups: pickups
      .sort((a, b) => b.points - a.points)
      .slice(0, 10)
      .map((p) => ({
        season: p.season, manager: p.manager, player: p.player, how: p.how,
        week: p.week, points: round1(p.points), starts: p.starts,
      })),
    faab: [...faab]
      .filter(([, f]) => f.spent >= 50)
      .map(([manager, f]) => ({ manager, spent: f.spent, points: round1(f.points), perDollar: round1(f.points / f.spent) }))
      .sort((a, b) => b.perDollar - a.perDollar),
  };
}
