import { describe, expect, it } from "vitest";
import championsData from "@/data/champions.json";
import { getManagerLegacies } from "./legacy-data";

describe("manager legacies", () => {
  it("takes best and worst finishes only from seasons with a champion", () => {
    const finished = new Set(championsData.map((c) => c.season_year));
    for (const l of getManagerLegacies()) {
      for (const s of [l.bestSeason, l.worstSeason]) if (s) expect(finished.has(s.year)).toBe(true);
    }
  });
});
