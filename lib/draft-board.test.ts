import { describe, expect, it } from "vitest";
import { getDraftModel } from "./draft-board";
import {
  gradeColor,
  gradeFor,
  historyManagers,
  managerHistory,
  shortName,
  topBusts,
  topRuns,
  topSteals,
} from "./draft-board-view";

const model = getDraftModel();
const season = (y: number) => model.seasons.find((s) => s.year === y)!;
const s2025 = season(2025);

describe("draft model", () => {
  it("covers every season from 2012, newest first", () => {
    const years = model.seasons.map((s) => s.year);
    expect(years.filter((y) => y <= 2025)).toEqual([2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012]);
    expect(years).toEqual([...years].sort((a, b) => b - a));
  });

  it("2025 is 12 columns x 16 rounds and every column has a grade", () => {
    expect(s2025.n).toBe(12);
    expect(s2025.rounds).toBe(16);
    expect(s2025.slots).toHaveLength(12);
    expect(s2025.totals.every((t) => t.grade !== "")).toBe(true);
    expect(new Set(s2025.picks.map((p) => `${p.round}|${p.slot}`)).size).toBe(192);
  });

  it("2012 has 15 rounds", () => {
    expect(season(2012).rounds).toBe(15);
    expect(season(2012).picks).toHaveLength(180);
  });

  it("follows snake order: pick 13 is column 12 of round 2, pick 24 column 1", () => {
    const p = (n: number) => s2025.picks.find((x) => x.pick === n)!;
    expect(p(13)).toMatchObject({ round: 2, slot: 12, label: "2.01" });
    expect(p(24)).toMatchObject({ round: 2, slot: 1, label: "2.12" });
    expect(p(37)).toMatchObject({ round: 4, slot: 12 });
    // Same manager owns a column all the way down.
    for (const x of s2025.picks) expect(x.manager).toBe(s2025.slots[x.slot - 1]);
  });

  it("knows how 2025's first picks turned out", () => {
    expect(s2025.picks[0]).toMatchObject({
      pick: 1, player: "Bijan Robinson", manager: "Blake Kozloski", pos: "RB", kind: "kept", pts: 325.5, finish: 4, value: -3,
    });
    expect(s2025.picks[1]).toMatchObject({
      player: "Saquon Barkley", manager: "Matt Borba", kind: "traded", short: "TRADED WK 4", detail: "to Anthony Bove (wk 4)",
    });
  });

  it("values picks as pick minus finish, with steals and busts per the handoff", () => {
    for (const s of model.seasons) {
      for (const p of s.picks) {
        if (p.finish != null) expect(p.value).toBe(p.pick - p.finish);
        expect(p.steal).toBe(p.value != null && p.value >= 60 && p.finish! <= 60);
        expect(p.bust).toBe(p.round <= 4 && p.finish != null && p.finish >= 100);
      }
    }
  });

  it("rates only QBs, RBs, WRs and TEs, ranked 1..rated", () => {
    for (const s of model.seasons) {
      const rated = s.picks.filter((p) => p.finish != null);
      expect(rated).toHaveLength(s.rated);
      expect(rated.every((p) => ["QB", "RB", "WR", "TE"].includes(p.pos))).toBe(true);
      expect(new Set(rated.map((p) => p.finish))).toEqual(new Set(Array.from({ length: s.rated }, (_, i) => i + 1)));
      for (const p of s.picks.filter((p) => p.pos === "K" || p.pos === "DEF")) {
        expect(p).toMatchObject({ finish: null, value: null, steal: false, bust: false });
      }
    }
  });

  it("no longer lets QBs dominate the steal tags", () => {
    const steals = model.seasons.flatMap((s) => s.picks).filter((p) => p.steal);
    const qbShare = steals.filter((p) => p.pos === "QB").length / steals.length;
    // Raw points gave QBs 36% of steal tags (and kickers 30%); QBs are about 10% of picks.
    expect(qbShare).toBeLessThan(0.3);
    expect(steals.some((p) => p.pos === "RB")).toBe(true);
    expect(steals.some((p) => p.pos === "WR")).toBe(true);
  });

  it("grades by draft points: the top team gets A+, the bottom F", () => {
    const sorted = [...s2025.totals].sort((a, b) => a.rank - b.rank);
    expect(sorted[0].grade).toBe("A+");
    expect(sorted[11].grade).toBe("F");
    expect(sorted[0].pts).toBeGreaterThanOrEqual(sorted[1].pts);
    const own = s2025.picks.filter((p) => p.manager === sorted[0].manager).reduce((a, p) => a + p.pts, 0);
    expect(sorted[0].pts).toBeCloseTo(own, 0);
  });

  it("finds position runs of 4+ consecutive picks", () => {
    for (const s of model.seasons) {
      for (const r of s.runs) {
        expect(r.len).toBeGreaterThanOrEqual(4);
        expect(r.to - r.from + 1).toBe(r.len);
        const inRun = s.picks.filter((p) => p.pick >= r.from && p.pick <= r.to);
        expect(inRun.every((p) => p.pos === r.pos)).toBe(true);
      }
    }
    expect(topRuns(s2025.runs).length).toBeLessThanOrEqual(6);
  });

  it("never shows a raw Yahoo username", () => {
    for (const s of model.seasons) for (const m of s.slots) if (!m.endsWith("(unknown manager)")) expect(m).not.toMatch(/^[a-z]/);
  });
});

describe("views", () => {
  it("lists 10 steals and 10 busts (rounds 1-5) across all seasons", () => {
    const steals = topSteals(model.seasons);
    const busts = topBusts(model.seasons);
    expect(steals).toHaveLength(10);
    expect(busts).toHaveLength(10);
    expect(busts.every((p) => p.round <= 5)).toBe(true);
    expect(steals[0].value!).toBeGreaterThanOrEqual(steals[9].value!);
    expect(busts[0].value!).toBeLessThanOrEqual(busts[9].value!);
    expect(steals.some((p) => p.season === 2019 && p.player === "Lamar Jackson")).toBe(true);
    expect(busts.some((p) => p.season === 2015 && p.player === "Dez Bryant")).toBe(true);
    expect(steals.every((p) => p.pos !== "K" && p.pos !== "DEF")).toBe(true);
  });

  it("builds Blake's draft history", () => {
    expect(historyManagers(model.seasons)).toContain("Blake Kozloski");
    expect(historyManagers(model.seasons).some((m) => m.includes("unknown manager"))).toBe(false);
    const h = managerHistory(model.seasons, "Blake Kozloski");
    expect(h.years.filter((y) => y.year <= 2025)).toHaveLength(14);
    expect(h.years[0].year).toBe(model.seasons[0].year);
    const y2025 = h.years.find((y) => y.year === 2025)!;
    expect(y2025).toMatchObject({ slot: 1 });
    expect(y2025.first?.player).toBe("Bijan Robinson");
    expect(h.bestEver?.value).toBeGreaterThan(0);
  });

  it("formats grades and names", () => {
    expect(gradeFor(1, 12)).toBe("A+");
    expect(gradeFor(12, 12)).toBe("F");
    expect(gradeColor("A-")).toBe("#2D5A3D");
    expect(gradeColor("D+")).toBe("#a3412f");
    expect(shortName("Blake Kozloski")).toBe("Blake K.");
    expect(shortName("MD Celtics (unknown manager)")).toBe("MD Celtics");
  });
});
