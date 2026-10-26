import { spawn, type ChildProcess } from "node:child_process";
import { CURRENT_OWNERS } from "@/lib/legacy-data";
import { champions, matchups, resolveManagerName, standings } from "@/lib/stats-data";
import lineupsData from "@/data/weekly_lineups.json";
import transactionsData from "@/data/transactions.json";
import type { LineupRow, TransactionRow } from "@/lib/yahoo/parse";
import { getDraftPicks } from "@/lib/draft-data";

// Read-only SQL over league history for the ShoesGPT runSql tool.
//
// Queries run in a child Node process holding an in-memory node:sqlite DB.
// SQLite can't be interrupted from JS (worker.terminate() doesn't stop a
// native step), so a query that exceeds SQL_TIMEOUT_MS gets the process
// SIGKILLed and a fresh one is spawned on the next query.

export const MAX_SQL_ROWS = 100;
export const SQL_TIMEOUT_MS = 3000;

const HIDDEN = "--hidden--";
const HIDDEN_LABEL = "Hidden manager";

export interface GameRow {
  season: number;
  week: number;
  game_type: "regular" | "playoff";
  manager: string;
  team: string;
  points: number;
  opponent: string;
  opponent_team: string;
  opponent_points: number;
  result: "W" | "L" | "T";
  margin: number;
}

export interface LeagueTables {
  games: GameRow[];
  standings: {
    season: number;
    manager: string;
    team: string;
    final_rank: number;
    playoff_seed: number | null;
    wins: number;
    losses: number;
    ties: number;
    points_for: number;
    points_against: number;
  }[];
  champions: { season: number; champion: string; champion_team: string; runner_up: string; third_place: string }[];
  managers: { name: string; is_current: number; current_team: string | null }[];
  lineups: {
    season: number;
    week: number;
    manager: string;
    team: string;
    slot: string;
    started: number;
    player: string;
    points: number | null;
    projected: number | null;
  }[];
  transactions: {
    season: number;
    txn: number;
    date: string;
    type: string;
    manager: string;
    team: string;
    player: string;
    nfl_team: string;
    position: string;
    detail: string;
    faab: number | null;
  }[];
  draft: {
    season: number;
    round: number;
    pick: number;
    manager: string;
    team: string;
    player: string;
    position: string;
  }[];
}

function displayName(raw: string): string {
  return raw === HIDDEN ? HIDDEN_LABEL : resolveManagerName(raw);
}

// Plain rows with aliases resolved. Games are one row per team per game;
// rows for hidden (Yahoo-privacy) managers are dropped, and a hidden
// opponent shows as "Hidden manager".
export function buildLeagueTables(): LeagueTables {
  const games: GameRow[] = [];
  matchups.forEach((m) => {
    const sides = [
      [m.team1_manager, m.team1_name, m.team1_score, m.team2_manager, m.team2_name, m.team2_score],
      [m.team2_manager, m.team2_name, m.team2_score, m.team1_manager, m.team1_name, m.team1_score],
    ] as const;
    for (const [mgr, team, pts, opp, oppTeam, oppPts] of sides) {
      if (mgr === HIDDEN) continue;
      games.push({
        season: m.season_year,
        week: m.week,
        game_type: m.matchup_type === "playoff" ? "playoff" : "regular",
        manager: displayName(mgr),
        team,
        points: pts,
        opponent: displayName(opp),
        opponent_team: oppTeam,
        opponent_points: oppPts,
        result: m.is_tied ? "T" : m.winner === team ? "W" : "L",
        margin: Number((pts - oppPts).toFixed(2)),
      });
    }
  });

  // Scraped rows identify teams by Yahoo team number; standings maps that to manager and team name.
  const teams = new Map(
    standings.map((s) => [
      `${s.season_year}|${Number(s.team_key.split(".t.")[1])}`,
      { manager: displayName(s.manager_name), team: s.team_name },
    ]),
  );
  const teamOf = (season: number, teamId: number) =>
    teams.get(`${season}|${teamId}`) ?? { manager: HIDDEN_LABEL, team: `Team ${teamId}` };

  const names = new Set(games.map((g) => g.manager));
  return {
    lineups: (lineupsData as LineupRow[]).map((r) => ({
      season: r.season,
      week: r.week,
      ...teamOf(r.season, r.team_id),
      slot: r.slot,
      started: r.slot === "BN" || r.slot === "IR" ? 0 : 1,
      player: r.player,
      points: r.points,
      projected: r.projected,
    })),
    transactions: (transactionsData as TransactionRow[]).map((r) => ({
      season: r.season,
      txn: r.txn,
      date: r.date,
      type: r.type,
      ...teamOf(r.season, r.team_id),
      player: r.player,
      nfl_team: r.nfl_team,
      position: r.position,
      detail: r.detail,
      faab: r.faab,
    })),
    draft: getDraftPicks().map((p) => ({
      season: p.season,
      round: p.round,
      pick: p.pick,
      ...teamOf(p.season, Number(p.teamKey.split(".t.")[1])),
      player: p.player,
      position: p.position,
    })),
    games,
    standings: standings
      .filter((s) => s.manager_name !== HIDDEN)
      .map((s) => ({
        season: s.season_year,
        manager: displayName(s.manager_name),
        team: s.team_name,
        final_rank: s.final_rank,
        playoff_seed: s.playoff_seed ? Number(s.playoff_seed) : null,
        wins: s.wins,
        losses: s.losses,
        ties: s.ties,
        points_for: s.points_for,
        points_against: s.points_against,
      })),
    champions: champions.map((c) => ({
      season: c.season_year,
      champion: displayName(c.champion_manager),
      champion_team: c.champion_team_name,
      runner_up: displayName(c.runner_up_manager),
      third_place: displayName(c.third_place_manager),
    })),
    managers: Array.from(names)
      .sort()
      .map((name) => {
        const owner = CURRENT_OWNERS.find((o) => o.name === name);
        return { name, is_current: owner ? 1 : 0, current_team: owner?.team ?? null };
      }),
  };
}

