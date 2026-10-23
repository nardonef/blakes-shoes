import { afterAll, describe, expect, it } from "vitest";
import { getFrontOffice } from "./front-office-data";
import { runSql, stopSqlProcess } from "./league-sql";
import { getAllTrades } from "./rosters-data";

afterAll(() => stopSqlProcess());

const fo = getFrontOffice();

describe("trade records", () => {
  it("are zero-sum across the league and count every side", () => {
    const sides = getAllTrades().flatMap((t) => t.sides).filter((s) => !s.mgr.endsWith("(unknown manager)"));
    expect(fo.trades.reduce((a, r) => a + r.trades, 0)).toBe(sides.length);
    for (const r of fo.trades) expect(r.wins + r.losses).toBeLessThanOrEqual(r.trades);
    // Only trades with a hidden-manager side keep the league total from being exactly zero.
    const hiddenSides = getAllTrades().filter((t) => t.sides.some((s) => s.mgr.endsWith("(unknown manager)")));
    const hiddenNet = hiddenSides.reduce((a, t) => {
      const known = t.sides.find((s) => !s.mgr.endsWith("(unknown manager)"));
      const other = t.sides.find((s) => s !== known)!;
      return known ? a + known.total - other.total : a;
    }, 0);
    expect(fo.trades.reduce((a, r) => a + r.net, 0)).toBeCloseTo(hiddenNet, 0);
  });

  it("credits the 2025 Puka trade to Matt Borba", () => {
    const t = getAllTrades().find((x) => x.id === "2025-60")!;
    const matt = t.sides.find((s) => s.mgr === "Matt Borba")!;
    expect(matt.won).toBe(true);
    expect(fo.trades.find((r) => r.manager === "Matt Borba")!.wins).toBeGreaterThanOrEqual(1);
    expect(fo.trades.map((r) => r.net)).toEqual([...fo.trades.map((r) => r.net)].sort((a, b) => b - a));
  });
});

describe("projection beat", () => {
  it("matches a direct SQL sum, counting a starter who didn't play as 0 points", async () => {
    const peter = fo.projections.find((p) => p.manager === "Peter Klensch")!;
    const r = (await runSql(
      "SELECT ROUND(SUM(COALESCE(points, 0) - projected), 1) AS total FROM lineups WHERE started = 1 AND manager = 'Peter Klensch'"
    )) as { rows: Record<string, unknown>[] };
    expect(peter.total).toBeCloseTo(r.rows[0].total as number, 0);
    expect(peter.perWeek).toBeCloseTo(peter.total / peter.weeks, 1);
  });

  it("leaves out short tenures and hidden managers", () => {
    for (const p of fo.projections) {
      expect(p.weeks).toBeGreaterThanOrEqual(26);
      expect(p.manager).not.toMatch(/unknown manager/);
    }
  });
});

describe("pickups and FAAB", () => {
  it("ranks the top 10 pickups by points above a typical starter at their position", () => {
    expect(fo.pickups).toHaveLength(10);
    expect(fo.pickups[0]).toMatchObject({ season: 2018, manager: "Blake Kozloski", player: "Patrick Mahomes", pos: "QB" });
    expect(fo.pickups.map((p) => p.aboveAvg)).toEqual([...fo.pickups.map((p) => p.aboveAvg)].sort((a, b) => b - a));
    for (const p of fo.pickups) {
      expect(p.starts).toBeGreaterThan(0);
      expect(p.pos).not.toBe("");
    }
  });

  it("no longer lets quarterbacks crowd out every other position", () => {
    const qbs = fo.pickups.filter((p) => p.pos === "QB").length;
    expect(qbs).toBeLessThanOrEqual(3);
    expect(new Set(fo.pickups.map((p) => p.pos)).size).toBeGreaterThanOrEqual(3);
  });

  it("matches Mahomes' 2018 value computed straight from the SQL tables", async () => {
    // runSql caps results at 100 rows and 2018 has 192 QB starts, so fetch it in two 96-row halves.
    const rows: Record<string, unknown>[] = [];
    for (const [lo, hi] of [[1, 8], [9, 16]]) {
      const r = (await runSql(
        `SELECT week, manager, player, COALESCE(points, 0) AS pts FROM lineups
         WHERE season = 2018 AND slot = 'QB' AND started = 1 AND week BETWEEN ${lo} AND ${hi}`
      )) as { rows: Record<string, unknown>[]; truncated: boolean };
      expect(r.truncated).toBe(false);
      rows.push(...r.rows);
    }
    const r = { rows };
    const byWeek = new Map<number, number[]>();
    for (const row of r.rows) byWeek.set(row.week as number, [...(byWeek.get(row.week as number) ?? []), row.pts as number]);
    const median = (xs: number[]) => {
      const s = [...xs].sort((a, b) => a - b);
      return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
    };
    const mahomes = fo.pickups[0];
    const expected = r.rows
      .filter((row) => row.player === "Patrick Mahomes" && row.manager === "Blake Kozloski" && (row.week as number) >= mahomes.week)
      .reduce((a, row) => a + (row.pts as number) - median(byWeek.get(row.week as number)!), 0);
    expect(mahomes.aboveAvg).toBeCloseTo(expected, 0);
  });

  it("only rates managers who spent at least $50 of FAAB", () => {
    expect(fo.faab.length).toBeGreaterThan(5);
    for (const f of fo.faab) {
      expect(f.spent).toBeGreaterThanOrEqual(50);
      expect(f.perDollar).toBeCloseTo(f.points / f.spent, 1);
    }
  });
});
