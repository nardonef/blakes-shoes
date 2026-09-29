// Minimal raw shapes for the Sleeper endpoints the ingest reads.
// Only fields the transform uses are listed.

export interface SleeperLeague {
  league_id: string;
  season: string;
  status: string;
  name: string;
  previous_league_id: string | null;
  total_rosters: number;
  settings: {
    playoff_week_start?: number;
    playoff_teams?: number;
    last_scored_leg?: number;
    leg?: number;
  };
}

export interface SleeperUser {
  user_id: string;
  display_name: string;
  avatar: string | null;
  metadata?: { team_name?: string };
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string | null;
  settings: {
    wins: number;
    losses: number;
    ties: number;
    fpts: number;
    fpts_decimal?: number;
    fpts_against?: number;
    fpts_against_decimal?: number;
  };
  metadata?: { streak?: string };
}

export interface SleeperMatchup {
  roster_id: number;
  matchup_id: number | null;
  points: number;
}

/** `w`/`l` are roster ids once played; `p` is the place the game decides. */
export interface BracketMatch {
  r: number;
  m: number;
  w: number | null;
  l: number | null;
  p?: number;
  t1?: number | { w: number } | { l: number };
  t2?: number | { w: number } | { l: number };
}

/** Everything needed to reconstruct one league-season. */
export interface SeasonPayload {
  league: SleeperLeague;
  users: SleeperUser[];
  rosters: SleeperRoster[];
  matchupsByWeek: Record<number, SleeperMatchup[]>;
  winnersBracket: BracketMatch[];
}
