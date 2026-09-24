import championsData from "@/data/champions.json";
import standingsData from "@/data/standings.json";
import h2hData from "@/data/h2h_records.json";
import matchupsData from "@/data/matchups.json";
import leagueInfoData from "@/data/league_info.json";

import type { Champion, Standing, H2HRecord, Matchup, LeagueInfo } from "@/types/stats";

const champions = championsData as Champion[];
const standings = standingsData as Standing[];
const h2hRecords = h2hData as H2HRecord[];
const matchups = matchupsData as Matchup[];
const leagueInfo = leagueInfoData as LeagueInfo[];

// Current league members and every manager-name alias they have used in the
// underlying Yahoo data since 2012 (usernames changed over the years).
export interface Owner {
  name: string;
  team: string;
  image: string;
  aliases: string[];
}

export const CURRENT_OWNERS: Owner[] = [
  { name: "Tyler Falcone", team: "Jone crib", image: "/owners/falcone.jpg", aliases: ["tyler"] },
  { name: "Blake Kozloski", team: "Wizards of Koz", image: "/owners/blake.jpg", aliases: ["Blake"] },
  { name: "Eric Rios", team: "The Hullabaloos", image: "/owners/rios.jpg", aliases: ["eric", "efuego93"] },
  { name: "Ryan Jenks", team: "Brianna's Red Carpet", image: "/owners/jenks.jpg", aliases: ["ryan"] },
  { name: "Frankie Nardone", team: "Peter is Corrupt", image: "/owners/frankie.jpg", aliases: ["Frankie Nardone"] },
  { name: "Matt Borba", team: "Not Popular Boys", image: "/owners/borba.jpg", aliases: ["matt"] },
  { name: "Jake Slagle", team: "POSTGRADAPARTMENTS.COM", image: "/owners/jake.jpg", aliases: ["jake"] },
  { name: "Bryan Yatsko", team: "Bryan Yatsko's Team", image: "/owners/yatsko.jpg", aliases: ["Bryan Yatsko"] },
  { name: "Ryan Curran", team: "Loose Cannons", image: "/owners/curran.jpg", aliases: ["Ryan Curran"] },
  { name: "Peter Klensch", team: "All Business Pete", image: "/owners/peter.jpg", aliases: ["Peter"] },
  { name: "Anthony Bove", team: "Anthony's Nifty Team", image: "/owners/anthony.jpg", aliases: ["AB"] },
  { name: "Ryan Kaplan", team: "Jew Crew", image: "/owners/kaplan.jpg", aliases: ["Ryan"] },
];

function ownerForAlias(alias: string): Owner | undefined {
  return CURRENT_OWNERS.find((o) => o.aliases.includes(alias));
}

// Resolve a raw manager alias to their current display name, or pass through
// unchanged for a manager who has since left the league.
function resolveName(alias: string): string {
  return ownerForAlias(alias)?.name ?? alias;
}

// URL-safe anchor slug for a manager's display name, e.g. "Jake Slagle" -> "mgr-jake-slagle".
export function slug(name: string): string {
  return "mgr-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export interface SeasonLine {
  year: number;
  team: string;
  wins: number;
  losses: number;
  ties: number;
  finalRank: number;
  pointsFor: number;
  playoffSeed: string;
}

export interface GameResult {
  season: number;
  week: number;
  team: string;
  score: number;
  opponent: string;
  opponentScore: number;
  matchupType: "regular" | "playoff";
  margin: number;
  won: boolean;
}

export interface RivalRecord {
  opponentName: string;
  wins: number;
  losses: number;
  ties: number;
  games: number;
  winPct: number;
}

