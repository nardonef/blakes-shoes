import championsData from "@/data/champions.json";
import standingsData from "@/data/standings.json";
import h2hData from "@/data/h2h_records.json";
import matchupsData from "@/data/matchups.json";

import type { Champion, Standing, H2HRecord, Matchup } from "@/types/stats";

const champions = championsData as Champion[];
const standings = standingsData as Standing[];
const h2hRecords = h2hData as H2HRecord[];
const matchups = matchupsData as Matchup[];

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
}

export function getManagerLegacies(): ManagerLegacy[] {
  // League-wide average points per regular-season game, used as the
  // baseline for the luck index (same method as the site-wide stats page).
  let leagueTotalPoints = 0;
  let leagueTotalGames = 0;
  matchups.forEach((m) => {
    if (m.matchup_type !== "regular") return;
    if (m.team1_score > 0) {
      leagueTotalPoints += m.team1_score;
      leagueTotalGames += 1;
    }
    if (m.team2_score > 0) {
      leagueTotalPoints += m.team2_score;
      leagueTotalGames += 1;
    }
  });
  const leagueAvgPPG = leagueTotalPoints / leagueTotalGames;

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

    // Luck index: actual regular-season wins vs. expected wins given scoring
    const expectedWinRate = regularPPG / (2 * leagueAvgPPG);
    const expectedWins = regularGames.length > 0 ? expectedWinRate * regularGames.length : 0;
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
    };
  });
}
