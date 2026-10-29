import { describe, expect, it } from "vitest";
import { getWrapped, wrappedManagers, wrappedSeasons } from "./wrapped-data";

describe("wrapped", () => {
  it("lists known managers and the seasons each played", () => {
    expect(wrappedManagers()).toContain("Blake Kozloski");
    expect(wrappedManagers().some((m) => m.includes("unknown manager"))).toBe(false);
    expect(wrappedSeasons("Blake Kozloski")).toHaveLength(14);
    expect(wrappedSeasons("Tyler Falcone")).toEqual([2025, 2024]);
  });

  it("builds Tyler Falcone's 2025 title season", () => {
    const w = getWrapped("Tyler Falcone", 2025)!;
    expect(w.finish).toMatchObject({ rank: 1, champion: true });
    expect(w.draft?.grade).toMatch(/^[A-F]/);
    expect(w.draft?.first?.round).toBe(1);
    expect(w.mvp?.points).toBeGreaterThan(0);
    expect(w.bestWeek!.points).toBeGreaterThanOrEqual(w.worstWeek!.points);
    expect(w.pickup).not.toBeNull();
  });

  it("matches the trade and luck numbers shown elsewhere", () => {
    // Anthony Bove 2021: the luckiest season in league history (went 9-5, deserved 5.5).
    const a = getWrapped("Anthony Bove", 2021)!;
    expect(a.luck).toMatchObject({ wins: 9, losses: 5 });
    expect(a.luck!.luck).toBeGreaterThan(3);
    // Matt Borba 2025 won the Puka Nacua trade.
    const m = getWrapped("Matt Borba", 2025)!;
    expect(m.trades.won).toBeGreaterThanOrEqual(1);
  });

  it("finds the costliest benching and counts winnable losses", () => {
    const w = getWrapped("Blake Kozloski", 2025)!;
    expect(w.lineups!.efficiency).toBeGreaterThan(0.6);
    expect(w.lineups!.efficiency).toBeLessThanOrEqual(1);
    expect(w.lineups!.worst!.left).toBeGreaterThan(0);
    expect(w.lineups!.couldaWon).toBeGreaterThanOrEqual(0);
  });

  it("returns null for a manager who didn't play that season", () => {
    expect(getWrapped("Tyler Falcone", 2012)).toBeNull();
  });
});
