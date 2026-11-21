import { describe, it, expect } from "vitest";
import { latestWeek, getScoreboard } from "./scoreboard";
import type { Matchup } from "@/types/stats";

const g = (season: number, week: number, a: [string, number], b: [string, number], type: Matchup["matchup_type"] = "regular"): Matchup => ({
  season_year: season,
  week,
  matchup_type: type,
  team1_name: a[0],
  team1_manager: "",
  team1_score: a[1],
  team2_name: b[0],
  team2_manager: "",
  team2_score: b[1],
  winner: "",
  is_tied: a[1] === b[1],
});

describe("latestWeek", () => {
  it("picks the latest complete week of the latest season, winner first", () => {
    const board = latestWeek([
      g(2025, 14, ["Old", 100], ["Older", 90]),
      g(2026, 1, ["Alpha", 101.24], ["Beta", 99]),
      g(2026, 2, ["Gamma", 88], ["Delta", 120.06]),
      g(2026, 2, ["Eps", 110], ["Zeta", 95.5]),
    ])!;
    expect(board.season).toBe(2026);
    expect(board.week).toBe(2);
    expect(board.label).toBe("WEEK 2 · FINAL");
    expect(board.games).toEqual([
      { winner: "DELTA", winnerScore: "120.1", loser: "GAMMA", loserScore: "88.0", tied: false },
      { winner: "EPS", winnerScore: "110.0", loser: "ZETA", loserScore: "95.5", tied: false },
    ]);
  });

  it("skips a week still being played (a zero score)", () => {
    const board = latestWeek([g(2026, 1, ["A", 100], ["B", 90]), g(2026, 2, ["C", 64.2], ["D", 0])])!;
    expect(board.week).toBe(1);
  });

  it("labels playoff weeks, ignores consolation games and flags ties", () => {
    const board = latestWeek([
      g(2026, 15, ["A", 100], ["B", 100], "playoff"),
      g(2026, 15, ["C", 0], ["D", 0], "consolation"),
    ])!;
    expect(board.label).toBe("PLAYOFFS · WEEK 15 · FINAL");
    expect(board.games).toHaveLength(1);
    expect(board.games[0].tied).toBe(true);
  });

  it("returns null with no games", () => {
    expect(latestWeek([])).toBeNull();
  });
});

describe("getScoreboard (real league data)", () => {
  it("shows a complete recent week of the current season with six games", () => {
    const board = getScoreboard()!;
    expect(board.season).toBe(2026);
    expect(board.week).toBeGreaterThanOrEqual(7);
    expect(board.games).toHaveLength(6);
    for (const s of board.games) expect(Number(s.winnerScore)).toBeGreaterThanOrEqual(Number(s.loserScore));
  });
});
