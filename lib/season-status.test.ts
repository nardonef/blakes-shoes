import { describe, expect, it } from "vitest";
import championsData from "@/data/champions.json";
import { getLiveSeason, getSeasonRange } from "./season-status";

describe("season status", () => {
  it("spans every season in league_info", () => {
    const { first, last } = getSeasonRange();
    expect(first).toBe(2012);
    expect(last).toBeGreaterThanOrEqual(2025);
  });

  it("treats the latest season as live only while it has no champion", () => {
    const { last } = getSeasonRange();
    const live = getLiveSeason();
    if (championsData.some((c) => c.season_year === last)) {
      expect(live).toBeNull();
    } else {
      expect(live?.season).toBe(last);
      expect(live!.throughWeek).toBeGreaterThan(0);
    }
  });
});
