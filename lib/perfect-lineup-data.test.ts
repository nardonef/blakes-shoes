import { describe, expect, it } from "vitest";
import leagueInfo from "@/data/league_info.json";
import { getPerfectSeasons, recordedChampion, simulateSeason } from "./perfect-lineup-data";
import { getSeasonModel } from "./rosters-data";

const seasons = getPerfectSeasons();
const past = seasons.filter((s) => s.season <= 2025);

describe("bracket replay with real scores", () => {
  it("reproduces every recorded champion", () => {
    expect(past).toHaveLength(14);
    for (const s of seasons) expect(s.real.champion, String(s.season)).toBe(recordedChampion(s.season));
  });

  it("puts the real playoff teams in the playoffs", () => {
    for (const s of seasons) {
      const n = Number(leagueInfo.find((l) => l.season_year === s.season)!.num_playoff_teams);
      const S = getSeasonModel(s.season)!;
      const made = new Set([...S.standings].filter(([, st]) => st.final_rank <= n).map(([m]) => m));
      expect(s.real.teams.slice(0, n).map((t) => t.manager).filter((m) => !made.has(m)), String(s.season)).toEqual([]);
    }
  });

  it("gives a tied playoff game to the higher seed", () => {
    // Every team scores the same every week: all ties, so seed 1 wins the whole bracket.
    const r = simulateSeason(2025, () => 100);
    expect(r.champion).toBe(r.teams[0].manager);
  });
});

describe("perfect lineups", () => {
  it("never scores a team fewer points than it really did", () => {
    for (const s of seasons) {
      const real = new Map(s.real.teams.map((t) => [t.manager, t.pointsFor]));
      for (const t of s.perfect.teams) expect(t.pointsFor).toBeGreaterThanOrEqual(real.get(t.manager)!);
    }
  });

  it("changes 7 of the 14 titles through 2025", () => {
    expect(past.filter((s) => s.real.champion !== s.perfect.champion).map((s) => s.season)).toEqual([
      2025, 2021, 2019, 2018, 2017, 2015, 2014,
    ]);
    expect(past.find((s) => s.season === 2025)!.perfect.champion).toBe("Blake Kozloski");
  });
});