// Shown to the model in the runSql tool description.
export const SQL_SCHEMA = `games: one row per team per game (both sides of every matchup)
  season INTEGER, week INTEGER, game_type TEXT ('regular'|'playoff'),
  manager TEXT, team TEXT, points REAL,
  opponent TEXT, opponent_team TEXT, opponent_points REAL,
  result TEXT ('W'|'L'|'T', from manager's side), margin REAL (points - opponent_points)
standings: final regular-season standings, one row per manager per season
  season, manager, team, final_rank INTEGER (1 = champion), playoff_seed INTEGER|NULL,
  wins, losses, ties, points_for REAL, points_against REAL
champions: one row per season
  season, champion, champion_team, runner_up, third_place
managers: everyone who has played
  name TEXT, is_current INTEGER (1 = current owner), current_team TEXT|NULL
lineups: every rostered player for every team-week (starters and bench)
  season, week, manager, team, slot TEXT (QB, RB, WR, TE, W/R, W/R/T, K, DEF, BN, IR, ...),
  started INTEGER (1 = in the starting lineup), player TEXT,
  points REAL|NULL (NULL = did not play), projected REAL|NULL
  Starters' points sum to the team's score in games. Bench points left on the table = SUM(points) WHERE started = 0.
transactions: every add, drop and trade, one row per player moved
  season, txn INTEGER (rows of one transaction share it within a season), date TEXT ('YYYY-MM-DD HH:MM'),
  type TEXT ('add'|'drop'|'trade'), manager, team (who received the player; for drops, who released him),
  player, nfl_team, position, detail TEXT ('Free Agent', '$12 Waiver', 'To Waivers', 'Traded to', ...),
  faab INTEGER|NULL (waiver bid in dollars)
draft: every draft pick, snake order (15 rounds in 2012, 16 after)
  season, round INTEGER, pick INTEGER (overall, 1 = first pick), manager, team, player,
  position TEXT ('' when unknown). A handful of picks are player = 'Unknown player...'.
  Join to lineups/transactions on (season, player) to see how a pick worked out.
Manager names are full display names (e.g. 'Ryan Kaplan'). Games against a hidden Yahoo manager have opponent = 'Hidden manager'.`;

// Runs inside the child process (CommonJS via `node -e`).
const CHILD_SOURCE = `
const { DatabaseSync, constants: C } = require("node:sqlite");
const MAX_ROWS = ${MAX_SQL_ROWS};
const SCHEMA = ${JSON.stringify(`
CREATE TABLE games (season INTEGER, week INTEGER, game_type TEXT, manager TEXT, team TEXT, points REAL,
  opponent TEXT, opponent_team TEXT, opponent_points REAL, result TEXT, margin REAL);
CREATE TABLE standings (season INTEGER, manager TEXT, team TEXT, final_rank INTEGER, playoff_seed INTEGER,
  wins INTEGER, losses INTEGER, ties INTEGER, points_for REAL, points_against REAL);
CREATE TABLE champions (season INTEGER, champion TEXT, champion_team TEXT, runner_up TEXT, third_place TEXT);
CREATE TABLE managers (name TEXT, is_current INTEGER, current_team TEXT);
CREATE TABLE lineups (season INTEGER, week INTEGER, manager TEXT, team TEXT, slot TEXT, started INTEGER,
  player TEXT, points REAL, projected REAL);