export interface ManagerLegacy {
  owner: Owner;
  seasonsPlayed: number;
  firstSeason: number;
  lastSeason: number;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  pointsFor: number;
  avgPointsPerGame: number;
  championships: number;
  championshipYears: number[];
  runnerUps: number;
  runnerUpYears: { year: number; lostTo: string }[];
  thirds: number;
  seasons: SeasonLine[];
  bestSeason: SeasonLine | null;
  worstSeason: SeasonLine | null;
  bestGame: GameResult | null;
  worstGame: GameResult | null;
  biggestWin: GameResult | null;
  biggestLoss: GameResult | null;
  regularWins: number;
  regularLosses: number;
  regularPPG: number;
  playoffWins: number;
  playoffLosses: number;
  playoffPPG: number;
  playoffGames: number;
  clutchRating: number;
  luck: number;
  expectedWins: number;
  consistency: number;
  bestRival: RivalRecord | null;
  worstRival: RivalRecord | null;
  allPlayWins: number;
  allPlayLosses: number;
  allPlayTies: number;
  allPlayWinPct: number;
  longestWinStreak: StreakInfo | null;
  longestLossStreak: StreakInfo | null;
  closeGames: MarginRecord;
  blowoutGames: MarginRecord;
  weeksAsTopScorer: number;
  weeksAsBottomScorer: number;
  pointDifferential: number;
  lastPlaceSeasons: number[];
  missedPlayoffSeasons: number[];
}

export interface StreakInfo {
  length: number;
  startYear: number;
  startWeek: number;
  endYear: number;
  endWeek: number;
}

export interface MarginRecord {
  wins: number;
  losses: number;
}

interface AllPlayTally {
  wins: number;
  losses: number;
  ties: number;
  games: number;
}

interface WeeklyExtremeTally {
  top: number;
  bottom: number;
}

type WeeklyScoreEntry = { manager: string; score: number };

// Every regular-season (season, week) mapped to every manager's raw alias and
// score that week — the shared basis for both the all-play record and the
// top/bottom-scorer-of-the-week counts below.
function buildWeeklyScores(): Map<string, WeeklyScoreEntry[]> {
  const byWeek = new Map<string, WeeklyScoreEntry[]>();
  matchups.forEach((m: Matchup) => {
    if (m.matchup_type !== "regular") return;
    const key = `${m.season_year}-${m.week}`;
    const entries = byWeek.get(key) ?? [];
    if (m.team1_score > 0) entries.push({ manager: m.team1_manager, score: m.team1_score });
    if (m.team2_score > 0) entries.push({ manager: m.team2_manager, score: m.team2_score });
    byWeek.set(key, entries);
  });
  return byWeek;
}

// True all-play record: for every regular-season week, compare each manager's
// score against every other manager who played that week (not just their
// actual opponent). Keyed by raw manager alias, same as the rest of the
// matchup data, so callers merge across an owner's aliases themselves.
function computeAllPlayTallies(byWeek: Map<string, WeeklyScoreEntry[]>): Map<string, AllPlayTally> {
  const tallies = new Map<string, AllPlayTally>();
  byWeek.forEach((entries) => {
    entries.forEach((entry, i) => {
      let wins = 0;
      let losses = 0;
      let ties = 0;
      entries.forEach((other, j) => {
        if (i === j) return;
        if (entry.score > other.score) wins += 1;
        else if (entry.score < other.score) losses += 1;
        else ties += 1;
      });
      const existing = tallies.get(entry.manager) ?? { wins: 0, losses: 0, ties: 0, games: 0 };
      existing.wins += wins;
      existing.losses += losses;
      existing.ties += ties;
      existing.games += wins + losses + ties;
      tallies.set(entry.manager, existing);
    });
  });
  return tallies;
}

// How often each manager posted the single highest (or lowest) score of a
// given regular-season week, league-wide.
function computeWeeklyExtremes(byWeek: Map<string, WeeklyScoreEntry[]>): Map<string, WeeklyExtremeTally> {
  const tallies = new Map<string, WeeklyExtremeTally>();
  byWeek.forEach((entries) => {
    if (entries.length < 2) return;
    const maxScore = Math.max(...entries.map((e) => e.score));
    const minScore = Math.min(...entries.map((e) => e.score));
    entries.forEach((e) => {
      const existing = tallies.get(e.manager) ?? { top: 0, bottom: 0 };
      if (e.score === maxScore) existing.top += 1;
      if (e.score === minScore) existing.bottom += 1;
      tallies.set(e.manager, existing);
    });
  });
  return tallies;
}

