/**
 * Builds data/transactions.json and data/weekly_lineups.json from the page fragments
 * scripts/yahoo-scrape.browser.js saved (via scripts/yahoo-receiver.mjs) in
 * ~/.cache/blakes-shoes-yahoo/html, then checks lineups against data/matchups.json.
 *
 * For a season in progress (listed in LIVE, with standings/draft fragments saved), it also
 * writes that season's entries in standings, matchups, league_info and draft_history,
 * replacing only that season and leaving 2012-2025 untouched.
 *
 *   npx vite-node scripts/yahoo-build.ts
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import draftHistoryData from "../data/draft_history.json";
import leagueInfoData from "../data/league_info.json";
import matchupsData from "../data/matchups.json";
import standingsData from "../data/standings.json";
import {
  parseDraftResults,
  parseMatchup,
  parseMatchupHeader,
  parseStandings,
  parseTransactions,
  type LineupRow,
  type MatchupSide,
  type TransactionRow,
} from "../lib/yahoo/parse";

/** Seasons pulled while in progress. Settings are from the league's Yahoo settings page. */
const LIVE: Record<number, { leagueId: string; game: number; endWeek: number; playoffStart: number; playoffTeams: number; tradeEnd: string }> = {
  2026: { leagueId: "65895", game: 470, endWeek: 17, playoffStart: 15, playoffTeams: 6, tradeEnd: "2026-11-14" },
};

const DIR = join(homedir(), ".cache/blakes-shoes-yahoo/html");
const files = readdirSync(DIR).filter((f) => f.endsWith(".html"));

const transactions: TransactionRow[] = [];
const lineups: LineupRow[] = [];
const seen = new Set<string>();

for (const f of files.sort()) {
  const html = readFileSync(join(DIR, f), "utf8");
  const tx = f.match(/^tx-(\d+)-(\d+)\.html$/);
  const mu = f.match(/^mu-(\d+)-w(\d+)-/);
  if (tx) {
    const season = Number(tx[1]);
    const offset = Number(tx[2]);
    for (const r of parseTransactions(html, season)) {
      // txn is per page; make it unique within the season
      const row = { ...r, txn: offset + r.txn };
      const key = `${row.season}|${row.date}|${row.type}|${row.team_id}|${row.player}`;
      if (seen.has(key)) continue;
      seen.add(key);
      transactions.push(row);
    }
  } else if (mu) {
    lineups.push(...parseMatchup(html, Number(mu[1]), Number(mu[2])));
  }
}

// Pages list newest first; store oldest first with txn renumbered from 1 per season.
transactions.sort((a, b) => a.season - b.season || a.date.localeCompare(b.date) || b.txn - a.txn);
let prev = "";
let n = 0;
for (const r of transactions) {
  const key = `${r.season}|${r.txn}`;
  if (r.season !== Number(prev.split("|")[0])) n = 0;
  if (key !== prev) n++;
  prev = key;
  r.txn = n;
}
lineups.sort((a, b) => a.season - b.season || a.week - b.week || a.team_id - b.team_id);

writeFileSync("data/transactions.json", JSON.stringify(transactions, null, 0));
writeFileSync("data/weekly_lineups.json", JSON.stringify(lineups, null, 0));

let standings = standingsData as (typeof standingsData)[number][];
let matchups = matchupsData as (typeof matchupsData)[number][];
let leagueInfo = leagueInfoData as (typeof leagueInfoData)[number][];
let draftHistory = draftHistoryData as (typeof draftHistoryData)[number][];

