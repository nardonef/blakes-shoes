import leagueInfo from "@/data/league_info.json";
import { getDraftPicks } from "@/lib/draft-data";
import { buildLeagueTables } from "@/lib/league-sql";
import { matchups, resolveManagerName, standings } from "@/lib/stats-data";

// Roster archive model for /rosters (see the design handoff, HANDOFF-3-rosters.md).
// Server-only: built from the full lineups/transactions tables, never shipped raw.

const SLOT_ORDER = ["QB", "WR", "RB", "TE", "W/R/T", "K", "DEF", "BN", "IR"];
const NON_POSITION_SLOTS = new Set(["W/R/T", "W/R", "BN", "IR", ""]);
const HIDDEN_RAW = "--hidden--";
const HIDDEN_LABEL = "Hidden manager";

export type AcqKind = "draft" | "trade" | "waiver" | "fa";

/** One manager per team-season: aliases resolved, bare usernames capitalized, hidden managers named by team. */
export function managerLabel(manager: string, team: string): string {
  if (manager === HIDDEN_LABEL || manager === HIDDEN_RAW) return `${team} (unknown manager)`;
  const name = resolveManagerName(manager);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function managerSlug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** 6am on Labor Day, the start of week 1. Yahoo times are stored without a zone, so compare them all as UTC. */
function weekOneStart(year: number): number {
  const d = new Date(Date.UTC(year, 8, 1, 6));
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  return d.getTime();
}

/**
 * Week whose roster a transaction first shows up on. Moves made Thursday through Sunday night
 * land on that week's roster; from Monday morning on they count toward the next week. Checked
 * against lineups for every trade 2012-2025 (only a preseason 2014 trade differs).
 */
export function transactionWeek(year: number, date: string, maxWeek: number): number {
  const t = Date.parse(`${date.replace(" ", "T")}:00Z`);
  const w = Math.floor((t - weekOneStart(year)) / 864e5 / 7) + 1;
  return Math.max(1, Math.min(maxWeek, w));
}

interface LineupRow {
  mgr: string;
  team: string;
  week: number;
  slot: string;
  started: boolean;
  player: string;
  points: number | null;
  projected: number | null;
}

interface Txn {
  txn: number;
  date: string;
  week: number;
  type: "add" | "drop" | "trade";
  mgr: string;
  team: string;
  player: string;
  nfl: string;
  pos: string;
  kind: AcqKind;
  label: string;
  faab: number;
}

export interface TradeSide {
  mgr: string;
  team: string;
  from: string[];
  gets: { player: string; pos: string; nfl: string; pts: number; starts: number }[];
  total: number;
  won: boolean;
}

export interface Trade {
  id: string;
  season: number;
  date: string;
  week: number;
  sides: TradeSide[];
}

export interface Acquisition {
  kind: AcqKind;
  label: string;
  week: number | null;
  tradeId?: string;
}

interface Standing {
  final_rank: number;
  wins: number;
  losses: number;
  ties: number;
  points_for: number;
}

interface Game {
  result: "W" | "L" | "T";
  points: number;
  opponentPoints: number;
  opponent: string;
}

export interface SeasonModel {
  year: number;
  maxWeek: number;
  playoffStart: number;
  managers: string[];
  by: Map<string, Map<number, LineupRow[]>>;
  txns: Txn[];
  trades: Trade[];
  standings: Map<string, Standing & { team: string }>;
  games: Map<string, Game>;
  draftRound: Map<string, number>;
  info: Map<string, { pos: string; nfl: string }>;
}

const firstName = (label: string) => label.split(" ")[0];

function acqLabel(type: Txn["type"], detail: string): { kind: AcqKind; label: string } {
  if (type === "trade") return { kind: "trade", label: "Trade" };
  const bid = /\$(\d+)\s*Waiver/.exec(detail);
  if (bid) return { kind: "waiver", label: `Waiver · $${bid[1]}` };
  if (/Waiver/.test(detail)) return { kind: "waiver", label: "Waiver" };
  return { kind: "fa", label: "Free agent" };
}

let cache: Map<number, SeasonModel> | null = null;

function buildAll(): Map<number, SeasonModel> {
  const tables = buildLeagueTables();
  const teamLabel = new Map<string, string>(); // team_key -> manager label
  const out = new Map<number, SeasonModel>();

  for (const s of standings) teamLabel.set(s.team_key, managerLabel(s.manager_name, s.team_name));

  for (const li of leagueInfo) {
    const year = li.season_year;
    const lineups = tables.lineups.filter((r) => r.season === year);
    if (!lineups.length) continue;
    const maxWeek = Math.max(...lineups.map((r) => r.week));

    const by = new Map<string, Map<number, LineupRow[]>>();
    for (const r of lineups) {
      const mgr = managerLabel(r.manager, r.team);
      const weeks = by.get(mgr) ?? new Map<number, LineupRow[]>();
      by.set(mgr, weeks);
      const rows = weeks.get(r.week) ?? [];
      weeks.set(r.week, rows);
      rows.push({
        mgr, team: r.team, week: r.week, slot: r.slot, started: r.started === 1,
        player: r.player, points: r.points, projected: r.projected,
      });
    }
    for (const weeks of by.values()) {
      for (const rows of weeks.values()) rows.sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));
    }

    const txns: Txn[] = tables.transactions
      .filter((t) => t.season === year)
      .map((t) => ({
        txn: t.txn, date: t.date, week: transactionWeek(year, t.date, maxWeek),
        type: t.type as Txn["type"], mgr: managerLabel(t.manager, t.team), team: t.team,
        player: t.player, nfl: t.nfl_team, pos: t.position,
        ...acqLabel(t.type as Txn["type"], t.detail),
        faab: t.type === "add" ? Number(/\$(\d+)/.exec(t.detail)?.[1] ?? 0) : 0,
      }));

    const draftRound = new Map<string, number>();
    for (const d of getDraftPicks()) {
      const mgr = teamLabel.get(d.teamKey);
      if (d.season === year && mgr && d.resolved) draftRound.set(`${mgr}|${d.player}`, d.round);
    }

    const info = new Map<string, { pos: string; nfl: string }>();
    for (const t of txns) info.set(t.player, { pos: t.pos, nfl: t.nfl }); // latest row wins
    for (const r of lineups) {
      if (!info.has(r.player) && !NON_POSITION_SLOTS.has(r.slot)) info.set(r.player, { pos: r.slot, nfl: "" });
    }

    const startedPts = (mgr: string, player: string, fromWeek: number) => {
      let pts = 0;
      let starts = 0;
      for (const [w, rows] of by.get(mgr) ?? []) {
        if (w < fromWeek) continue;
        for (const r of rows) if (r.player === player && r.started) { pts += r.points ?? 0; starts++; }
      }
      return { pts, starts };
    };

    const grouped = new Map<number, Txn[]>();
    for (const t of txns.filter((t) => t.type === "trade")) grouped.set(t.txn, [...(grouped.get(t.txn) ?? []), t]);
    const trades: Trade[] = [...grouped.values()].map((rows) => {
      const first = rows[0];
      const sideMap = new Map<string, TradeSide>();
      for (const r of rows) {
        const side = sideMap.get(r.mgr) ?? { mgr: r.mgr, team: r.team, from: [], gets: [], total: 0, won: false };
        sideMap.set(r.mgr, side);
        side.gets.push({ player: r.player, pos: r.pos, nfl: r.nfl, ...startedPts(r.mgr, r.player, first.week) });
      }
      const sides = [...sideMap.values()];
      for (const s of sides) {
        s.from = sides.filter((o) => o !== s).map((o) => o.mgr);
        s.total = s.gets.reduce((a, g) => a + g.pts, 0);
      }
      const best = Math.max(...sides.map((s) => s.total));
      for (const s of sides) s.won = s.total === best && sides.some((o) => o.total < best);
      return { id: `${year}-${first.txn}`, season: year, date: first.date, week: first.week, sides };
    });
    trades.sort((a, b) => b.date.localeCompare(a.date));

    const seasonStandings = new Map<string, Standing & { team: string }>();
    for (const s of standings.filter((s) => s.season_year === year)) {
      seasonStandings.set(managerLabel(s.manager_name, s.team_name), {
        team: s.team_name, final_rank: s.final_rank, wins: s.wins, losses: s.losses, ties: s.ties, points_for: s.points_for,
      });
    }

    const games = new Map<string, Game>();
    for (const m of matchups.filter((m) => m.season_year === year)) {
      const a = managerLabel(m.team1_manager, m.team1_name);
      const b = managerLabel(m.team2_manager, m.team2_name);
      const res = (mine: number, theirs: number): Game["result"] => (m.is_tied ? "T" : mine > theirs ? "W" : "L");
      games.set(`${a}|${m.week}`, { result: res(m.team1_score, m.team2_score), points: m.team1_score, opponentPoints: m.team2_score, opponent: b });
      games.set(`${b}|${m.week}`, { result: res(m.team2_score, m.team1_score), points: m.team2_score, opponentPoints: m.team1_score, opponent: a });
    }

    out.set(year, {
      year, maxWeek, playoffStart: Number(li.playoff_start_week),
      managers: [...by.keys()].sort(), by, txns, trades,
      standings: seasonStandings, games, draftRound, info,
    });
  }
  return out;
}

