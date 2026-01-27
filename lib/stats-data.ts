import championsData from "@/data/champions.json";
import standingsData from "@/data/standings.json";
import h2hData from "@/data/h2h_records.json";
import matchupsData from "@/data/matchups.json";

import type {
  Champion,
  Standing,
  H2HRecord,
  Matchup,
  ManagerStats,
  SeasonScoringTrend,
  WeeklyScoreDistribution,
  TopPerformance,
  MarginGame,
  LuckIndex,
  ManagerConsistency,
  PlayoffStats,
} from "@/types/stats";

// Type assertions for imported JSON
export const champions = championsData as Champion[];
export const standings = standingsData as Standing[];
export const h2hRecords = h2hData as H2HRecord[];
export const matchups = matchupsData as Matchup[];

// Filter out hidden managers
const isVisibleManager = (name: string) => name !== "--hidden--";

// Get unique seasons from data
export function getSeasons(): number[] {
  const seasons = new Set<number>();
  standings.forEach((s) => seasons.add(s.season_year));
  return Array.from(seasons).sort((a, b) => b - a);
}

// Get standings for a specific season
export function getSeasonStandings(year: number): Standing[] {
  return standings
    .filter((s) => s.season_year === year)
    .sort((a, b) => a.final_rank - b.final_rank);
}

// Get manager stats aggregated across all seasons (only for visible managers)
export function getManagerStats(): ManagerStats[] {
  const managerMap = new Map<string, ManagerStats>();

  // Aggregate from standings data
  standings
    .filter((s) => isVisibleManager(s.manager_name))
    .forEach((s) => {
      const existing = managerMap.get(s.manager_name);
      if (existing) {
        existing.totalWins += s.wins;
        existing.totalLosses += s.losses;
        existing.totalPointsFor += s.points_for;
        existing.seasonsPlayed += 1;
      } else {
        managerMap.set(s.manager_name, {
          manager: s.manager_name,
          totalWins: s.wins,
          totalLosses: s.losses,
          winPercentage: 0,
          totalPointsFor: s.points_for,
          avgPointsPerGame: 0,
          championships: 0,
          seasonsPlayed: 1,
        });
      }
    });

  // Count championships
  champions
    .filter((c) => isVisibleManager(c.champion_manager))
    .forEach((c) => {
      const manager = managerMap.get(c.champion_manager);
      if (manager) {
        manager.championships += 1;
      }
    });

  // Calculate derived stats
  const result = Array.from(managerMap.values()).map((m) => ({
    ...m,
    winPercentage:
      m.totalWins + m.totalLosses > 0
        ? m.totalWins / (m.totalWins + m.totalLosses)
        : 0,
    avgPointsPerGame:
      m.totalWins + m.totalLosses > 0
        ? m.totalPointsFor / (m.totalWins + m.totalLosses)
        : 0,
  }));

  // Sort by win percentage descending
  return result.sort((a, b) => b.winPercentage - a.winPercentage);
}

// Get scoring trends by season
export function getSeasonScoringTrends(): SeasonScoringTrend[] {
  const seasonMap = new Map<number, { scores: number[] }>();

  matchups.forEach((m) => {
    const existing = seasonMap.get(m.season_year);
    const scores = [m.team1_score, m.team2_score].filter((s) => s > 0);
    if (existing) {
      existing.scores.push(...scores);
    } else {
      seasonMap.set(m.season_year, { scores });
    }
  });

  return Array.from(seasonMap.entries())
    .map(([season, data]) => {
      const scores = data.scores;
      return {
        season,
        avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
        highScore: Math.max(...scores),
        lowScore: Math.min(...scores),
        totalGames: scores.length / 2,
      };
    })
    .sort((a, b) => a.season - b.season);
}

// Get score distribution histogram
export function getScoreDistribution(): WeeklyScoreDistribution[] {
  const ranges = [
    { min: 0, max: 70, label: "0-70" },
    { min: 70, max: 80, label: "70-80" },
    { min: 80, max: 90, label: "80-90" },
    { min: 90, max: 100, label: "90-100" },
    { min: 100, max: 110, label: "100-110" },
    { min: 110, max: 120, label: "110-120" },
    { min: 120, max: 130, label: "120-130" },
    { min: 130, max: 140, label: "130-140" },
    { min: 140, max: 150, label: "140-150" },
    { min: 150, max: 200, label: "150+" },
  ];

  const allScores: number[] = [];
  matchups.forEach((m) => {
    if (m.team1_score > 0) allScores.push(m.team1_score);
    if (m.team2_score > 0) allScores.push(m.team2_score);
  });

  const total = allScores.length;

  return ranges.map((range) => {
    const count = allScores.filter(
      (s) => s >= range.min && s < range.max
    ).length;
    return {
      range: range.label,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    };
  });
}

