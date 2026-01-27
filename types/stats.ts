// Champion data type
export interface Champion {
  season_year: number;
  champion_team_name: string;
  champion_manager: string;
  champion_wins: number;
  champion_losses: number;
  champion_points_for: number;
  runner_up_team_name: string;
  runner_up_manager: string;
  third_place_team_name: string;
  third_place_manager: string;
}

// Standings data type
export interface Standing {
  season_year: number;
  team_id: string;
  team_key: string;
  team_name: string;
  manager_name: string;
  final_rank: number;
  playoff_seed: string;
  wins: number;
  losses: number;
  ties: number;
  win_percentage: number;
  points_for: number;
  points_against: number;
  streak_type: string;
  streak_value: string;
}

// H2H record type
export interface H2HRecord {
  manager1: string;
  manager2: string;
  total_matchups: number;
  manager1_wins: number;
  manager2_wins: number;
  ties: number;
}

// Matchup data type
export interface Matchup {
  season_year: number;
  week: number;
  matchup_type: "regular" | "playoff" | "consolation";
  team1_name: string;
  team1_manager: string;
  team1_score: number;
  team2_name: string;
  team2_manager: string;
  team2_score: number;
  winner: string;
  is_tied: boolean;
}

// Processed data types for visualizations
export interface ManagerStats {
  manager: string;
  totalWins: number;
  totalLosses: number;
  winPercentage: number;
  totalPointsFor: number;
  avgPointsPerGame: number;
  championships: number;
  seasonsPlayed: number;
}

export interface SeasonScoringTrend {
  season: number;
  avgScore: number;
  highScore: number;
  lowScore: number;
  totalGames: number;
}

export interface WeeklyScoreDistribution {
  range: string;
  count: number;
  percentage: number;
}

export interface TopPerformance {
  season: number;
  week: number;
  team: string;
  manager: string;
  score: number;
  opponent: string;
  opponentScore: number;
  matchupType: string;
}

// Blowout/Closest game data
export interface MarginGame {
  season: number;
  week: number;
  team1: string;
  team1Manager: string;
  team1Score: number;
  team2: string;
  team2Manager: string;
  team2Score: number;
  margin: number;
  matchupType: string;
  winner: string;
}

// Luck index data
export interface LuckIndex {
  manager: string;
  luck: number;
  actualWins: number;
  expectedWins: number;
  gamesPlayed: number;
  pointsFor: number;
}

// Manager consistency data
export interface ManagerConsistency {
  manager: string;
  avgScore: number;
  stdDev: number;
  gamesPlayed: number;
}

// Playoff performance data
export interface PlayoffStats {
  manager: string;
  playoffWins: number;
  playoffLosses: number;
  playoffPPG: number;
  regularWins: number;
  regularLosses: number;
  regularPPG: number;
  clutchRating: number;
  playoffGames: number;
}
