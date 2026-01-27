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

// Chart theme colors matching the site design
export const chartColors = {
  primary: "#2D5A3D", // slate accent
  secondary: "#1a1a1a", // foreground
  tertiary: "#9ca3af", // gray
  background: "#f5f5f0", // warm beige
  card: "#ffffff",
  grid: "#e5e7eb",
};