function all(): Map<number, SeasonModel> {
  cache ??= buildAll();
  return cache;
}

export function getRosterSeasons(): number[] {
  return [...all().keys()].sort((a, b) => b - a);
}

export function getSeasonModel(year: number): SeasonModel | undefined {
  return all().get(year);
}

export function getAllTrades(): Trade[] {
  return getRosterSeasons().flatMap((y) => all().get(y)!.trades);
}

/** How mgr came to have player on the roster as of week w. */
export function acquisition(S: SeasonModel, mgr: string, player: string, w: number): Acquisition {
  const t = S.txns
    .filter((t) => t.mgr === mgr && t.player === player && t.type !== "drop" && t.week <= w)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!t) {
    const round = S.draftRound.get(`${mgr}|${player}`);
    return { kind: "draft", label: round ? `Draft · Rd ${round}` : "Draft", week: null };
  }
  if (t.kind === "trade") {
    const id = `${S.year}-${t.txn}`;
    const from = S.trades.find((x) => x.id === id)?.sides.find((s) => s.mgr === mgr)?.from ?? [];
    return { kind: "trade", label: from.length ? `Trade · ${from.map(firstName).join(" & ")}` : "Trade", week: t.week, tradeId: id };
  }
  return { kind: t.kind, label: t.label, week: t.week };
}