// Longest winning and losing streaks across a manager's full chronological
// game log (regular season + playoffs).
function computeStreaks(gamesChronological: GameResult[]): {
  win: StreakInfo | null;
  loss: StreakInfo | null;
} {
  let bestWin: StreakInfo | null = null;
  let bestLoss: StreakInfo | null = null;
  let curWinLen = 0;
  let curLossLen = 0;
  let curWinStart: GameResult | null = null;
  let curLossStart: GameResult | null = null;

  for (const g of gamesChronological) {
    if (g.won) {
      if (curWinLen === 0) curWinStart = g;
      curWinLen += 1;
      curLossLen = 0;
      if (!bestWin || curWinLen > bestWin.length) {
        bestWin = {
          length: curWinLen,
          startYear: curWinStart!.season,
          startWeek: curWinStart!.week,
          endYear: g.season,
          endWeek: g.week,
        };
      }
    } else {
      if (curLossLen === 0) curLossStart = g;
      curLossLen += 1;
      curWinLen = 0;
      if (!bestLoss || curLossLen > bestLoss.length) {
        bestLoss = {
          length: curLossLen,
          startYear: curLossStart!.season,
          startWeek: curLossStart!.week,
          endYear: g.season,
          endWeek: g.week,
        };
      }
    }
  }
  return { win: bestWin, loss: bestLoss };
}

