// Server-only: each current manager's starters for the /games games, from the latest scraped week
// of 2026 lineups. Ratings are 0..1 percentiles of points per rostered week against the league's
// other starters at the same spot (WRs ranked across all 24).

import lineups from "@/data/weekly_lineups.json";
import standings from "@/data/standings.json";
import { personForAccount } from "@/lib/managers";

export interface RosterPlayer {
  name: string;
  /** Last name (or team name for a DEF), uppercase, for buttons and field labels. */
  short: string;
  ppg: number;
  rating: number;
}

export interface GameRoster {
  manager: string;
  color: string;
  qb: RosterPlayer;
  rb: RosterPlayer;
  wr1: RosterPlayer;
  wr2: RosterPlayer;
  te: RosterPlayer;
  k: RosterPlayer;
  def: RosterPlayer;
}

export interface GameRosters {
  week: number;
  teams: GameRoster[];
}

/** 12 distinct team colors, assigned in manager-name order. */
const COLORS = ["#c8102e", "#0b5cad", "#e8a317", "#2e7d32", "#6a1b9a", "#e65100", "#00838f", "#ad1457", "#4e342e", "#283593", "#9e9d24", "#37474f"];

const SUFFIX = /^(jr\.?|sr\.?|ii|iii|iv|v)$/i;

export function shortName(name: string): string {
  const parts = name.split(" ").filter((p) => !SUFFIX.test(p));
  return parts[parts.length - 1].toUpperCase();
}

type Row = { season: number | string; week: number | string; team_id: number | string; slot: string; player: string; points: number | null };

/** Percentile rank (1 = best) of each value among `values`; ties share the higher rank. */
function percentile(v: number, values: number[]): number {
  if (values.length < 2) return 0.5;
  const below = values.filter((x) => x < v).length;
  return below / (values.length - 1);
}

export function buildGameRosters(rows: Row[], managersByTeam: Map<string, string>, season: number): GameRosters {
  const seasonRows = rows.filter((r) => Number(r.season) === season);
  const week = Math.max(...seasonRows.map((r) => Number(r.week)));

  // Points per rostered (non-IR) week, by player, across every team that had him. Weeks with no
  // recorded points (null) don't count.
  const tally = new Map<string, { pts: number; n: number }>();
  for (const r of seasonRows) {
    if (r.slot === "IR" || r.points == null) continue;
    const t = tally.get(r.player) ?? { pts: 0, n: 0 };
    t.pts += Number(r.points);
    t.n += 1;
    tally.set(r.player, t);
  }
  const ppg = (p: string) => {
    const t = tally.get(p);
    return t ? Math.round((t.pts / t.n) * 10) / 10 : 0;
  };

  const latest = seasonRows.filter((r) => Number(r.week) === week);
  const raw = [...managersByTeam.entries()]
    .map(([teamId, manager]) => {
      const mine = latest.filter((r) => String(r.team_id) === teamId);
      const slot = (s: string) => mine.filter((r) => r.slot === s).map((r) => r.player).sort((a, b) => ppg(b) - ppg(a));
      const [wr1, wr2] = slot("WR");
      return { manager, qb: slot("QB")[0], rb: slot("RB")[0], wr1, wr2, te: slot("TE")[0], k: slot("K")[0], def: slot("DEF")[0] };
    })
    .sort((a, b) => a.manager.localeCompare(b.manager));

  const pool = (keys: ("qb" | "rb" | "wr1" | "wr2" | "te" | "k" | "def")[]) => raw.flatMap((t) => keys.map((k) => ppg(t[k])));
  const pools = { qb: pool(["qb"]), rb: pool(["rb"]), wr: pool(["wr1", "wr2"]), te: pool(["te"]), k: pool(["k"]), def: pool(["def"]) };
  const player = (name: string, against: number[]): RosterPlayer => ({
    name,
    short: shortName(name),
    ppg: ppg(name),
    rating: Math.round(percentile(ppg(name), against) * 100) / 100,
  });

  return {
    week,
    teams: raw.map((t, i) => ({
      manager: t.manager,
      color: COLORS[i % COLORS.length],
      qb: player(t.qb, pools.qb),
      rb: player(t.rb, pools.rb),
      wr1: player(t.wr1, pools.wr),
      wr2: player(t.wr2, pools.wr),
      te: player(t.te, pools.te),
      k: player(t.k, pools.k),
      def: player(t.def, pools.def),
    })),
  };
}

export function gameRosters(): GameRosters {
  const st = standings as { season_year: number | string; team_id: number | string; manager_name: string }[];
  const season = Math.max(...st.map((r) => Number(r.season_year)));
  const managersByTeam = new Map(
    st.filter((r) => Number(r.season_year) === season).map((r) => [String(r.team_id), personForAccount(r.manager_name)] as const),
  );
  return buildGameRosters(lineups as Row[], managersByTeam, season);
}
