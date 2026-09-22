import { describe, it, expect } from "vitest";
import {
  getManagerLegacies,
  getBanners,
  getHeadToHeadMatrix,
  getLeagueTopLineStats,
  CURRENT_OWNERS,
} from "./legacy-data";
import championsData from "@/data/champions.json";
import matchupsData from "@/data/matchups.json";
import type { Champion, Matchup } from "@/types/stats";

const champions = championsData as Champion[];
const matchups = matchupsData as Matchup[];

describe("getManagerLegacies — all-play", () => {
  it("computes a true all-play record for a single-alias manager, cross-checked independently", () => {
    const alias = "Frankie Nardone";
    const byWeek = new Map<string, { manager: string; score: number }[]>();
    matchups.forEach((m) => {
      if (m.matchup_type !== "regular") return;
      const key = `${m.season_year}-${m.week}`;
      const entries = byWeek.get(key) ?? [];
      if (m.team1_score > 0) entries.push({ manager: m.team1_manager, score: m.team1_score });
      if (m.team2_score > 0) entries.push({ manager: m.team2_manager, score: m.team2_score });
      byWeek.set(key, entries);
    });

    let wins = 0;
    let losses = 0;
    let ties = 0;
    byWeek.forEach((entries) => {
      const mine = entries.find((e) => e.manager === alias);
      if (!mine) return;
      entries.forEach((other) => {
        if (other === mine) return;
        if (mine.score > other.score) wins += 1;
        else if (mine.score < other.score) losses += 1;
        else ties += 1;
      });
    });

    const legacy = getManagerLegacies().find((l) => l.owner.name === "Frankie Nardone")!;
    expect(legacy.allPlayWins).toBe(wins);
    expect(legacy.allPlayLosses).toBe(losses);
    expect(legacy.allPlayTies).toBe(ties);
  });

  it("keeps allPlayWinPct within [0, 1] and expectedWins/luck finite for every owner", () => {
    for (const legacy of getManagerLegacies()) {
      expect(legacy.allPlayWinPct).toBeGreaterThanOrEqual(0);
      expect(legacy.allPlayWinPct).toBeLessThanOrEqual(1);
      expect(Number.isFinite(legacy.expectedWins)).toBe(true);
      expect(Number.isFinite(legacy.luck)).toBe(true);
    }
  });
});

describe("getBanners", () => {
  it("returns one row per champions.json entry, newest season first", () => {
    const banners = getBanners();
    expect(banners.length).toBe(champions.length);
    expect(banners[0].year).toBe(Math.max(...champions.map((c) => c.season_year)));
    for (let i = 1; i < banners.length; i++) {
      expect(banners[i - 1].year).toBeGreaterThan(banners[i].year);
    }
  });

  it("resolves the 2025 champion's alias to Tyler Falcone", () => {
    const row = getBanners().find((b) => b.year === 2025);
    expect(row?.champion.name).toBe("Tyler Falcone");
    expect(row?.champion.team).toBe("Jone crib");
  });

  it("finds a non-null top regular-season scorer and correct team count for every season", () => {
    for (const row of getBanners()) {
      expect(row.topScorer).not.toBeNull();
      expect(row.numTeams).toBeGreaterThan(0);
    }
    const row2012 = getBanners().find((b) => b.year === 2012);
    expect(row2012?.numTeams).toBe(12);
  });
});

describe("getHeadToHeadMatrix", () => {
  it("has a null diagonal and one row/column per current owner", () => {
    const { owners, matrix } = getHeadToHeadMatrix();
    expect(owners.length).toBe(CURRENT_OWNERS.length);
    expect(matrix.length).toBe(owners.length);
    owners.forEach((_, i) => {
      expect(matrix[i][i]).toBeNull();
      expect(matrix[i].length).toBe(owners.length);
    });
  });

  it("is symmetric: A's wins vs B equal B's losses vs A", () => {
    const { owners, matrix } = getHeadToHeadMatrix();
    for (let i = 0; i < owners.length; i++) {
      for (let j = 0; j < owners.length; j++) {
        if (i === j) continue;
        const cell = matrix[i][j]!;
        const mirror = matrix[j][i]!;
        expect(cell.wins).toBe(mirror.losses);
        expect(cell.losses).toBe(mirror.wins);
        expect(cell.ties).toBe(mirror.ties);
        expect(cell.games).toBe(mirror.games);
      }
    }
  });

  it("matches the existing bestRival record from getManagerLegacies for the same pairing", () => {
    const { owners, matrix } = getHeadToHeadMatrix();
    const legacies = getManagerLegacies();
    for (const legacy of legacies) {
      if (!legacy.bestRival) continue;
      const i = owners.findIndex((o) => o.name === legacy.owner.name);
      const j = owners.findIndex((o) => o.name === legacy.bestRival!.opponentName);
      const cell = matrix[i][j]!;
      expect(cell.wins).toBe(legacy.bestRival.wins);
      expect(cell.losses).toBe(legacy.bestRival.losses);
      expect(cell.ties).toBe(legacy.bestRival.ties);
    }
  });
});

