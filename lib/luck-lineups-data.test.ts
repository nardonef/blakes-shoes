import { describe, expect, it } from "vitest";
import { getAllPlay, getLineupEfficiency, optimalPoints, weekLineup } from "./luck-lineups-data";
import { getSeasonModel } from "./rosters-data";

describe("optimalPoints", () => {
  it("fills fixed slots with the best at each position, then flex with the best remaining", () => {
    const roster = [
      { pos: "QB", points: 20 }, { pos: "QB", points: 25 },
      { pos: "RB", points: 10 }, { pos: "RB", points: 18 }, { pos: "RB", points: 15 },
      { pos: "WR", points: 12 }, { pos: "TE", points: 4 }, { pos: "K", points: 7 },
    ];
    // QB 25, RB 18, WR 12, TE 4, K 7, flex = best remaining RB/WR/TE = RB 15
    expect(optimalPoints(["QB", "RB", "WR", "TE", "K", "W/R/T"], roster)).toBe(25 + 18 + 12 + 4 + 7 + 15);
  });

  it("never puts a QB in a flex slot and scores an unfillable slot as 0", () => {
    expect(optimalPoints(["W/R/T"], [{ pos: "QB", points: 30 }])).toBe(0);
    expect(optimalPoints(["DEF"], [{ pos: "", points: 30 }])).toBe(0);
  });
});

describe("all-play", () => {
  const ap = getAllPlay();

  it("is zero-sum: league-wide all-play wins equal all-play losses", () => {
    // Every pairwise comparison is one team's win and another's loss, so league-wide all-play % is 50%
    // when weighted by games (hidden managers are left out, so allow a little slack).
    const games = ap.careers.reduce((a, c) => a + c.games, 0);
    const weighted = ap.careers.reduce((a, c) => a + c.allPlayPct * c.games, 0) / games;
    expect(weighted).toBeGreaterThan(0.45);
    expect(weighted).toBeLessThan(0.55);
  });

  it("ranks careers by real minus all-play win %", () => {
    expect(ap.careers[0].manager).toBe("Peter Klensch");
    expect(ap.careers[0].luck).toBeCloseTo(4.1, 0);
    for (const c of ap.careers) {
      expect(c.games).toBeGreaterThanOrEqual(40);
      expect(c.luck).toBeCloseTo((c.realPct - c.allPlayPct) * 100, 0);
    }
  });

  it("finds the luckiest and unluckiest single seasons", () => {
    expect(ap.luckiest[0]).toMatchObject({ season: 2021, manager: "Anthony Bove", wins: 9, losses: 5 });
    expect(ap.luckiest[0].expectedWins).toBeCloseTo(5.5, 0);
    expect(ap.unluckiest[0].luck).toBeLessThan(0);
    expect(ap.unluckiest[0].luck).toBeLessThanOrEqual(ap.unluckiest[4].luck);
  });
});

describe("lineup efficiency", () => {
  const eff = getLineupEfficiency();

  it("is a share of the best possible lineup, never above 100%", () => {
    for (const e of eff) {
      expect(e.efficiency).toBeGreaterThan(0.7);
      expect(e.efficiency).toBeLessThanOrEqual(1);
      expect(e.couldaWon).toBeLessThanOrEqual(e.losses);
    }
    expect(eff.map((e) => e.efficiency)).toEqual([...eff.map((e) => e.efficiency)].sort((a, b) => b - a));
  });

  it("counts Ryan Jenks' 2018 week 14 loss, with Derrick Henry benched, as one he could have won", () => {
    // He lost by 0.26 with Henry (47.8) on the bench.
    const S = getSeasonModel(2018)!;
    const game = S.games.get("Ryan Jenks|14")!;
    const wl = weekLineup(S, "Ryan Jenks", 14)!;
    expect(game.result).toBe("L");
    expect(wl.actual).toBeCloseTo(game.points, 1);
    expect(wl.best).toBeGreaterThan(game.opponentPoints);
    expect(wl.best - wl.actual).toBeGreaterThan(20);
  });
});
