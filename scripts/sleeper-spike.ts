/**
 * Ingestion spike: run the Sleeper pipeline against real leagues and report what it costs
 * and where the data has gaps. Output JSON uses the blakes-shoes types in types/stats.ts.
 *
 *   npx esbuild scripts/sleeper-spike.ts --bundle --platform=node --format=esm --outfile=$OUT/spike.mjs
 *   node $OUT/spike.mjs --out $OUT --league <id> [--league <id> ...]
 *   node $OUT/spike.mjs --out $OUT --user <username|user_id> [--max-leagues 3]
 *   node $OUT/spike.mjs --members-of <league_id>      # list the leagues of a league's members
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createSleeperClient } from "../lib/sleeper/client";
import { fetchHistory, findUserLeagues } from "../lib/sleeper/ingest";
import { buildHistory } from "../lib/sleeper/transform";
import type { SleeperLeague, SleeperUser } from "../lib/sleeper/types";

function arg(name: string): string[] {
  const out: string[] = [];
  process.argv.forEach((a, i) => a === `--${name}` && out.push(process.argv[i + 1]));
  return out;
}

async function currentSeason(api: ReturnType<typeof createSleeperClient>): Promise<number> {
  const state = await api.get<{ league_season: string }>("/state/nfl");
  return Number(state?.league_season);
}

async function runLeague(leagueId: string, outDir: string | undefined) {
  const api = createSleeperClient();
  const started = Date.now();
  const { chain, seasons } = await fetchHistory(api, leagueId);
  const elapsedMs = Date.now() - started;
  const history = buildHistory(seasons);

  const perSeason = seasons.map((s) => {
    const year = Number(s.league.season);
    const standings = history.standings.filter((x) => x.season_year === year);
    const matchups = history.matchups.filter((x) => x.season_year === year);
    const ranks = new Set(standings.map((x) => x.final_rank));
    const count = (t: string) => matchups.filter((m) => m.matchup_type === t).length;
    return {
      season: year,
      status: s.league.status,
      teams: s.rosters.length,
      orphanRosters: s.rosters.filter((r) => !r.owner_id).length,
      champion: history.champions.find((c) => c.season_year === year)?.champion_manager ?? null,
      bracketGames: s.winnersBracket.length,
      distinctRanks: ranks.size === standings.length,
      regular: count("regular"),
      playoff: count("playoff"),
      consolation: count("consolation"),
    };
  });

  const complete = perSeason.filter((s) => s.status === "complete");
  const report = {
    leagueId,
    name: chain.leagues[0]?.name,
    seasons: seasons.length,
    span: seasons.length ? `${seasons[0].league.season}-${seasons[seasons.length - 1].league.season}` : null,
    chainEnd: chain.stoppedBecause,
    apiCalls: api.callCount(),
    elapsedSeconds: Number((elapsedMs / 1000).toFixed(1)),
    completeSeasonsMissingChampion: complete.filter((s) => !s.champion).map((s) => s.season),
    seasonsWithDuplicateRanks: perSeason.filter((s) => !s.distinctRanks).map((s) => s.season),
    seasonsWithOrphanRosters: perSeason.filter((s) => s.orphanRosters).map((s) => s.season),
    teamCounts: [...new Set(perSeason.map((s) => s.teams))],
    renamedUsers: history.renamedUsers,
    perSeason,
  };

  if (outDir) {
    const dir = join(outDir, leagueId);
    mkdirSync(dir, { recursive: true });
    const write = (name: string, data: unknown) => writeFileSync(join(dir, `${name}.json`), JSON.stringify(data, null, 1));
    write("champions", history.champions);
    write("standings", history.standings);
    write("matchups", history.matchups);
    write("h2h_records", history.h2h);
    write("report", report);
  }
  return report;
}

async function main() {
  const outDir = arg("out")[0];
  const api = createSleeperClient();
  const leagueIds = [...arg("league")];

  for (const username of arg("user")) {
    const season = await currentSeason(api);
    const leagues = await findUserLeagues(api, username, season);
    if (!leagues) {
      console.log(`user ${username}: not found`);
      continue;
    }
    const max = Number(arg("max-leagues")[0] ?? 3);
    console.log(`user ${username}: ${leagues.length} leagues in ${season}, using first ${max}`);
    leagueIds.push(...leagues.slice(0, max).map((l) => l.league_id));
  }

  for (const id of arg("members-of")) {
    const season = await currentSeason(api);
    const league = await api.get<SleeperLeague>(`/league/${id}`);
    const users = (await api.get<SleeperUser[]>(`/league/${id}/users`)) ?? [];
    console.log(`members of ${league?.name}: ${users.length}`);
    for (const u of users) {
      const leagues = (await api.get<SleeperLeague[]>(`/user/${u.user_id}/leagues/nfl/${season}`)) ?? [];
      console.log(`  ${u.user_id}: ${leagues.map((l) => `${l.league_id}(${l.name},${l.total_rosters}t,prev=${l.previous_league_id ? "y" : "n"})`).join(" ")}`);
    }
  }

  for (const id of leagueIds) {
    const { perSeason, ...summary } = await runLeague(id, outDir);
    console.log(JSON.stringify(summary, null, 1));
    console.table(perSeason);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