export function getManagerLegacies(): ManagerLegacy[] {
  const byWeek = buildWeeklyScores();
  const allPlayTallies = computeAllPlayTallies(byWeek);
  const weeklyExtremes = computeWeeklyExtremes(byWeek);

  return CURRENT_OWNERS.map((owner) => {
    const isOwner = (name: string) => owner.aliases.includes(name);

    // Season-by-season lines from standings.json
    const seasons: SeasonLine[] = standings
      .filter((s: Standing) => isOwner(s.manager_name))
      .map((s) => ({
        year: s.season_year,
        team: s.team_name,
        wins: s.wins,
        losses: s.losses,
        ties: s.ties,
        finalRank: s.final_rank,
        pointsFor: s.points_for,
        playoffSeed: s.playoff_seed,
      }))
      .sort((a, b) => a.year - b.year);

    const wins = seasons.reduce((a, s) => a + s.wins, 0);
    const losses = seasons.reduce((a, s) => a + s.losses, 0);
    const ties = seasons.reduce((a, s) => a + s.ties, 0);
    const pointsFor = seasons.reduce((a, s) => a + s.pointsFor, 0);
    const games = wins + losses + ties;

    const bestSeason =
      seasons.length > 0
        ? seasons.reduce((a, b) => (b.finalRank < a.finalRank ? b : a))
        : null;
    const worstSeason =
      seasons.length > 0
        ? seasons.reduce((a, b) => (b.finalRank > a.finalRank ? b : a))
        : null;

    // Championship history
    const champYears = champions
      .filter((c: Champion) => isOwner(c.champion_manager))
      .map((c) => c.season_year);
    const runnerUpYears = champions
      .filter((c) => isOwner(c.runner_up_manager))
      .map((c) => ({
        year: c.season_year,
        lostTo: ownerForAlias(c.champion_manager)?.name ?? c.champion_manager,
      }));
    const thirds = champions.filter((c) => isOwner(c.third_place_manager)).length;

    // Game log across all matchups (regular + playoff)
    const games_: GameResult[] = [];
    matchups.forEach((m: Matchup) => {
      if (isOwner(m.team1_manager) && m.team1_score > 0) {
        games_.push({
          season: m.season_year,
          week: m.week,
          team: m.team1_name,
          score: m.team1_score,
          opponent: m.team2_name,
          opponentScore: m.team2_score,
          matchupType: m.matchup_type === "playoff" ? "playoff" : "regular",
          margin: m.team1_score - m.team2_score,
          won: m.winner === m.team1_name,
        });
      }
      if (isOwner(m.team2_manager) && m.team2_score > 0) {
        games_.push({
          season: m.season_year,
          week: m.week,
          team: m.team2_name,
          score: m.team2_score,
          opponent: m.team1_name,
          opponentScore: m.team1_score,
          matchupType: m.matchup_type === "playoff" ? "playoff" : "regular",
          margin: m.team2_score - m.team1_score,
          won: m.winner === m.team2_name,
        });
      }
    });

    const bestGame =
      games_.length > 0
        ? games_.reduce((a, b) => (b.score > a.score ? b : a))
        : null;
    const worstGame =
      games_.length > 0
        ? games_.reduce((a, b) => (b.score < a.score ? b : a))
        : null;
    const wonGames = games_.filter((g) => g.won);
    const lostGames = games_.filter((g) => !g.won && g.margin !== 0);
    const biggestWin =
      wonGames.length > 0
        ? wonGames.reduce((a, b) => (b.margin > a.margin ? b : a))
        : null;
    const biggestLoss =
      lostGames.length > 0
        ? lostGames.reduce((a, b) => b.margin < a.margin ? b : a)
        : null;

    // Regular season vs playoff splits ("clutch rating")
    const regularGames = games_.filter((g) => g.matchupType === "regular");
    const playoffGamesList = games_.filter((g) => g.matchupType === "playoff");
    const regularWins = regularGames.filter((g) => g.won).length;
    const regularLosses = regularGames.filter((g) => !g.won).length;
    const regularPPG =
      regularGames.length > 0
        ? regularGames.reduce((a, g) => a + g.score, 0) / regularGames.length
        : 0;
    const playoffWins = playoffGamesList.filter((g) => g.won).length;
    const playoffLosses = playoffGamesList.filter((g) => !g.won).length;
    const playoffPPG =
      playoffGamesList.length > 0
        ? playoffGamesList.reduce((a, g) => a + g.score, 0) / playoffGamesList.length
        : 0;
    const clutchRating = playoffGamesList.length > 0 ? playoffPPG - regularPPG : 0;

    // Streaks, close/blowout record — all games, chronological order.
    const chronoGames = [...games_].sort((a, b) => a.season - b.season || a.week - b.week);
    const streaks = computeStreaks(chronoGames);
    const closeGames = games_.reduce<MarginRecord>(
      (acc, g) => {
        if (Math.abs(g.margin) <= 3) {
          if (g.won) acc.wins++;
          else acc.losses++;
        }
        return acc;
      },
      { wins: 0, losses: 0 }
    );
    const blowoutGames = games_.reduce<MarginRecord>(
      (acc, g) => {
        if (Math.abs(g.margin) >= 25) {
          if (g.won) acc.wins++;
          else acc.losses++;
        }
        return acc;
      },
      { wins: 0, losses: 0 }
    );

    // Weeks as the league's single highest/lowest scorer that week.
    const weeklyExtremeTotals = owner.aliases.reduce(
      (acc, alias) => {
        const t = weeklyExtremes.get(alias);
        if (t) {
          acc.top += t.top;
          acc.bottom += t.bottom;
        }
        return acc;
      },
      { top: 0, bottom: 0 }
    );

    // Career point differential (points for minus points against).
    const pointsAgainst = standings
      .filter((s: Standing) => isOwner(s.manager_name))
      .reduce((a, s) => a + s.points_against, 0);

    // Seasons finished dead last, and seasons played but missed the playoffs.
    const lastPlaceSeasons = seasons
      .filter((s) => {
        const info = leagueInfo.find((l) => l.season_year === s.year);
        return info ? s.finalRank === info.num_teams : false;
      })
      .map((s) => s.year);
    const playoffSeasonsSet = new Set(playoffGamesList.map((g) => g.season));
    const missedPlayoffSeasons = seasons
      .filter((s) => !playoffSeasonsSet.has(s.year))
      .map((s) => s.year);

    // All-play record: this manager's score each regular-season week vs.
    // every other manager who played that week, summed across their aliases.
    const allPlay = owner.aliases.reduce<AllPlayTally>(
      (acc, alias) => {
        const t = allPlayTallies.get(alias);
        if (t) {
          acc.wins += t.wins;
          acc.losses += t.losses;
          acc.ties += t.ties;
          acc.games += t.games;
        }
        return acc;
      },
      { wins: 0, losses: 0, ties: 0, games: 0 }
    );
    const allPlayWinPct = allPlay.games > 0 ? (allPlay.wins + allPlay.ties * 0.5) / allPlay.games : 0;

    // Luck index: actual regular-season wins vs. the wins the all-play rate predicts
    const expectedWins = regularGames.length > 0 ? allPlayWinPct * regularGames.length : 0;
    const luck = regularGames.length > 0 ? regularWins - expectedWins : 0;

    // Consistency: standard deviation of weekly scores
    const allScores = games_.map((g) => g.score);
    const avgScore =
      allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
    const consistency =
      allScores.length > 0
        ? Math.sqrt(
            allScores.reduce((acc, s) => acc + Math.pow(s - avgScore, 2), 0) / allScores.length
          )
        : 0;

    // Head-to-head vs. other current owners only
    const rivalMap = new Map<string, RivalRecord>();
    h2hRecords.forEach((r: H2HRecord) => {
      const m1IsOwner = isOwner(r.manager1);
      const m2IsOwner = isOwner(r.manager2);
      if (m1IsOwner === m2IsOwner) return; // skip self-pairs and non-matches

      const opponentAlias = m1IsOwner ? r.manager2 : r.manager1;
      const opponentOwner = ownerForAlias(opponentAlias);
      if (!opponentOwner || opponentOwner.name === owner.name) return;

      const myWins = m1IsOwner ? r.manager1_wins : r.manager2_wins;
      const theirWins = m1IsOwner ? r.manager2_wins : r.manager1_wins;

      const existing = rivalMap.get(opponentOwner.name);
      if (existing) {
        existing.wins += myWins;
        existing.losses += theirWins;
        existing.ties += r.ties;
        existing.games += r.total_matchups;
      } else {
        rivalMap.set(opponentOwner.name, {
          opponentName: opponentOwner.name,
          wins: myWins,
          losses: theirWins,
          ties: r.ties,
          games: r.total_matchups,
          winPct: 0,
        });
      }
    });
    const rivals = Array.from(rivalMap.values())
      .map((r) => ({ ...r, winPct: r.games > 0 ? r.wins / r.games : 0 }))
      .filter((r) => r.games >= 5);
    const bestRival =
      rivals.length > 0 ? rivals.reduce((a, b) => (b.winPct > a.winPct ? b : a)) : null;
    const worstRival =
      rivals.length > 0 ? rivals.reduce((a, b) => (b.winPct < a.winPct ? b : a)) : null;

    return {
      owner,
      seasonsPlayed: seasons.length,
      firstSeason: seasons[0]?.year ?? 0,
      lastSeason: seasons[seasons.length - 1]?.year ?? 0,
      wins,
      losses,
      ties,
      winPct: games > 0 ? wins / games : 0,
      pointsFor,
      avgPointsPerGame: games > 0 ? pointsFor / games : 0,
      championships: champYears.length,
      championshipYears: champYears.sort((a, b) => a - b),
      runnerUps: runnerUpYears.length,
      runnerUpYears,
      thirds,
      seasons,
      bestSeason,
      worstSeason,
      bestGame,
      worstGame,
      biggestWin,
      biggestLoss,
      regularWins,
      regularLosses,
      regularPPG,
      playoffWins,
      playoffLosses,
      playoffPPG,
      playoffGames: playoffGamesList.length,
      clutchRating,
      luck,
      expectedWins,
      consistency,
      bestRival,
      worstRival,
      allPlayWins: allPlay.wins,
      allPlayLosses: allPlay.losses,
      allPlayTies: allPlay.ties,
      allPlayWinPct,
      longestWinStreak: streaks.win,
      longestLossStreak: streaks.loss,
      closeGames,
      blowoutGames,
      weeksAsTopScorer: weeklyExtremeTotals.top,
      weeksAsBottomScorer: weeklyExtremeTotals.bottom,
      pointDifferential: pointsFor - pointsAgainst,
      lastPlaceSeasons,
      missedPlayoffSeasons,
    };
  });
}