for (const [yearKey, cfg] of Object.entries(LIVE)) {
  const year = Number(yearKey);
  const stFile = join(DIR, `st-${year}.html`);
  if (!existsSync(stFile)) continue;
  const key = (team: number) => `${cfg.game}.l.${cfg.leagueId}.t.${team}`;

  // Matchups (one fragment per pairing) also tell us each team's Yahoo manager name.
  const manager = new Map<number, string>();
  const games: { week: number; left: MatchupSide; right: MatchupSide }[] = [];
  for (const f of files.filter((f) => f.startsWith(`mu-${year}-w`))) {
    const week = Number(f.match(/-w(\d+)-/)![1]);
    const { left, right } = parseMatchupHeader(readFileSync(join(DIR, f), "utf8"));
    manager.set(left.team_id, left.manager);
    if (right) {
      manager.set(right.team_id, right.manager);
      games.push({ week, left, right });
    }
  }
  games.sort((a, b) => a.week - b.week || a.left.team_id - b.left.team_id);

  const table = parseStandings(readFileSync(stFile, "utf8"));
  const idByTeam = new Map(table.map((t) => [t.team, t.team_id]));
  const streakType: Record<string, string> = { W: "win", L: "loss", T: "tie" };
  standings = [
    ...standings.filter((s) => s.season_year !== year),
    ...table.map((t) => ({
      season_year: year,
      team_id: String(t.team_id),
      team_key: key(t.team_id),
      team_name: t.team,
      manager_name: manager.get(t.team_id) ?? "--hidden--",
      // Mid-season this is the current standings rank, not a final playoff finish.
      final_rank: t.rank,
      playoff_seed: "",
      wins: t.wins,
      losses: t.losses,
      ties: t.ties,
      win_percentage: Math.round((t.wins / Math.max(1, t.wins + t.losses + t.ties)) * 1000) / 1000,
      points_for: t.points_for,
      points_against: t.points_against,
      streak_type: streakType[t.streak.split("-")[0]] ?? "",
      streak_value: t.streak.split("-")[1] ?? "",
    })),
  ];

  matchups = [
    ...matchups.filter((m) => m.season_year !== year),
    ...games.map(({ week, left, right }) => ({
      season_year: year,
      week,
      matchup_type: week >= cfg.playoffStart ? "playoff" : "regular",
      team1_name: left.team,
      team1_manager: left.manager,
      team1_score: left.score,
      team2_name: right.team,
      team2_manager: right.manager,
      team2_score: right.score,
      winner: left.score === right.score ? "" : left.score > right.score ? left.team : right.team,
      is_tied: left.score === right.score,
    })),
  ];

  const lastWeek = Math.max(0, ...games.map((g) => g.week));
  const prior = leagueInfo.find((l) => l.season_year === year - 1)!;
  leagueInfo = [
    ...leagueInfo.filter((l) => l.season_year !== year),
    {
      ...prior,
      season_year: year,
      league_id: cfg.leagueId,
      league_key: `${cfg.game}.l.${cfg.leagueId}`,
      current_week: String(Math.min(cfg.endWeek, lastWeek + 1)),
      end_week: String(cfg.endWeek),
      is_finished: false,
      draft_type: "offline",
      playoff_start_week: String(cfg.playoffStart),
      num_playoff_teams: String(cfg.playoffTeams),
      trade_end_date: cfg.tradeEnd,
    },
  ];

  const drFile = join(DIR, `dr-${year}.html`);
  if (existsSync(drFile)) {
    const picks = parseDraftResults(readFileSync(drFile, "utf8"));
    const perRound = Math.max(...picks.map((p) => p.pick_in_round));
    draftHistory = [
      ...draftHistory.filter((d) => d.season_year !== year),
      ...picks.map((p) => {
        const team = idByTeam.get(p.team);
        if (team == null) throw new Error(`Draft team "${p.team}" isn't in the ${year} standings`);
        return {
          season_year: year,
          pick_number: (p.round - 1) * perRound + p.pick_in_round,
          round: p.round,
          team_key: key(team),
          team_name: p.team,
          manager_name: manager.get(team) ?? "--hidden--",
          player_key: p.player_id ? `${cfg.game}.p.${p.player_id}` : "",
          // Older seasons only have keys; a live season's page gives names directly.
          player_name: p.player,
          player_position: p.position,
        };
      }),
    ];
  }
  console.log(`${year} (in progress): ${table.length} teams, ${games.length} games through week ${lastWeek}, ` +
    `${draftHistory.filter((d) => d.season_year === year).length} draft picks`);
}

const bySeason = <T extends { season_year: number }>(rows: T[]) => [...rows].sort((a, b) => a.season_year - b.season_year);
writeFileSync("data/standings.json", JSON.stringify(bySeason(standings), null, 2));
writeFileSync("data/matchups.json", JSON.stringify(bySeason(matchups), null, 2));
writeFileSync("data/league_info.json", JSON.stringify(bySeason(leagueInfo), null, 2));
writeFileSync("data/draft_history.json", JSON.stringify(bySeason(draftHistory), null, 2));

// Check: each team's starter points must equal its score in matchups.json.
const teamName = new Map(standings.map((s) => [`${s.season_year}|${Number(s.team_key.split(".t.")[1])}`, s.team_name]));
const scored = new Map<string, number>();
for (const r of lineups) {
  if (r.slot === "BN" || r.slot === "IR") continue;
  const k = `${r.season}|${r.week}|${teamName.get(`${r.season}|${r.team_id}`)}`;
  scored.set(k, (scored.get(k) ?? 0) + (r.points ?? 0));
}
let checked = 0;
const mismatches: string[] = [];
for (const m of matchups) {
  for (const [name, score] of [[m.team1_name, m.team1_score], [m.team2_name, m.team2_score]] as const) {
    // An abandoned team with every slot empty has no lineup rows and scores 0.
    const got = scored.get(`${m.season_year}|${m.week}|${name}`) ?? (Number(score) === 0 ? 0 : undefined);
    if (got === undefined) { mismatches.push(`missing ${m.season_year} w${m.week} ${name}`); continue; }
    checked++;
    if (Math.abs(got - Number(score)) > 0.011) mismatches.push(`${m.season_year} w${m.week} ${name}: lineup ${got.toFixed(2)} vs ${score}`);
  }
}

const seasons = (rows: { season: number }[]) =>
  Object.entries(rows.reduce<Record<number, number>>((acc, r) => ((acc[r.season] = (acc[r.season] ?? 0) + 1), acc), {}))
    .map(([s, c]) => `${s}:${c}`)
    .join(" ");
console.log(`transactions ${transactions.length} (${seasons(transactions)})`);
console.log(`lineup rows ${lineups.length} (${seasons(lineups)})`);
console.log(`score check: ${checked} team-weeks matched, ${mismatches.length} problems`);
mismatches.slice(0, 20).forEach((m) => console.log("  " + m));
