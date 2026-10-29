import { describe, expect, it } from "vitest";
import { getChampionBuilds } from "./champions-built-data";
import { getSeasonModel } from "./rosters-data";

const builds = getChampionBuilds();

describe("how champions were built", () => {
  it("covers every champion with lineup data, newest first", () => {
    expect(builds.length).toBeGreaterThanOrEqual(12);
    expect(builds[0].season).toBe(2025);
    expect(builds.map((b) => b.season)).toEqual([...builds.map((b) => b.season)].sort((a, b) => b - a));
  });

  it("splits all of the champion's starting points across the four sources", () => {
    for (const b of builds) {
      const sum = b.points.draft + b.points.waiver + b.points.fa + b.points.trade;
      expect(sum).toBeCloseTo(b.total, 0);
      const S = getSeasonModel(b.season)!;
      let started = 0;
      for (const rows of S.by.get(b.manager)!.values()) for (const r of rows) if (r.started) started += r.points ?? 0;
      expect(b.total).toBeCloseTo(started, 0);
    }
  });

  it("knows the 2025 title team leaned on pickups more than most", () => {
    const b2025 = builds.find((b) => b.season === 2025)!;
    expect(b2025.manager).toBe("Tyler Falcone");
    expect(b2025.points.draft / b2025.total).toBeCloseTo(0.62, 1);
    expect(b2025.topAdd).not.toBeNull();
    expect(b2025.topAdd!.kind).not.toBe("draft");
  });
});
