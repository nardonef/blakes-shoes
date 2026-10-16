import { describe, it, expect } from "vitest";
import {
  findManager,
  listManagers,
  getChampions,
  getSeasonStandings,
  getCareerStats,
  getHeadToHead,
  getRecords,
  queryMatchups,
  getLeagueSettings,
  MAX_MATCHUP_ROWS,
} from "./chat-tools";

describe("findManager", () => {
  it("matches a full display name case-insensitively", () => {
    expect(findManager("frankie nardone")).toBe("Frankie Nardone");
  });

  it("matches a unique partial name", () => {
    expect(findManager("Kaplan")).toBe("Ryan Kaplan");
  });

  it("returns an error listing candidates for an ambiguous name", () => {
    const r = findManager("Ryan");
    expect(r).toHaveProperty("error");
    expect((r as { error: string }).error).toContain("Ryan Jenks");
    expect((r as { error: string }).error).toContain("Ryan Kaplan");
  });

  it("returns an error for an unknown name", () => {
    expect(findManager("Zeke")).toHaveProperty("error");
  });
});

describe("listManagers", () => {
  it("lists the 12 current owners and excludes hidden managers", () => {
    const r = listManagers();
    expect(r.currentOwners).toHaveLength(12);
    expect(r.allManagersEver).not.toContain("--hidden--");
    // Raw aliases are resolved, not listed separately
    expect(r.allManagersEver).toContain("Eric Rios");
    expect(r.allManagersEver).not.toContain("efuego93");
  });
});

describe("getChampions", () => {
  it("returns one row per season with resolved names", () => {
    const r = getChampions();
    expect(r).toHaveLength(14);
    expect(r.find((c) => c.year === 2020)).toMatchObject({
      champion: "Matt Borba",
      runnerUp: "Ryan Curran",
      thirdPlace: "Ryan Kaplan",
    });
  });
});

describe("getSeasonStandings", () => {
  it("returns 12 teams in rank order", () => {
    const r = getSeasonStandings(2020) as { rank: number }[];
    expect(r).toHaveLength(12);
    expect(r.map((s) => s.rank)).toEqual([...r.map((s) => s.rank)].sort((a, b) => a - b));
  });

  it("errors on a season with no data", () => {
    expect(getSeasonStandings(2005)).toHaveProperty("error");
  });
});

describe("getCareerStats", () => {
  it("filters to one manager and includes legacy details", () => {
    const r = getCareerStats("Matt Borba") as { manager: string; championshipYears?: number[] }[];
    expect(r).toHaveLength(1);
    expect(r[0].championshipYears).toContain(2020);
  });

  it("returns all managers when no name is given", () => {
    expect((getCareerStats() as unknown[]).length).toBeGreaterThanOrEqual(12);
  });
});

describe("getHeadToHead", () => {
  it("returns a single pairing", () => {
    const r = getHeadToHead("Frankie", "Kaplan") as { opponents: unknown[] };
    expect(r.opponents).toEqual([{ opponent: "Ryan Kaplan", wins: 9, losses: 9, ties: 0, games: 18 }]);
  });

  it("merges an opponent's multiple Yahoo usernames", () => {
    // Eric Rios played as both "eric" (6-2 Frankie) and "efuego93" (1-4 Frankie)
    const r = getHeadToHead("Frankie", "Eric") as { opponents: unknown[] };
    expect(r.opponents).toEqual([{ opponent: "Eric Rios", wins: 7, losses: 6, ties: 0, games: 13 }]);
  });

  it("propagates name-resolution errors", () => {
    expect(getHeadToHead("Ryan")).toHaveProperty("error");
  });
});

describe("getRecords", () => {
  it("returns the all-time highest score with a resolved manager", () => {
    const [top] = getRecords("highest_scores", 1) as { manager: string; score: number }[];
    expect(top).toMatchObject({ manager: "Ryan Curran", score: 202, season: 2023, week: 4 });
  });

  it("respects the limit", () => {
    expect(getRecords("closest_games", 3)).toHaveLength(3);
  });

  it("ranks winless season starts (losses and ties count)", () => {
    const r = getRecords("winless_season_starts", 3) as { manager: string; season: number; winlessGames: number }[];
    expect(r.slice(0, 2)).toMatchObject([
      { manager: "Ryan Kaplan", season: 2017, winlessGames: 6 },
      { manager: "Eric Rios", season: 2022, winlessGames: 6 },
    ]);
    expect(r[2]).toMatchObject({ manager: "Ryan Kaplan", season: 2021, winlessGames: 5 });
  });

  it("ranks win streaks within a regular season", () => {
    const [top] = getRecords("win_streaks", 1);
    expect(top).toEqual({ manager: "Peter Klensch", season: 2017, streak: 10, fromWeek: 1, toWeek: 10 });
  });

  it("ranks losing streaks within a regular season", () => {
    const [top] = getRecords("losing_streaks", 1);
    expect(top).toEqual({ manager: "Eric Rios", season: 2018, streak: 12, fromWeek: 2, toWeek: 13 });
  });
});

describe("queryMatchups", () => {
  it("filters by season and week", () => {
    const r = queryMatchups({ season: 2019, week: 1 }) as { totalMatches: number };
    expect(r.totalMatches).toBe(6);
  });

  it("puts the queried manager on the left with a result from their side", () => {
    const r = queryMatchups({ manager: "Frankie", opponent: "Kaplan" }) as {
      totalMatches: number;
      matchups: { manager: string; result: string }[];
    };
    expect(r.totalMatches).toBe(18);
    expect(r.matchups.every((m) => m.manager === "Frankie Nardone")).toBe(true);
    expect(r.matchups.filter((m) => m.result === "win")).toHaveLength(9);
  });

  it("caps rows and reports truncation", () => {
    const r = queryMatchups({ limit: 500 }) as { truncated: boolean; matchups: unknown[] };
    expect(r.matchups).toHaveLength(MAX_MATCHUP_ROWS);
    expect(r.truncated).toBe(true);
  });

  it("filters by matchup type", () => {
    const r = queryMatchups({ season: 2020, type: "playoff" }) as { matchups: { type: string }[] };
    expect(r.matchups.length).toBeGreaterThan(0);
    expect(r.matchups.every((m) => m.type === "playoff")).toBe(true);
  });
});

describe("getLeagueSettings", () => {
  it("returns parsed settings for a season", () => {
    expect(getLeagueSettings(2012)).toMatchObject({
      numTeams: 12,
      playoffStartWeek: 14,
      numPlayoffTeams: 8,
      tradeDeadline: "2012-11-16",
    });
  });

  it("errors on an unknown season", () => {
    expect(getLeagueSettings(1999)).toHaveProperty("error");
  });
});
