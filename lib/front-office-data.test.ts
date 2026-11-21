import { afterAll, describe, expect, it } from "vitest";
import { getFrontOffice } from "./front-office-data";
import { runSql, stopSqlProcess } from "./league-sql";
import { getAllTrades, getSeasonModel } from "./rosters-data";

afterAll(() => stopSqlProcess());

const fo = getFrontOffice();
const top10 = fo.waiver.pickups.slice(0, 10);

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
    expect(top10).toHaveLength(10);
    expect(top10[0]).toMatchObject({ season: 2018, manager: "Blake Kozloski", player: "Patrick Mahomes", pos: "QB" });
    expect(fo.waiver.pickups.map((p) => p.aboveAvg)).toEqual([...fo.waiver.pickups.map((p) => p.aboveAvg)].sort((a, b) => b - a));
    for (const p of fo.waiver.pickups) {
      expect(p.aboveAvg).toBeGreaterThan(0);
      expect(p.starts).toBeGreaterThan(0);
      expect(p.pos).not.toBe("");
    }
  });

  it("no longer lets quarterbacks crowd out every other position", () => {
    const qbs = top10.filter((p) => p.pos === "QB").length;
    expect(qbs).toBeLessThanOrEqual(3);
    expect(new Set(top10.map((p) => p.pos)).size).toBeGreaterThanOrEqual(3);
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
    const mahomes = top10[0];
    const expected = r.rows
      .filter((row) => row.player === "Patrick Mahomes" && row.manager === "Blake Kozloski" && (row.week as number) >= mahomes.week)
      .reduce((a, row) => a + (row.pts as number) - median(byWeek.get(row.week as number)!), 0);
    expect(mahomes.aboveAvg).toBeCloseTo(expected, 0);
  });

  it("only rates managers who spent at least $50 of FAAB", () => {
    expect(fo.waiver.spending.length).toBeGreaterThan(5);
    for (const f of fo.waiver.spending) {
      expect(f.spent).toBeGreaterThanOrEqual(50);
      expect(f.perDollar).toBeCloseTo(f.points / f.spent, 1);
    }
  });
});

describe("waiver wire report", () => {
  const w = fo.waiver;

  it("starts FAAB in 2022 and never shows a bid over the $100 budget", () => {
    expect(w.faabSince).toBe(2022);
    for (const h of w.spending) {
      expect(h.biggest.faab).toBeLessThanOrEqual(100);
      expect(h.perSeason).toBeLessThanOrEqual(100);
      expect(h.avgBid).toBe(Math.round((h.spent / h.bids) * 10) / 10);
    }
  });

  it("ranks best bids by value and only includes paid bids", () => {
    expect(w.bestBids[0]).toMatchObject({ season: 2023, manager: "Ryan Curran", player: "Kyren Williams", faab: 12 });
    for (const b of w.bestBids) expect(b.faab).toBeGreaterThan(0);
  });

  it("lists the biggest bids on players who never beat a typical starter", () => {
    expect(w.worstBids[0]).toMatchObject({ season: 2023, manager: "Eric Rios", player: "Khalil Shakir", faab: 100, starts: 0 });
    for (const b of w.worstBids) expect(b.aboveAvg).toBeLessThanOrEqual(0);
    expect(w.worstBids.map((b) => b.faab)).toEqual([...w.worstBids.map((b) => b.faab)].sort((a, b) => b - a));
  });
});

describe("most lopsided trades", () => {
  const ids = new Set(getAllTrades().map((t) => t.id));

  it("lists 10 real trades, biggest gap first, gap = winner minus loser", () => {
    expect(fo.lopsided).toHaveLength(10);
    expect(fo.lopsided.map((t) => t.margin)).toEqual([...fo.lopsided.map((t) => t.margin)].sort((a, b) => b - a));
    for (const t of fo.lopsided) {
      expect(ids.has(t.id)).toBe(true);
      expect(t.margin).toBeCloseTo(t.winner.total - t.loser.total, 0);
      for (const p of [...t.winner.players, ...t.loser.players]) expect(p).not.toBe("");
    }
  });

  it("is led by Ryan Curran's 2014 Jordy Nelson + Arian Foster trade with Anthony Bove", () => {
    expect(fo.lopsided[0]).toMatchObject({
      id: "2014-52",
      winner: { manager: "Ryan Curran", players: ["Jordy Nelson", "Arian Foster"] },
      loser: { manager: "Anthony Bove" },
    });
  });
});

describe("trade values", () => {
  const trades = getAllTrades();

  it("credits Arian Foster's 2014 points to Curran's September trade only, not the reversed August one", () => {
    const foster = (id: string) => trades.find((t) => t.id === id)!.sides.flatMap((s) => s.gets).find((g) => g.player === "Arian Foster")!;
    expect(foster("2014-26").pts).toBe(0);
    expect(foster("2014-52").pts).toBeGreaterThan(200);
  });

  it("never credits a manager with more of a player's points than his trades could add up to", () => {
    // Points a manager is credited for a player across all their trades in a season can't exceed
    // what that player scored in the manager's starting lineup that season.
    const credited = new Map<string, number>();
    for (const t of trades) {
      for (const s of t.sides) {
        for (const g of s.gets) {
          const k = `${t.season}|${s.mgr}|${g.player}`;
          credited.set(k, (credited.get(k) ?? 0) + g.pts);
        }
      }
    }
    const over: string[] = [];
    for (const [k, pts] of credited) {
      const [season, mgr, player] = k.split("|");
      const S = getSeasonModel(Number(season))!;
      let actual = 0;
      for (const rows of S.by.get(mgr)?.values() ?? []) for (const r of rows) if (r.player === player && r.started) actual += r.points ?? 0;
      if (pts > actual + 0.01) over.push(`${k}: ${pts} > ${actual}`);
    }
    expect(over).toEqual([]);
  });
});