describe("getLeagueTopLineStats", () => {
  it("counts every season on record", () => {
    expect(getLeagueTopLineStats().seasonsRun).toBe(14);
  });

  it("counts total championships and distinct champions", () => {
    const stats = getLeagueTopLineStats();
    expect(stats.totalChampionships).toBe(champions.length);
    expect(stats.differentChampions).toBe(12);
  });

  it("counts titles won by that season's top regular-season scorer", () => {
    expect(getLeagueTopLineStats().titlesByTopScorer).toBe(2);
  });
});

describe("getManagerLegacies — streaks, margins, and weekly extremes", () => {
  const legacies = getManagerLegacies();
  const byName = (name: string) => legacies.find((l) => l.owner.name === name)!;

  it("finds Peter Klensch's 11-game win streak spanning 2016-2017", () => {
    const streak = byName("Peter Klensch").longestWinStreak;
    expect(streak?.length).toBe(11);
    expect(streak?.startYear).toBe(2016);
    expect(streak?.startWeek).toBe(16);
    expect(streak?.endYear).toBe(2017);
    expect(streak?.endWeek).toBe(10);
  });

  it("finds Eric Rios's 13-game losing streak in 2018, the longest in the league", () => {
    const streak = byName("Eric Rios").longestLossStreak;
    expect(streak?.length).toBe(13);
    expect(streak?.startYear).toBe(2018);
    expect(streak?.endYear).toBe(2018);
    for (const legacy of legacies) {
      expect(legacy.longestLossStreak?.length ?? 0).toBeLessThanOrEqual(13);
    }
  });

  it("counts close (<=3pt) and blowout (>=25pt) games that sum to no more than total games played", () => {
    for (const legacy of legacies) {
      const totalGames = legacy.wins + legacy.losses + legacy.ties;
      expect(legacy.closeGames.wins + legacy.closeGames.losses).toBeLessThanOrEqual(totalGames);
      expect(legacy.blowoutGames.wins + legacy.blowoutGames.losses).toBeLessThanOrEqual(totalGames);
    }
  });

  it("gives Peter Klensch the league's best career point differential", () => {
    const best = [...legacies].sort((a, b) => b.pointDifferential - a.pointDifferential)[0];
    expect(best.owner.name).toBe("Peter Klensch");
  });

  it("counts weeks as the week's top/bottom scorer, cross-checked independently for one manager", () => {
    const alias = "Ryan Curran";
    const byWeek = new Map<string, number[]>();
    matchups.forEach((m) => {
      if (m.matchup_type !== "regular") return;
      const key = `${m.season_year}-${m.week}`;
      const scores = byWeek.get(key) ?? [];
      if (m.team1_score > 0) scores.push(m.team1_score);
      if (m.team2_score > 0) scores.push(m.team2_score);
      byWeek.set(key, scores);
    });
    let top = 0;
    matchups.forEach((m) => {
      if (m.matchup_type !== "regular") return;
      const key = `${m.season_year}-${m.week}`;
      const scores = byWeek.get(key)!;
      const maxScore = Math.max(...scores);
      if (m.team1_manager === alias && m.team1_score === maxScore) top += 1;
      if (m.team2_manager === alias && m.team2_score === maxScore) top += 1;
    });
    expect(byName("Ryan Curran").weeksAsTopScorer).toBe(top);
  });

  it("flags each last-place season as the manager's actual final rank matching that season's team count", () => {
    expect(byName("Ryan Kaplan").lastPlaceSeasons).toEqual([2025]);
    expect(byName("Peter Klensch").lastPlaceSeasons).toEqual([]);
  });

  it("flags missed-playoff seasons only for managers who have ever missed one", () => {
    expect(byName("Ryan Curran").missedPlayoffSeasons.length).toBe(1);
    expect(byName("Peter Klensch").missedPlayoffSeasons).toEqual([]);
  });
});
