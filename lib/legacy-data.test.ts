import { describe, expect, it } from "vitest";
import championsData from "@/data/champions.json";
import { getManagerLegacies } from "./legacy-data";
import { getRecords } from "./chat-tools";
import { getAllPlay, getAllPlaySeasons } from "./luck-lineups-data";

describe("manager legacies", () => {
  it("takes best and worst finishes only from seasons with a champion", () => {
    const finished = new Set(championsData.map((c) => c.season_year));
    for (const l of getManagerLegacies()) {
      for (const s of [l.bestSeason, l.worstSeason]) if (s) expect(finished.has(s.year)).toBe(true);
    }
  });
});

describe("luck matches Stats > Luck & Lineups", () => {
  it("measures each owner's luck as real wins minus all-play expected wins", () => {
    const seasons = getAllPlaySeasons();
    for (const l of getManagerLegacies()) {
      const mine = seasons.filter((s) => s.manager === l.owner.name);
      const expected = mine.reduce((a, s) => a + s.expectedWins, 0);
      expect(l.expectedWins).toBeCloseTo(expected, 5);
      expect(l.luck).toBeCloseTo(mine.reduce((a, s) => a + s.wins, 0) - expected, 5);
    }
  });

  it("points the same way as the Stats page's schedule luck for every rated owner", () => {
    const careers = new Map(getAllPlay().careers.map((c) => [c.manager, c.luck]));
    for (const l of getManagerLegacies()) {
      const pct = careers.get(l.owner.name);
      if (pct == null || Math.abs(pct) < 0.5) continue; // too close to call either way
      expect(Math.sign(l.luck), l.owner.name).toBe(Math.sign(pct));
    }
  });

  it("feeds ShoesGPT's luck leaderboard from the same all-play numbers", () => {
    expect(getRecords("luck", 3)).toEqual(getAllPlay().careers.slice(0, 3));
  });
});