export interface Banner {
  year: number;
  numTeams: number | null;
  numPlayoffTeams: number | null;
  champion: { name: string; team: string; wins: number; losses: number };
  runnerUp: { name: string; team: string };
  thirdPlace: { name: string; team: string };
  topScorer: { name: string; team: string; points: number } | null;
}

// One row per season: champion, runner-up, third place and the season's
// highest regular-season scorer, newest season first.
export function getBanners(): Banner[] {
  return [...champions]
    .sort((a, b) => b.season_year - a.season_year)
    .map((c) => {
      const info = leagueInfo.find((l) => l.season_year === c.season_year);
      const seasonStandings = standings.filter((s) => s.season_year === c.season_year);
      const topScorerRow =
        seasonStandings.length > 0
          ? seasonStandings.reduce((a, b) => (b.points_for > a.points_for ? b : a))
          : null;

      return {
        year: c.season_year,
        numTeams: info?.num_teams ?? null,
        numPlayoffTeams: info ? parseInt(info.num_playoff_teams, 10) : null,
        champion: {
          name: resolveName(c.champion_manager),
          team: c.champion_team_name,
          wins: c.champion_wins,
          losses: c.champion_losses,
        },
        runnerUp: { name: resolveName(c.runner_up_manager), team: c.runner_up_team_name },
        thirdPlace: { name: resolveName(c.third_place_manager), team: c.third_place_team_name },
        topScorer: topScorerRow
          ? {
              name: resolveName(topScorerRow.manager_name),
              team: topScorerRow.team_name,
              points: topScorerRow.points_for,
            }
          : null,
      };
    });
}

