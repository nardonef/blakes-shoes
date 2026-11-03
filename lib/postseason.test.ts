import { describe, expect, it } from "vitest";
import championsData from "@/data/champions.json";
import leagueInfo from "@/data/league_info.json";
import matchupsData from "@/data/matchups.json";
import { classifyGames, type PostseasonGame } from "./postseason";
import {
  getBlowouts,
  getLowestPerformances,
  getPlayoffStats,
  getTopPerformances,
  h2hRecords,
  matchups,
  statGames,
} from "./stats-data";

const types = classifyGames(matchupsData, leagueInfo);

describe("classifyGames on real seasons", () => {
  it("finds every recorded champion, runner-up and third place in the last week's title-bracket games", () => {
    for (const c of championsData) {
      const last = Number(leagueInfo.find((l) => l.season_year === c.season_year)!.end_week);
      const finals = matchupsData.filter((g, i) => g.season_year === c.season_year && g.week === last && types[i] === "playoff");
      expect(finals, String(c.season_year)).toHaveLength(2);
      const title = finals.find((g) => g.winner === c.champion_team_name)!;
      expect([title.team1_name, title.team2_name], String(c.season_year)).toContain(c.runner_up_team_name);
      expect(finals.find((g) => g !== title)!.winner, String(c.season_year)).toBe(c.third_place_team_name);
    }
  });

  it("keeps 8 title-bracket games a season with 8 playoff teams and 6 with 6", () => {
    for (const c of championsData) {
      const n = Number(leagueInfo.find((l) => l.season_year === c.season_year)!.num_playoff_teams);
      const bracket = matchupsData.filter((g, i) => g.season_year === c.season_year && types[i] === "playoff").length;
      expect(bracket, String(c.season_year)).toBe(n === 8 ? 8 : 6);
    }
  });

  it("never relabels a regular-season game", () => {
    matchupsData.forEach((g, i) => expect(types[i] === "regular").toBe(g.matchup_type === "regular"));
  });
});

describe("classifyGames rules", () => {
  // Six teams A-F seeded in that order by a one-week regular season; 2 bye weeks; final in week 4.
  const game = (week: number, a: string, b: string, winner: string, type = "playoff"): PostseasonGame => ({
    season_year: 2099, week, matchup_type: type, team1_name: a, team1_score: winner === a ? 100 : winner ? 90 : 95,
    team2_name: b, team2_score: winner === b ? 100 : winner ? 90 : 95, winner, is_tied: !winner,
  });
  const regular = [
    game(1, "A", "X1", "A", "regular"), game(1, "B", "X2", "B", "regular"), game(1, "C", "X3", "C", "regular"),
    game(1, "D", "X4", "D", "regular"), game(1, "E", "X5", "E", "regular"), game(1, "F", "X6", "F", "regular"),
  ].map((g, i) => ({ ...g, team1_score: 200 - i * 10 })); // A has the most points, so seeds run A..F
  const settings = [{ season_year: 2099, playoff_start_week: "2", end_week: "4", num_playoff_teams: "6" }];

  it("labels the bracket, the third-place game and the consolation games", () => {
    const post = [
      game(2, "C", "F", "C"), game(2, "D", "E", ""), // D-E tie: D (higher seed) advances
      game(2, "X1", "X2", "X1"),
      game(3, "A", "D", "D"), game(3, "B", "C", "B"), game(3, "E", "F", "E"),
      game(4, "D", "B", "B"), game(4, "A", "C", "A"), game(4, "E", "X1", "E"),
    ];
    const t = classifyGames([...regular, ...post], settings).slice(regular.length);
    expect(t).toEqual([
      "playoff", "playoff", "consolation",
      "playoff", "playoff", "consolation",
      "playoff", "playoff", "consolation",
    ]);
  });
});

describe("stats leave consolation games out", () => {
  it("drops only consolation games", () => {
    expect(statGames.length).toBe(matchups.filter((m) => m.matchup_type !== "consolation").length);
    expect(statGames.some((m) => m.matchup_type === "consolation")).toBe(false);
  });

  it("no longer counts Peter's 2.00 in a 2023 consolation game as a record", () => {
    for (const p of [...getLowestPerformances(), ...getTopPerformances()]) expect(p.matchupType).not.toBe("consolation");
    for (const g of getBlowouts()) expect(g.matchupType).not.toBe("consolation");
    expect(getLowestPerformances(1)[0].score).toBeGreaterThan(30);
  });

  it("counts only title-bracket games as playoff games", () => {
    const bracketSides = statGames.filter((m) => m.matchup_type === "playoff").length * 2;
    const counted = getPlayoffStats().reduce((a, p) => a + p.playoffGames, 0);
    expect(counted).toBeLessThanOrEqual(bracketSides);
    expect(h2hRecords.reduce((a, r) => a + r.total_matchups, 0)).toBe(statGames.length);
  });
});
