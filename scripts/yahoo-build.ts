/**
 * Builds data/transactions.json and data/weekly_lineups.json from the page fragments
 * scripts/yahoo-scrape.browser.js saved (via scripts/yahoo-receiver.mjs) in
 * ~/.cache/blakes-shoes-yahoo/html, then checks lineups against data/matchups.json.
 *
 *   npx vite-node scripts/yahoo-build.ts
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import matchups from "../data/matchups.json";
import standings from "../data/standings.json";
import { parseMatchup, parseTransactions, type LineupRow, type TransactionRow } from "../lib/yahoo/parse";

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
    const got = scored.get(`${m.season_year}|${m.week}|${name}`);
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
