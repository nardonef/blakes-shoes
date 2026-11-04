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
  pos: string;
  how: string;
  week: number;
  points: number;
  /** Points beyond a typical starter at his position, summed over the weeks he started. */
  aboveAvg: number;
  starts: number;
}

export interface WaiverPickup extends Pickup {
  /** FAAB dollars paid for him (0 before FAAB or for a free-agent add). */
  faab: number;
}

export interface FaabHabit {
  manager: string;
  /** FAAB-era seasons the manager played. */
  seasons: number;
  spent: number;
  perSeason: number;
  bids: number;
  avgBid: number;
  biggest: { player: string; season: number; faab: number };
  /** Starting points from FAAB buys, from the week the bid was paid. */
  points: number;
  perDollar: number;
}

export interface WaiverReport {
  /** Every pickup that beat a typical starter, best first (filterable on the page). */
  pickups: WaiverPickup[];
  /** Managers who spent at least $50, best points per dollar first. */
  spending: FaabHabit[];
  bestBids: WaiverPickup[];
  /** The biggest bids on players who never beat a typical starter. */
  worstBids: WaiverPickup[];
  faabSince: number;
}

export interface LopsidedSide {
  manager: string;
  /** Named players only; a few early trades include players Yahoo's data doesn't name. */
  players: string[];
  total: number;
}

export interface LopsidedTrade {
  id: string;
  season: number;
  week: number;
  /** Winner's starting points from the trade minus the loser's. */
  margin: number;
  winner: LopsidedSide;
  loser: LopsidedSide;
}

export interface FrontOffice {
  trades: TradeRecord[];
  lopsided: LopsidedTrade[];
  projections: ProjectionBeat[];
  waiver: WaiverReport;
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

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Median points of every started player at each position, per week: the "typical starter" baseline. */
export function weeklyStarterMedians(S: SeasonModel): Map<string, number> {
  const pts = new Map<string, number[]>();
  for (const weeks of S.by.values()) {
    for (const [w, rows] of weeks) {
      for (const r of rows) {
        if (!r.started) continue;
        const k = `${w}|${S.info.get(r.player)?.pos ?? ""}`;
        pts.set(k, [...(pts.get(k) ?? []), r.points ?? 0]);
      }
    }
  }
  return new Map([...pts].map(([k, v]) => [k, median(v)]));
}

/** Points above that week's typical starter at the player's position, over his starts for mgr from week `from` on. */
function aboveAverage(S: SeasonModel, base: Map<string, number>, mgr: string, player: string, from: number) {
  const pos = S.info.get(player)?.pos ?? "";
  let total = 0;
  for (const [w, rows] of S.by.get(mgr) ?? []) {
    if (w < from) continue;
    for (const r of rows) {
      if (r.player === player && r.started) total += (r.points ?? 0) - (base.get(`${w}|${pos}`) ?? 0);
    }
  }
  return total;
}

/** Every season's add/pickup scored by what it started for the team that added it, from the add week on. */
function allPickups(): (Pickup & { faab: number; faabWeek: number | null })[] {
  const out: (Pickup & { faab: number; faabWeek: number | null })[] = [];
  for (const y of getRosterSeasons()) {
    const S = getSeasonModel(y)!;
    const base = weeklyStarterMedians(S);
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
        pos: S.info.get(first.player)?.pos ?? "",
        how: first.label,
        week: first.week,
        ...startedFrom(S, first.mgr, first.player, first.week),
        aboveAvg: aboveAverage(S, base, first.mgr, first.player, first.week),
        faab: paid.reduce((a, t) => a + t.faab, 0),
        faabWeek,
      });
    }
  }
  return out;
}

export function getWaiverReport(): WaiverReport {
  const pickups = allPickups();
  const paid = pickups.filter((p) => p.faab > 0);
  const faabSince = Math.min(...paid.map((p) => p.season));
  const slim = (p: (typeof pickups)[number]): WaiverPickup => ({
    season: p.season, manager: p.manager, player: p.player, pos: p.pos, how: p.how,
    week: p.week, points: round1(p.points), aboveAvg: round1(p.aboveAvg), starts: p.starts, faab: p.faab,
  });

  const faabSeasons = new Map<string, number>();
  for (const y of getRosterSeasons().filter((y) => y >= faabSince)) {
    for (const m of getSeasonModel(y)!.managers) if (known(m)) faabSeasons.set(m, (faabSeasons.get(m) ?? 0) + 1);
  }
  const habits = new Map<string, { spent: number; bids: number; points: number; biggest: (typeof paid)[number] }>();
  for (const p of paid) {
    const h = habits.get(p.manager) ?? { spent: 0, bids: 0, points: 0, biggest: p };
    h.spent += p.faab;
    h.bids++;
    h.points += startedFrom(getSeasonModel(p.season)!, p.manager, p.player, p.faabWeek!).points;
    if (p.faab > h.biggest.faab) h.biggest = p;
    habits.set(p.manager, h);
  }

  return {
    pickups: pickups.sort((a, b) => b.aboveAvg - a.aboveAvg).map(slim).filter((p) => p.aboveAvg > 0),
    spending: [...habits]
      .filter(([, h]) => h.spent >= 50)
      .map(([manager, h]) => {
        const seasons = faabSeasons.get(manager) ?? 1;
        return {
          manager, seasons, spent: h.spent, perSeason: round1(h.spent / seasons), bids: h.bids,
          avgBid: round1(h.spent / h.bids),
          biggest: { player: h.biggest.player, season: h.biggest.season, faab: h.biggest.faab },
          points: round1(h.points), perDollar: round1(h.points / h.spent),
        };
      })
      .sort((a, b) => b.perDollar - a.perDollar),
    bestBids: [...paid].sort((a, b) => b.aboveAvg - a.aboveAvg).slice(0, 10).map(slim),
    worstBids: paid
      .filter((p) => p.aboveAvg <= 0)
      .sort((a, b) => b.faab - a.faab || a.aboveAvg - b.aboveAvg)
      .slice(0, 10)
      .map(slim),
    faabSince,
  };
}

/** The 10 trades with the biggest gap between the two sides' starting points. */
export function getLopsidedTrades(): LopsidedTrade[] {
  const side = (s: { mgr: string; gets: { player: string }[]; total: number }): LopsidedSide => ({
    manager: s.mgr,
    players: s.gets.map((g) => g.player).filter(Boolean),
    total: round1(s.total),
  });
  return getAllTrades()
    .map((t) => {
      const [w, l] = [...t.sides].sort((a, b) => b.total - a.total);
      return { id: t.id, season: t.season, week: t.week, margin: round1(w.total - l.total), winner: side(w), loser: side(l) };
    })
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 10);
}

export function getFrontOffice(): FrontOffice {
  return {
    trades: getTradeRecords(),
    lopsided: getLopsidedTrades(),
    projections: getProjectionBeat(),
    waiver: getWaiverReport(),
  };
}