CREATE TABLE transactions (season INTEGER, txn INTEGER, date TEXT, type TEXT, manager TEXT, team TEXT,
  player TEXT, nfl_team TEXT, position TEXT, detail TEXT, faab INTEGER);
CREATE TABLE draft (season INTEGER, round INTEGER, pick INTEGER, manager TEXT, team TEXT, player TEXT,
  position TEXT);`)};
const ALLOWED = new Set([C.SQLITE_SELECT, C.SQLITE_READ, C.SQLITE_FUNCTION, C.SQLITE_RECURSIVE]);
let db;

function build(tables) {
  const d = new DatabaseSync(":memory:");
  d.exec(SCHEMA);
  for (const [name, rows] of Object.entries(tables)) {
    if (rows.length === 0) continue;
    const cols = Object.keys(rows[0]);
    const ins = d.prepare("INSERT INTO " + name + " (" + cols.join(",") + ") VALUES (" + cols.map(() => "?").join(",") + ")");
    for (const r of rows) ins.run(...cols.map((c) => r[c]));
  }
  d.exec("PRAGMA query_only = 1");
  d.limits.attach = 0;
  d.limits.length = 100000;
  d.limits.sqlLength = 10000;
  d.setAuthorizer((action) => (ALLOWED.has(action) ? C.SQLITE_OK : C.SQLITE_DENY));
  return d;
}

process.on("message", (msg) => {
  if (msg.type === "init") {
    db = build(msg.tables);
    return;
  }
  try {
    const rows = [];
    let truncated = false;
    for (const row of db.prepare(msg.sql).iterate()) {
      if (rows.length === MAX_ROWS) { truncated = true; break; }
      rows.push(row);
    }
    process.send({ id: msg.id, rows, truncated });
  } catch (e) {
    process.send({ id: msg.id, error: String(e && e.message) });
  }
});
`;

export type SqlResult = { rows: Record<string, unknown>[]; truncated: boolean } | { error: string };

// Queries share one process and run one at a time, so a slow query delays
// the rest by at most SQL_TIMEOUT_MS. Temp data spills to disk (memory stays
// small; hard_heap_limit isn't enforced by Node's SQLite build) and is freed
// when the query ends or the process is killed.
interface Pending {
  proc: ChildProcess;
  sql: string;
  retried: boolean;
  timer: NodeJS.Timeout;
  resolve: (r: SqlResult) => void;
}

let child: ChildProcess | null = null;
let nextId = 0;
const pending = new Map<number, Pending>();

function getChild(): ChildProcess {
  if (child) return child;
  const c = spawn(process.execPath, ["--no-warnings", "-e", CHILD_SOURCE], {
    stdio: ["ignore", "ignore", "inherit", "ipc"],
  });
  c.on("message", (m: { id: number } & SqlResult) => {
    const entry = pending.get(m.id);
    if (!entry || entry.proc !== c) return;
    pending.delete(m.id);
    clearTimeout(entry.timer);
    entry.resolve("error" in m ? { error: m.error } : { rows: m.rows, truncated: m.truncated });
  });
  c.on("exit", () => failOver(c));
  // Don't keep the parent alive just for an idle query process.
  c.unref();
  c.channel?.unref();
  c.send({ type: "init", tables: buildLeagueTables() });
  child = c;
  return c;
}

// Move queries off a dead process. Innocent queries that were queued behind
// a killed one get one retry on a fresh process; a second loss is reported.
function failOver(dead: ChildProcess) {
  if (child === dead) child = null;
  for (const [id, entry] of pending) {
    if (entry.proc !== dead) continue;
    pending.delete(id);
    clearTimeout(entry.timer);
    if (entry.retried) entry.resolve({ error: "Query process exited unexpectedly. Try again." });
    else dispatch(id, entry.sql, entry.resolve, true);
  }
}

function dispatch(id: number, sql: string, resolve: (r: SqlResult) => void, retried: boolean) {
  const c = getChild();
  const timer = setTimeout(() => {
    pending.delete(id);
    resolve({
      error: `Query took longer than ${SQL_TIMEOUT_MS / 1000}s and was stopped. Simplify it (avoid cross joins and unbounded recursion).`,
    });
    c.kill("SIGKILL");
    failOver(c);
  }, SQL_TIMEOUT_MS);
  pending.set(id, { proc: c, sql, retried, timer, resolve });
  c.send({ id, sql });
}

export function runSql(sql: string): Promise<SqlResult> {
  return new Promise((resolve) => dispatch(nextId++, sql, resolve, false));
}

// Test helper: stop the query process.
export function stopSqlProcess(): void {
  child?.kill("SIGKILL");
  child = null;
}
