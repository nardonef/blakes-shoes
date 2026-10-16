import leagueInfoData from "@/data/league_info.json";
import { buildLeagueTables, type GameRow } from "@/lib/league-sql";
import { CURRENT_OWNERS, getManagerLegacies } from "@/lib/legacy-data";
import {
  champions,
  h2hRecords,
  matchups,
  resolveManagerName,
  getSeasons,
  getSeasonStandings as getRawSeasonStandings,
  getManagerStats,
  getTopPerformances,
  getLowestPerformances,
  getBlowouts,
  getClosestGames,
  getLuckIndex,
  getManagerConsistency,
  getPlayoffStats,
} from "@/lib/stats-data";

// Plain data-lookup functions backing the /shoesgpt chat tools. Every manager name
// returned here is the resolved display name (e.g. "Ryan Kaplan", not the raw
// Yahoo username "Ryan").

type ToolError = { error: string };

const HIDDEN = "--hidden--";
export const MAX_MATCHUP_ROWS = 50;

// Display names of everyone who ever managed a team, aliases merged.
export function allManagerNames(): string[] {
  const names = new Set<string>();
  matchups.forEach((m) => {
    names.add(resolveManagerName(m.team1_manager));
    names.add(resolveManagerName(m.team2_manager));
  });
  names.delete(HIDDEN);
  return Array.from(names).sort();
}

// Resolve free-text input ("Kaplan", "frankie nardone") to one display name.
// Exact (case-insensitive) match wins; otherwise a unique substring match.
export function findManager(input: string): string | ToolError {
  const q = input.trim().toLowerCase();
  const names = allManagerNames();
  const exact = names.find((n) => n.toLowerCase() === q);
  if (exact) return exact;
  const partial = names.filter((n) => n.toLowerCase().includes(q));
  if (partial.length === 1) return partial[0];
  return {
    error:
      partial.length > 1
        ? `"${input}" is ambiguous: ${partial.join(", ")}`
        : `No manager matches "${input}". Known managers: ${names.join(", ")}`,
  };
}

function isError(x: unknown): x is ToolError {
  return typeof x === "object" && x !== null && "error" in x;
}

function checkSeason(year: number): ToolError | null {
  const seasons = getSeasons();
  return seasons.includes(year)
    ? null
    : { error: `No data for ${year}. Seasons available: ${Math.min(...seasons)}-${Math.max(...seasons)}` };
}

export function listManagers() {
  return {
    currentOwners: CURRENT_OWNERS.map((o) => ({ name: o.name, currentTeam: o.team })),
    allManagersEver: allManagerNames(),
    note: "Some seasons include managers hidden by Yahoo privacy settings; they are excluded.",
  };
}

export function getChampions() {
  return [...champions]
    .sort((a, b) => a.season_year - b.season_year)
    .map((c) => ({
      year: c.season_year,
      champion: resolveManagerName(c.champion_manager),
      championTeam: c.champion_team_name,
      championRecord: `${c.champion_wins}-${c.champion_losses}`,
      runnerUp: resolveManagerName(c.runner_up_manager),
      thirdPlace: resolveManagerName(c.third_place_manager),
    }));
}

export function getSeasonStandings(year: number) {
  const err = checkSeason(year);
  if (err) return err;
  return getRawSeasonStandings(year).map((s) => ({
    rank: s.final_rank,
    manager: resolveManagerName(s.manager_name),
    team: s.team_name,
    record: `${s.wins}-${s.losses}${s.ties ? `-${s.ties}` : ""}`,
    pointsFor: s.points_for,
    pointsAgainst: s.points_against,
    playoffSeed: s.playoff_seed || null,
  }));
}