/** How player left mgr's roster going into week w. */
export function departure(S: SeasonModel, mgr: string, player: string, w: number): { label: string; tradeId?: string } {
  const t = S.txns
    .filter(
      (t) =>
        t.player === player && t.week <= w && t.week >= w - 1 &&
        ((t.type === "drop" && t.mgr === mgr) || (t.type === "trade" && t.mgr !== mgr)),
    )
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (t?.type === "trade") return { label: `Traded to ${firstName(t.mgr)}`, tradeId: `${S.year}-${t.txn}` };
  return { label: "Dropped" };
}

export interface RosterRow {
  slot: string;
  started: boolean;
  player: string;
  pos: string;
  nfl: string;
  acq: Acquisition;
  isNew: boolean;
  points: number | null;
  projected: number | null;
  season: { pts: number; starts: number; weeks: number };
}

export interface TeamView {
  year: number;
  mgr: string;
  team: string;
  standing: Standing | null;
  weeks: number[];
  playoffStart: number;
  isFinal: boolean;
  week: number;
  game: Game | null;
  groups: { title: string; rows: RosterRow[] }[];
  final: { trades: { players: string; week: number; from: string; tradeId: string }[]; adds: number; faab: number } | null;
  changes: { ins: { player: string; label: string; tradeId?: string }[]; outs: { player: string; label: string; tradeId?: string }[] } | null;
}

