import { describe, it, expect } from "vitest";
import {
  getManagerStats,
  getLuckIndex,
  getManagerConsistency,
  getPlayoffStats,
  getHallOfChampions,
  resolveManagerName,
} from "./stats-data";
import { CURRENT_OWNERS } from "./legacy-data";
import championsData from "@/data/champions.json";
import standingsData from "@/data/standings.json";
import type { Champion, Standing } from "@/types/stats";

describe("resolveManagerName", () => {
  it("maps an account name to the person's full name", () => {
    expect(resolveManagerName("efuego93")).toBe("Eric Rios");
    expect(resolveManagerName("eric")).toBe("Eric Rios");
    expect(resolveManagerName("tyler")).toBe("Tyler Falcone");
    expect(resolveManagerName("Chris")).toBe("Chris Zolner");
  });

  it("passes through full names and unknown names unchanged", () => {
    expect(resolveManagerName("Eric Rios")).toBe("Eric Rios");
    expect(resolveManagerName("someone new")).toBe("someone new");
  });
});

describe("account merging across stats aggregators", () => {
  const rawAccounts = [...new Set((standingsData as Standing[]).map((s) => s.manager_name))].filter(
    (n) => resolveManagerName(n) !== n,
  );

  it("getManagerStats has one row per person and none under a raw account name", () => {
    const stats = getManagerStats();
    expect(new Set(stats.map((s) => s.manager)).size).toBe(stats.length);
    for (const owner of CURRENT_OWNERS) expect(stats.filter((s) => s.manager === owner.name)).toHaveLength(1);
    for (const account of rawAccounts) expect(stats.find((s) => s.manager === account)).toBeUndefined();
  });

  it("getLuckIndex, getManagerConsistency, and getPlayoffStats never key on a raw account name", () => {
    for (const list of [getLuckIndex(), getManagerConsistency(), getPlayoffStats()]) {
      for (const account of rawAccounts) {
        expect(list.find((r) => r.manager === account)).toBeUndefined();
      }
    }
  });

  it("John Cox's totals include both accounts and his hidden 2017 season", () => {
    const rows = (standingsData as Standing[]).filter(
      (s) => ["John", "john"].includes(s.manager_name) || (s.season_year === 2017 && s.team_name === "Cam Shoopton"),
    );
    expect(rows).toHaveLength(9);
    const john = getManagerStats().find((s) => s.manager === "John Cox");
    expect(john?.totalWins).toBe(rows.reduce((a, s) => a + s.wins, 0));
    expect(john?.totalLosses).toBe(rows.reduce((a, s) => a + s.losses, 0));
  });

  it("Eric Rios's merged win/loss totals equal the sum of his two aliases' raw standings rows", () => {
    const standings = standingsData as Standing[];
    const ericAliasRows = standings.filter((s) =>
      ["eric", "efuego93"].includes(s.manager_name)
    );
    const expectedWins = ericAliasRows.reduce((a, s) => a + s.wins, 0);
    const expectedLosses = ericAliasRows.reduce((a, s) => a + s.losses, 0);
    const merged = getManagerStats().find((s) => s.manager === "Eric Rios");
    expect(merged?.totalWins).toBe(expectedWins);
    expect(merged?.totalLosses).toBe(expectedLosses);
  });
});

describe("getHallOfChampions", () => {
  const champions = championsData as Champion[];

  it("returns exactly one row per champions.json entry, no duplicates or omissions", () => {
    const rows = getHallOfChampions();
    expect(rows.length).toBe(champions.length);
    const years = rows.map((r) => r.year).sort((a, b) => a - b);
    const expectedYears = champions.map((c) => c.season_year).sort((a, b) => a - b);
    expect(years).toEqual(expectedYears);
  });

  it("resolves the 2025 champion's alias to Tyler Falcone", () => {
    const row2025 = getHallOfChampions().find((r) => r.year === 2025);
    expect(row2025?.manager).toBe("Tyler Falcone");
    expect(row2025?.team).toBe("Jone crib");
  });

  it("is sorted newest season first", () => {
    const years = getHallOfChampions().map((r) => r.year);
    expect(years).toEqual([...years].sort((a, b) => b - a));
  });
});
