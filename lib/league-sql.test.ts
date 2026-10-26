import { afterAll, describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { buildLeagueTables, runSql, stopSqlProcess, MAX_SQL_ROWS, SQL_TIMEOUT_MS } from "./league-sql";

afterAll(() => stopSqlProcess());

type Rows = { rows: Record<string, unknown>[]; truncated: boolean };

describe("buildLeagueTables", () => {
  const t = buildLeagueTables();

  it("has one games row per visible side of every matchup", () => {
    // 1314 matchups x 2 sides, minus the 236 sides played by hidden managers
    expect(t.games).toHaveLength(2392);
    expect(t.games.some((g) => g.manager === "--hidden--")).toBe(false);
  });

  it("resolves aliases and marks hidden opponents", () => {
    expect(t.games.some((g) => g.manager === "efuego93")).toBe(false);
    expect(t.games.some((g) => g.manager === "Eric Rios")).toBe(true);
    expect(t.games.some((g) => g.opponent === "Hidden manager")).toBe(true);
  });

  it("flags current owners", () => {
    expect(t.managers.filter((m) => m.is_current === 1)).toHaveLength(12);
  });

  it("has a lineup whose starters add up to every game score", () => {
    const started = new Map<string, number>();
    for (const l of t.lineups.filter((l) => l.started)) {
      const k = `${l.season}|${l.week}|${l.team}`;
      started.set(k, (started.get(k) ?? 0) + (l.points ?? 0));
    }
    const off = t.games.filter((g) => Math.abs((started.get(`${g.season}|${g.week}|${g.team}`) ?? -1) - g.points) > 0.011);
    expect(off).toEqual([]);
  });

  it("names the manager on both sides of a trade", () => {
    const trade = t.transactions.filter((r) => r.season === 2012 && r.type === "trade" && r.date === "2012-11-14 14:22");
    expect(trade.find((r) => r.player === "Trent Richardson")).toMatchObject({ manager: "Ryan Kaplan", team: "Bear Jews" });
    expect(new Set(trade.map((r) => r.txn)).size).toBe(1);
  });
});

describe("runSql", () => {
  it("answers aggregate questions across every season", async () => {
    const r = (await runSql("SELECT COUNT(*) AS n FROM games WHERE points >= 150")) as Rows;
    expect(r.rows).toEqual([{ n: 51 }]);
  });

  it("finds the most points scored in a loss", async () => {
    const r = (await runSql(
      "SELECT manager, season, week, points FROM games WHERE result = 'L' ORDER BY points DESC LIMIT 1"
    )) as Rows;
    expect(r.rows[0]).toEqual({ manager: "Ryan Kaplan", season: 2023, week: 3, points: 148.46 });
  });

  it("supports grouping by week across all seasons", async () => {
    const r = (await runSql(
      `SELECT SUM(result='W') AS w, SUM(result='L') AS l FROM games
       WHERE manager = 'Frankie Nardone' AND week = 1 AND game_type = 'regular'`
    )) as Rows;
    expect(r.rows).toEqual([{ w: 10, l: 4 }]);
  });

  it("queries weekly lineups by player", async () => {
    const r = (await runSql(
      "SELECT manager, slot, started, points FROM lineups WHERE season = 2012 AND week = 1 AND player = 'Matt Ryan'"
    )) as Rows;
    expect(r.rows).toEqual([{ manager: "Peter Klensch", slot: "QB", started: 1, points: 32.46 }]);
  });

  it("queries draft picks with resolved managers", async () => {
    const r = (await runSql(
      "SELECT round, manager, team, position FROM draft WHERE season = 2025 AND player = 'Bijan Robinson'"
    )) as Rows;
    expect(r.rows).toEqual([{ round: 1, manager: "Blake Kozloski", team: "Wizards of Koz", position: "RB" }]);
    const n = (await runSql("SELECT COUNT(*) AS n FROM draft")) as Rows;
    expect(n.rows).toEqual([{ n: 2676 }]);
  });

  it("caps rows and reports truncation", async () => {
    const r = (await runSql("SELECT * FROM games")) as Rows;
    expect(r.rows).toHaveLength(MAX_SQL_ROWS);
    expect(r.truncated).toBe(true);
  });

  it.each([
    ["insert", "INSERT INTO games (season) VALUES (1)"],
    ["delete", "DELETE FROM games"],
    ["create", "CREATE TABLE x (a)"],
    ["pragma", "PRAGMA table_info(games)"],
    ["attach", "ATTACH DATABASE '/tmp/shoesgpt-attach-test.db' AS z"],
  ])("refuses %s", async (_name, sql) => {
    const r = await runSql(sql);
    expect(r).toHaveProperty("error");
  });

  it("does not create files via ATTACH", async () => {
    await runSql("ATTACH DATABASE '/tmp/shoesgpt-attach-test.db' AS z");
    expect(existsSync("/tmp/shoesgpt-attach-test.db")).toBe(false);
  });

  it("runs only the first statement", async () => {
    await runSql("SELECT 1; DELETE FROM games");
    const r = (await runSql("SELECT COUNT(*) AS n FROM games")) as Rows;
    expect(r.rows).toEqual([{ n: 2392 }]);
  });

  it("returns SQL errors to the caller", async () => {
    const r = await runSql("SELECT nope FROM games");
    expect((r as { error: string }).error).toMatch(/no such column/);
  });

  it(
    "kills a runaway query and recovers on the next one",
    async () => {
      const t0 = Date.now();
      const r = await runSql("WITH RECURSIVE c(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM c) SELECT COUNT(*) FROM c");
      expect((r as { error: string }).error).toMatch(/took longer/);
      expect(Date.now() - t0).toBeLessThan(SQL_TIMEOUT_MS + 1000);

      const next = (await runSql("SELECT COUNT(*) AS n FROM champions")) as Rows;
      expect(next.rows).toEqual([{ n: 14 }]);
    },
    SQL_TIMEOUT_MS + 10_000
  );

  it(
    "doesn't fail other queries queued behind a killed one",
    async () => {
      const runaway = runSql("WITH RECURSIVE c(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM c) SELECT COUNT(*) FROM c");
      const innocent = runSql("SELECT COUNT(*) AS n FROM champions");
      const [r1, r2] = await Promise.all([runaway, innocent]);
      expect((r1 as { error: string }).error).toMatch(/took longer/);
      expect(r2).toEqual({ rows: [{ n: 14 }], truncated: false });
    },
    SQL_TIMEOUT_MS * 2 + 10_000
  );
});