// Get top scoring performances
export function getTopPerformances(limit = 10): TopPerformance[] {
  const performances: TopPerformance[] = [];

  matchups.forEach((m) => {
    performances.push({
      season: m.season_year,
      week: m.week,
      team: m.team1_name,
      manager: m.team1_manager,
      score: m.team1_score,
      opponent: m.team2_name,
      opponentScore: m.team2_score,
      matchupType: m.matchup_type,
    });
    performances.push({
      season: m.season_year,
      week: m.week,
      team: m.team2_name,
      manager: m.team2_manager,
      score: m.team2_score,
      opponent: m.team1_name,
      opponentScore: m.team1_score,
      matchupType: m.matchup_type,
    });
  });

  return performances
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Get lowest scoring performances
export function getLowestPerformances(limit = 10): TopPerformance[] {
  const performances: TopPerformance[] = [];

  matchups.forEach((m) => {
    performances.push({
      season: m.season_year,
      week: m.week,
      team: m.team1_name,
      manager: m.team1_manager,
      score: m.team1_score,
      opponent: m.team2_name,
      opponentScore: m.team2_score,
      matchupType: m.matchup_type,
    });
    performances.push({
      season: m.season_year,
      week: m.week,
      team: m.team2_name,
      manager: m.team2_manager,
      score: m.team2_score,
      opponent: m.team1_name,
      opponentScore: m.team1_score,
      matchupType: m.matchup_type,
    });
  });

  return performances
    .filter((p) => p.score > 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}

// Get H2H records filtered to visible managers
export function getVisibleH2HRecords(): H2HRecord[] {
  return h2hRecords.filter(
    (r) => isVisibleManager(r.manager1) && isVisibleManager(r.manager2)
  );
}

// Get champion data for chart
export function getChampionsChartData() {
  return champions.map((c) => ({
    season: c.season_year,
    team: c.champion_team_name,
    manager: c.champion_manager,
    points: c.champion_points_for,
    wins: c.champion_wins,
    losses: c.champion_losses,
    record: `${c.champion_wins}-${c.champion_losses}`,
  }));
}

// Get blowout games (largest margins)
export function getBlowouts(limit = 10): MarginGame[] {
  return matchups
    .filter(
      (m) =>
        m.team1_score > 0 &&
        m.team2_score > 0 &&
        isVisibleManager(m.team1_manager) &&
        isVisibleManager(m.team2_manager)
    )
    .map((m) => ({
      season: m.season_year,
      week: m.week,
      team1: m.team1_name,
      team1Manager: m.team1_manager,
      team1Score: m.team1_score,
      team2: m.team2_name,
      team2Manager: m.team2_manager,
      team2Score: m.team2_score,
      margin: Math.abs(m.team1_score - m.team2_score),
      matchupType: m.matchup_type,
      winner: m.winner,
    }))
    .sort((a, b) => b.margin - a.margin)
    .slice(0, limit);
}

// Get closest games (smallest margins, excluding ties)
export function getClosestGames(limit = 10): MarginGame[] {
  return matchups
    .filter(
      (m) =>
        m.team1_score > 0 &&
        m.team2_score > 0 &&
        !m.is_tied &&
        isVisibleManager(m.team1_manager) &&
        isVisibleManager(m.team2_manager)
    )
    .map((m) => ({
      season: m.season_year,
      week: m.week,
      team1: m.team1_name,
      team1Manager: m.team1_manager,
      team1Score: m.team1_score,
      team2: m.team2_name,
      team2Manager: m.team2_manager,
      team2Score: m.team2_score,
      margin: Math.abs(m.team1_score - m.team2_score),
      matchupType: m.matchup_type,
      winner: m.winner,
    }))
    .sort((a, b) => a.margin - b.margin)
    .slice(0, limit);
}

// Get luck index for all managers
export function getLuckIndex(): LuckIndex[] {
  const managerData = new Map<
    string,
    { wins: number; games: number; pointsFor: number }
  >();

  // Calculate league average points per game
  let totalPoints = 0;
  let totalGames = 0;

  matchups.forEach((m) => {
    if (
      m.team1_score > 0 &&
      m.matchup_type === "regular" &&
      isVisibleManager(m.team1_manager)
    ) {
      const data = managerData.get(m.team1_manager) || {
        wins: 0,
        games: 0,
        pointsFor: 0,
      };
      data.games += 1;
      data.pointsFor += m.team1_score;
      if (m.winner === m.team1_name) data.wins += 1;
      managerData.set(m.team1_manager, data);
      totalPoints += m.team1_score;
      totalGames += 1;
    }
    if (
      m.team2_score > 0 &&
      m.matchup_type === "regular" &&
      isVisibleManager(m.team2_manager)
    ) {
      const data = managerData.get(m.team2_manager) || {
        wins: 0,
        games: 0,
        pointsFor: 0,
      };
      data.games += 1;
      data.pointsFor += m.team2_score;
      if (m.winner === m.team2_name) data.wins += 1;
      managerData.set(m.team2_manager, data);
      totalPoints += m.team2_score;
      totalGames += 1;
    }
  });

  const leagueAvgPPG = totalPoints / totalGames;

  return Array.from(managerData.entries())
    .filter(([, data]) => data.games >= 10) // Minimum 10 games
    .map(([manager, data]) => {
      const managerAvgPPG = data.pointsFor / data.games;
      const expectedWinRate = managerAvgPPG / (2 * leagueAvgPPG);
      const expectedWins = expectedWinRate * data.games;
      return {
        manager,
        luck: data.wins - expectedWins,
        actualWins: data.wins,
        expectedWins: Math.round(expectedWins * 10) / 10,
        gamesPlayed: data.games,
        pointsFor: data.pointsFor,
      };
    })
    .sort((a, b) => b.luck - a.luck);
}

// Get scoring consistency (standard deviation of scores)
export function getManagerConsistency(): ManagerConsistency[] {
  const managerScores = new Map<string, number[]>();

  matchups.forEach((m) => {
    if (m.team1_score > 0 && isVisibleManager(m.team1_manager)) {
      const scores = managerScores.get(m.team1_manager) || [];
      scores.push(m.team1_score);
      managerScores.set(m.team1_manager, scores);
    }
    if (m.team2_score > 0 && isVisibleManager(m.team2_manager)) {
      const scores = managerScores.get(m.team2_manager) || [];
      scores.push(m.team2_score);
      managerScores.set(m.team2_manager, scores);
    }
  });

  return Array.from(managerScores.entries())
    .filter(([, scores]) => scores.length >= 10) // Minimum 10 games
    .map(([manager, scores]) => {
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variance =
        scores.reduce((acc, s) => acc + Math.pow(s - avgScore, 2), 0) /
        scores.length;
      const stdDev = Math.sqrt(variance);
      return {
        manager,
        avgScore,
        stdDev,
        gamesPlayed: scores.length,
      };
    })
    .sort((a, b) => a.stdDev - b.stdDev); // Most consistent first
}

// Get playoff performance stats
export function getPlayoffStats(): PlayoffStats[] {
  const managerPlayoff = new Map<
    string,
    { wins: number; losses: number; points: number; games: number }
  >();
  const managerRegular = new Map<
    string,
    { wins: number; losses: number; points: number; games: number }
  >();

  matchups.forEach((m) => {
    const isPlayoff = m.matchup_type === "playoff";

    // Team 1
    if (m.team1_score > 0 && isVisibleManager(m.team1_manager)) {
      const map = isPlayoff ? managerPlayoff : managerRegular;
      const data = map.get(m.team1_manager) || {
        wins: 0,
        losses: 0,
        points: 0,
        games: 0,
      };
      data.points += m.team1_score;
      data.games += 1;
      if (m.winner === m.team1_name) data.wins += 1;
      else if (!m.is_tied) data.losses += 1;
      map.set(m.team1_manager, data);
    }

    // Team 2
    if (m.team2_score > 0 && isVisibleManager(m.team2_manager)) {
      const map = isPlayoff ? managerPlayoff : managerRegular;
      const data = map.get(m.team2_manager) || {
        wins: 0,
        losses: 0,
        points: 0,
        games: 0,
      };
      data.points += m.team2_score;
      data.games += 1;
      if (m.winner === m.team2_name) data.wins += 1;
      else if (!m.is_tied) data.losses += 1;
      map.set(m.team2_manager, data);
    }
  });

  const results: PlayoffStats[] = [];

  managerPlayoff.forEach((playoff, manager) => {
    if (playoff.games < 2) return; // Minimum 2 playoff games
    const regular = managerRegular.get(manager) || {
      wins: 0,
      losses: 0,
      points: 0,
      games: 0,
    };
    const playoffPPG = playoff.points / playoff.games;
    const regularPPG = regular.games > 0 ? regular.points / regular.games : 0;

    results.push({
      manager,
      playoffWins: playoff.wins,
      playoffLosses: playoff.losses,
      playoffPPG,
      regularWins: regular.wins,
      regularLosses: regular.losses,
      regularPPG,
      clutchRating: playoffPPG - regularPPG,
      playoffGames: playoff.games,
    });
  });

  return results.sort((a, b) => b.clutchRating - a.clutchRating);
}

// Chart theme colors matching the site design
export const chartColors = {
  primary: "#2D5A3D", // slate accent
  secondary: "#1a1a1a", // foreground
  tertiary: "#9ca3af", // gray
  background: "#f5f5f0", // warm beige
  card: "#ffffff",
  grid: "#e5e7eb",
};
