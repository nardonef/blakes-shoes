import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseDraftResults,
  parseMatchup,
  parseMatchupHeader,
  parseStandings,
  parseTransactions,
  parseYahooDate,
} from "./parse";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");

describe("parseYahooDate", () => {
  it("uses the season year for Aug-Dec and the next year for Jan-Jul", () => {
    expect(parseYahooDate("Dec 16, 11:53 am", 2012)).toBe("2012-12-16 11:53");
    expect(parseYahooDate("Jan 2, 12:05 am", 2012)).toBe("2013-01-02 00:05");
    expect(parseYahooDate("Aug 30, 12:15 pm", 2012)).toBe("2012-08-30 12:15");
  });

  it("rejects text it does not recognise", () => {
    expect(() => parseYahooDate("yesterday", 2012)).toThrow(/Unrecognised/);
  });
});

describe("parseMatchup (2012 week 1, team 1 vs team 2)", () => {
  const rows = parseMatchup(fixture("mu-2012-w1-1-2.html"), 2012, 1);
  const starters = (team: number) => rows.filter((r) => r.team_id === team && r.slot !== "BN");
  const sum = (xs: { points: number | null }[]) => Math.round(xs.reduce((s, r) => s + (r.points ?? 0), 0) * 100) / 100;

  it("reads both lineups, starters and bench", () => {
    expect(starters(1)).toHaveLength(9);
    expect(starters(2)).toHaveLength(9);
    expect(rows.filter((r) => r.slot === "BN")).toHaveLength(12);
  });

  it("puts points and projections on the right side", () => {
    expect(rows).toContainEqual({
      season: 2012, week: 1, team_id: 1, slot: "QB",
      player: "Matt Ryan", player_id: "8780", points: 32.46, projected: 15.6,
    });
    expect(rows.find((r) => r.player === "Peyton Manning")).toMatchObject({ team_id: 2, points: 20.42, projected: 15.37 });
  });

  it("starter points add up to the matchup score", () => {
    expect(sum(starters(1))).toBe(122.76);
    expect(sum(starters(2))).toBe(76.22);
  });

  it("treats a dash as no points and keeps team defenses without a player id", () => {
    const titans = rows.find((r) => r.player.includes("Titans"));
    expect(titans).toMatchObject({ team_id: 1, slot: "BN", points: null, player_id: null });
  });
});

describe("parseTransactions (2012 page 2)", () => {
  const rows = parseTransactions(fixture("tx-2012-25.html"), 2012);

  it("groups both sides of a trade under one transaction", () => {
    const richardson = rows.find((r) => r.player === "Trent Richardson")!;
    const freeman = rows.find((r) => r.player === "Josh Freeman")!;
    expect(richardson).toMatchObject({ type: "trade", team_id: 3, date: "2012-11-14 14:22", player_id: "25713", position: "RB" });
    expect(freeman).toMatchObject({ type: "trade", team_id: 5, txn: richardson.txn });
  });

  it("reads adds and drops with their source and team", () => {
    expect(rows.filter((r) => r.type !== "trade").every((r) => r.detail && r.team_id > 0)).toBe(true);
    expect(rows.some((r) => r.type === "add")).toBe(true);
    expect(rows.some((r) => r.type === "drop")).toBe(true);
    expect(new Set(rows.map((r) => r.txn)).size).toBe(25);
  });
});

describe("live-season fragments (2026)", () => {
  it("reads both teams, managers and final scores from a matchup header", () => {
    const { left, right } = parseMatchupHeader(fixture("mu-2026-w1-1-10.html"));
    expect(left).toEqual({ team_id: 1, team: "All Business Pete", manager: "Peter", score: 75.92 });
    expect(right).toEqual({ team_id: 10, team: "The Hullabaloos", manager: "efuego93", score: 166.06 });
  });

  it("matches the 2026 lineup tables to the header scores", () => {
    const rows = parseMatchup(fixture("mu-2026-w1-1-10.html"), 2026, 1);
    const started = (team: number) =>
      Math.round(rows.filter((r) => r.team_id === team && r.slot !== "BN" && r.slot !== "IR").reduce((a, r) => a + (r.points ?? 0), 0) * 100) / 100;
    expect(started(1)).toBe(75.92);
    expect(started(10)).toBe(166.06);
  });

  it("reads all 12 standings rows", () => {
    const st = parseStandings(fixture("st-2026.html"));
    expect(st).toHaveLength(12);
    expect(st[0]).toMatchObject({ rank: 1, team_id: 7, team: "Loose Cannons", wins: 7, losses: 0, ties: 0, points_for: 811.18, streak: "W-7" });
    expect(new Set(st.map((s) => s.team_id)).size).toBe(12);
    expect(st.map((s) => s.rank)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
  });

  it("reads every draft pick in round order", () => {
    const dr = parseDraftResults(fixture("dr-2026.html"));
    expect(dr).toHaveLength(180);
    expect(dr[0]).toEqual({
      round: 1, pick_in_round: 1, player: "Christian McCaffrey", player_id: "30121",
      nfl_team: "SF", position: "RB", team: "Anthony's Nifty Team",
    });
    expect(Math.max(...dr.map((d) => d.round))).toBe(15);
    expect(dr.every((d) => d.pick_in_round >= 1 && d.pick_in_round <= 12 && d.team)).toBe(true);
  });
});