/** week = null (or past the last week) is the final roster. */
export function getTeamView(S: SeasonModel, mgr: string, week: number | null): TeamView {
  const byWeek = S.by.get(mgr)!;
  const weeks = [...byWeek.keys()].sort((a, b) => a - b);
  const last = weeks[weeks.length - 1];
  const isFinal = week == null || week >= last;
  const w = isFinal ? last : Math.max(weeks[0], week);
  const rows = byWeek.get(w) ?? [];
  const prevRows = byWeek.get(w - 1) ?? [];
  const prev = new Set(prevRows.map((r) => r.player));

  const seasonFor = (player: string) => {
    let pts = 0;
    let starts = 0;
    let n = 0;
    for (const rs of byWeek.values()) {
      for (const r of rs) if (r.player === player) { n++; if (r.started) { pts += r.points ?? 0; starts++; } }
    }
    return { pts, starts, weeks: n };
  };

  const toRow = (r: LineupRow): RosterRow => {
    const inf = S.info.get(r.player);
    return {
      slot: r.slot === "W/R/T" ? "FLEX" : r.slot,
      started: r.started,
      player: r.player,
      pos: inf?.pos ?? "",
      nfl: inf?.nfl ?? "",
      acq: acquisition(S, mgr, r.player, w),
      isNew: !isFinal && w > weeks[0] && !prev.has(r.player),
      points: r.points,
      projected: r.projected,
      season: seasonFor(r.player),
    };
  };

  const starters = rows.filter((r) => r.started).map(toRow);
  const bench = rows.filter((r) => !r.started && r.slot !== "IR").map(toRow);
  const ir = rows.filter((r) => r.slot === "IR").map(toRow);
  const groups = [
    { title: "STARTERS", rows: starters },
    { title: "BENCH", rows: bench },
    { title: "INJURED RESERVE", rows: ir },
  ].filter((g) => g.rows.length);

  let final: TeamView["final"] = null;
  let changes: TeamView["changes"] = null;
  if (isFinal) {
    const adds = S.txns.filter((t) => t.mgr === mgr && t.type === "add");
    final = {
      trades: S.trades
        .filter((t) => t.sides.some((s) => s.mgr === mgr))
        .map((t) => {
          const me = t.sides.find((s) => s.mgr === mgr)!;
          return { players: me.gets.map((g) => g.player).join(", "), week: t.week, from: me.from.join(" & "), tradeId: t.id };
        }),
      adds: adds.length,
      faab: adds.reduce((a, t) => a + t.faab, 0),
    };
  } else {
    const curr = new Set(rows.map((r) => r.player));
    changes = {
      ins: w > weeks[0]
        ? rows.filter((r) => !prev.has(r.player)).map((r) => {
            const a = acquisition(S, mgr, r.player, w);
            return { player: r.player, label: a.kind === "draft" ? "Returned to roster" : a.label, tradeId: a.tradeId };
          })
        : [],
      outs: prevRows.filter((r) => !curr.has(r.player)).map((r) => ({ player: r.player, ...departure(S, mgr, r.player, w) })),
    };
  }

  const st = S.standings.get(mgr);
  return {
    year: S.year,
    mgr,
    team: rows[0]?.team ?? st?.team ?? mgr,
    standing: st ?? null,
    weeks,
    playoffStart: S.playoffStart,
    isFinal,
    week: w,
    game: isFinal ? null : S.games.get(`${mgr}|${w}`) ?? null,
    groups,
    final,
    changes,
  };
}

/** Default manager: Blake Kozloski if he played that season, else the champion, else the first listed. */
export function defaultManager(S: SeasonModel): string {
  if (S.managers.includes("Blake Kozloski")) return "Blake Kozloski";
  const champ = [...S.standings].find(([, s]) => s.final_rank === 1)?.[0];
  return champ && S.managers.includes(champ) ? champ : S.managers[0];
}