export function getCareerStats(manager?: string) {
  const legacies = new Map(getManagerLegacies().map((l) => [l.owner.name, l]));
  const rows = getManagerStats().map((m) => {
    const l = legacies.get(m.manager);
    return {
      manager: m.manager,
      seasonsPlayed: m.seasonsPlayed,
      wins: m.totalWins,
      losses: m.totalLosses,
      winPct: round(m.winPercentage, 3),
      pointsFor: round(m.totalPointsFor),
      avgPointsPerGame: round(m.avgPointsPerGame),
      championships: m.championships,
      ...(l && {
        championshipYears: l.championshipYears,
        runnerUpYears: l.runnerUpYears.map((r) => r.year),
        thirdPlaceFinishes: l.thirds,
        playoffRecord: `${l.playoffWins}-${l.playoffLosses}`,
        bestSeason: l.bestSeason,
        worstSeason: l.worstSeason,
        bestGame: l.bestGame,
        worstGame: l.worstGame,
      }),
    };
  });
  if (!manager) return rows;
  const name = findManager(manager);
  if (isError(name)) return name;
  return rows.filter((r) => r.manager === name);
}

// All-time head-to-head, with aliases merged. Omit managerB to get A's record
// against every opponent.
export function getHeadToHead(managerA: string, managerB?: string) {
  const a = findManager(managerA);
  if (isError(a)) return a;
  const b = managerB ? findManager(managerB) : undefined;
  if (isError(b)) return b;

  const byOpponent = new Map<string, { wins: number; losses: number; ties: number; games: number }>();
  h2hRecords.forEach((r) => {
    const m1 = resolveManagerName(r.manager1);
    const m2 = resolveManagerName(r.manager2);
    if (m1 === HIDDEN || m2 === HIDDEN || m1 === m2) return;
    if (m1 !== a && m2 !== a) return;
    const opp = m1 === a ? m2 : m1;
    if (b && opp !== b) return;
    const rec = byOpponent.get(opp) ?? { wins: 0, losses: 0, ties: 0, games: 0 };
    rec.wins += m1 === a ? r.manager1_wins : r.manager2_wins;
    rec.losses += m1 === a ? r.manager2_wins : r.manager1_wins;
    rec.ties += r.ties;
    rec.games += r.total_matchups;
    byOpponent.set(opp, rec);
  });
  return {
    manager: a,
    opponents: Array.from(byOpponent, ([opponent, r]) => ({ opponent, ...r })).sort(
      (x, y) => y.games - x.games
    ),
  };
}

export const RECORD_KINDS = [
  "highest_scores",
  "lowest_scores",
  "biggest_blowouts",
  "closest_games",
  "luck",
  "consistency",
  "playoff_performance",
  "winless_season_starts",
  "win_streaks",
  "losing_streaks",
] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];

export function getRecords(kind: RecordKind, limit = 10) {
  switch (kind) {
    case "highest_scores":
    case "lowest_scores":
      return (kind === "highest_scores" ? getTopPerformances : getLowestPerformances)(limit).map(
        (p) => ({ ...p, manager: resolveManagerName(p.manager) })
      );
    case "biggest_blowouts":
    case "closest_games":
      return (kind === "biggest_blowouts" ? getBlowouts : getClosestGames)(limit).map((g) => ({
        ...g,
        team1Manager: resolveManagerName(g.team1Manager),
        team2Manager: resolveManagerName(g.team2Manager),
      }));
    // The three leaderboards below are already keyed by resolved names.
    case "luck":
      return getLuckIndex().slice(0, limit);
    case "consistency":
      return getManagerConsistency().slice(0, limit);
    case "playoff_performance":
      return getPlayoffStats().slice(0, limit);
    case "winless_season_starts":
      return getWinlessStarts().slice(0, limit);
    case "win_streaks":
      return getStreaks("W").slice(0, limit);
    case "losing_streaks":
      return getStreaks("L").slice(0, limit);
  }
}

// Regular-season games per manager-season in week order.
function regularSeasonLogs(): { season: number; manager: string; games: GameRow[] }[] {
  const logs = new Map<string, { season: number; manager: string; games: GameRow[] }>();
  buildLeagueTables()
    .games.filter((g) => g.game_type === "regular")
    .forEach((g) => {
      const key = `${g.season}|${g.manager}`;
      const log = logs.get(key) ?? { season: g.season, manager: g.manager, games: [] };
      log.games.push(g);
      logs.set(key, log);
    });
  const all = Array.from(logs.values());
  all.forEach((l) => l.games.sort((a, b) => a.week - b.week));
  return all;
}

