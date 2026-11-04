import { describe, expect, it } from "vitest";
import { getMidseason } from "./midseason-data";

// Only exists while a season is in progress; the live numbers change every refresh, so these check
// invariants. The history comes from finished seasons and is pinned.
const m = getMidseason();

describe.runIf(m)("midseason report", () => {
  const r = m!;

  it("has every team with a record that adds up to the weeks played", () => {
    expect(r.teams).toHaveLength(12);
    expect(r.teams.map((t) => t.rank)).toEqual([...r.teams.map((t) => t.rank)].sort((a, b) => a - b));
    for (const t of r.teams) expect(t.wins + t.losses + t.ties).toBe(r.week);
  });

  it("computes all-play from the weekly scores: the league's all-play wins equal its losses", () => {
    const w = r.teams.reduce((a, t) => a + t.allPlayWins, 0);
    const l = r.teams.reduce((a, t) => a + t.allPlayLosses, 0);
    expect(w).toBe(l);
    for (const t of r.teams) expect(t.allPlayWins + t.allPlayLosses).toBeLessThanOrEqual(11 * r.week);
  });

  it("keeps FAAB within the $100 budget and lineup efficiency within 0-100%", () => {
    for (const t of r.teams) {
      expect(t.faabLeft).toBeGreaterThanOrEqual(0);
      expect(t.faabLeft).toBeLessThanOrEqual(100);
      expect(t.efficiency).toBeGreaterThan(0);
      expect(t.efficiency).toBeLessThanOrEqual(1);
    }
  });

  it("builds history from 2012-2025: 168 teams, 88 playoff spots, 14 titles", () => {
    const sum = (k: "teams" | "playoffs" | "titles") => r.historyByWins.reduce((a, h) => a + h[k], 0);
    expect(sum("teams")).toBe(168);
    expect(sum("playoffs")).toBe(88);
    expect(sum("titles")).toBe(14);
  });

  it("knows a 7-0 start has gone 3 for 3 on playoffs and 0 for 3 on titles", () => {
    if (r.week !== 7) return;
    expect(r.historyByWins.find((h) => h.wins === 7)).toEqual({ wins: 7, teams: 3, playoffs: 3, titles: 0 });
  });

  it("writes storylines and picks real games for the game records", () => {
    expect(r.storylines.length).toBeGreaterThanOrEqual(5);
    expect(r.topScore.points).toBeGreaterThanOrEqual(r.lowScore.points);
    expect(r.blowout.points).toBeGreaterThan(r.blowout.opponentPoints);
    expect(r.closest.points).toBeGreaterThan(r.closest.opponentPoints);
  });
});