export interface HeadToHeadCell {
  wins: number;
  losses: number;
  ties: number;
  games: number;
}

// Full current-owner x current-owner grid of career head-to-head records.
// matrix[i][j] reads as owners[i]'s record against owners[j]; the diagonal is null.
export function getHeadToHeadMatrix(): { owners: Owner[]; matrix: (HeadToHeadCell | null)[][] } {
  const owners = CURRENT_OWNERS;
  const cellFor = (a: Owner, b: Owner): HeadToHeadCell | null => {
    if (a.name === b.name) return null;
    const cell: HeadToHeadCell = { wins: 0, losses: 0, ties: 0, games: 0 };
    h2hRecords.forEach((r: H2HRecord) => {
      const m1IsA = a.aliases.includes(r.manager1);
      const m2IsA = a.aliases.includes(r.manager2);
      const m1IsB = b.aliases.includes(r.manager1);
      const m2IsB = b.aliases.includes(r.manager2);
      if (m1IsA && m2IsB) {
        cell.wins += r.manager1_wins;
        cell.losses += r.manager2_wins;
        cell.ties += r.ties;
        cell.games += r.total_matchups;
      } else if (m2IsA && m1IsB) {
        cell.wins += r.manager2_wins;
        cell.losses += r.manager1_wins;
        cell.ties += r.ties;
        cell.games += r.total_matchups;
      }
    });
    return cell.games > 0 ? cell : { wins: 0, losses: 0, ties: 0, games: 0 };
  };

  const matrix = owners.map((a) => owners.map((b) => cellFor(a, b)));
  return { owners, matrix };
}

export interface LeagueTopLineStats {
  seasonsRun: number;
  differentChampions: number;
  titlesByTopScorer: number;
  totalChampionships: number;
}

export function getLeagueTopLineStats(): LeagueTopLineStats {
  const seasonsRun = new Set(standings.map((s) => s.season_year)).size;
  const differentChampions = new Set(champions.map((c) => resolveName(c.champion_manager))).size;

  const titlesByTopScorer = champions.filter((c) => {
    const seasonStandings = standings.filter((s) => s.season_year === c.season_year);
    if (seasonStandings.length === 0) return false;
    const topScorerRow = seasonStandings.reduce((a, b) => (b.points_for > a.points_for ? b : a));
    return topScorerRow.manager_name === c.champion_manager;
  }).length;

  return {
    seasonsRun,
    differentChampions,
    titlesByTopScorer,
    totalChampionships: champions.length,
  };
}