// Games without a win (losses and ties) from week 1 of a regular season.
function getWinlessStarts() {
  return regularSeasonLogs()
    .map(({ season, manager, games }) => {
      const firstWin = games.findIndex((g) => g.result === "W");
      const start = firstWin === -1 ? games : games.slice(0, firstWin);
      const ties = start.filter((g) => g.result === "T").length;
      return {
        manager,
        season,
        winlessGames: start.length,
        record: `0-${start.length - ties}${ties ? `-${ties}` : ""}`,
        firstWinWeek: firstWin === -1 ? null : games[firstWin].week,
      };
    })
    .filter((s) => s.winlessGames > 0)
    .sort((a, b) => b.winlessGames - a.winlessGames || a.season - b.season);
}

// Longest consecutive run of one result within a regular season (a tie breaks it).
function getStreaks(result: "W" | "L") {
  return regularSeasonLogs()
    .map(({ season, manager, games }) => {
      let best = { length: 0, fromWeek: 0, toWeek: 0 };
      let run = 0;
      let from = 0;
      for (const g of games) {
        if (g.result !== result) {
          run = 0;
          continue;
        }
        if (run === 0) from = g.week;
        run++;
        if (run > best.length) best = { length: run, fromWeek: from, toWeek: g.week };
      }
      return { manager, season, streak: best.length, fromWeek: best.fromWeek, toWeek: best.toWeek };
    })
    .filter((s) => s.streak > 0)
    .sort((a, b) => b.streak - a.streak || a.season - b.season);
}

export interface MatchupQuery {
  season?: number;
  week?: number;
  manager?: string;
  opponent?: string;
  type?: "regular" | "playoff";
  limit?: number;
}

export function queryMatchups(q: MatchupQuery) {
  if (q.season !== undefined) {
    const err = checkSeason(q.season);
    if (err) return err;
  }
  const manager = q.manager ? findManager(q.manager) : undefined;
  if (isError(manager)) return manager;
  const opponent = q.opponent ? findManager(q.opponent) : undefined;
  if (isError(opponent)) return opponent;

  const rows = matchups
    .filter((m) => q.season === undefined || m.season_year === q.season)
    .filter((m) => q.week === undefined || m.week === q.week)
    .filter((m) => !q.type || m.matchup_type === q.type)
    .map((m) => {
      const m1 = resolveManagerName(m.team1_manager);
      const m2 = resolveManagerName(m.team2_manager);
      // Put the queried manager on the left so "result" reads from their side.
      const flip = manager !== undefined && m2 === manager;
      const [home, away] = flip
        ? [{ mgr: m2, team: m.team2_name, score: m.team2_score }, { mgr: m1, team: m.team1_name, score: m.team1_score }]
        : [{ mgr: m1, team: m.team1_name, score: m.team1_score }, { mgr: m2, team: m.team2_name, score: m.team2_score }];
      return {
        season: m.season_year,
        week: m.week,
        type: m.matchup_type,
        manager: home.mgr,
        team: home.team,
        score: home.score,
        opponent: away.mgr,
        opponentTeam: away.team,
        opponentScore: away.score,
        result: m.is_tied ? "tie" : m.winner === home.team ? "win" : "loss",
      };
    })
    .filter((r) => !manager || r.manager === manager)
    .filter((r) => !opponent || r.opponent === opponent);

  const limit = Math.min(q.limit ?? MAX_MATCHUP_ROWS, MAX_MATCHUP_ROWS);
  return {
    totalMatches: rows.length,
    truncated: rows.length > limit,
    matchups: rows.slice(0, limit),
  };
}

export function getLeagueSettings(year: number) {
  const err = checkSeason(year);
  if (err) return err;
  const info = leagueInfoData.find((l) => l.season_year === year)!;
  return {
    year,
    numTeams: info.num_teams,
    regularSeasonWeeks: `${info.start_week}-${Number(info.playoff_start_week) - 1}`,
    playoffStartWeek: Number(info.playoff_start_week),
    endWeek: Number(info.end_week),
    numPlayoffTeams: Number(info.num_playoff_teams),
    tradeDeadline: info.trade_end_date,
    draftType: info.draft_type,
    waiverType: info.waiver_type,
  };
}

function round(n: number, digits = 2): number {
  return Number(n.toFixed(digits));
}
