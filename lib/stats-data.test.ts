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
  it("maps a known alias to the current owner's display name", () => {
    expect(resolveManagerName("efuego93")).toBe("Eric Rios");
    expect(resolveManagerName("eric")).toBe("Eric Rios");
    expect(resolveManagerName("tyler")).toBe("Tyler Falcone");
  });

  it("passes through names with no alias match unchanged", () => {
    expect(resolveManagerName("Chris")).toBe("Chris");
  });
});

describe("alias merging across stats aggregators", () => {
  const aliasedOwners = CURRENT_OWNERS.filter((o) => o.aliases.length > 1);

  it("getManagerStats has exactly one row per current owner with multiple aliases, none under a raw alias", () => {
    const stats = getManagerStats();
    for (const owner of aliasedOwners) {
      const rowsForOwner = stats.filter((s) => s.manager === owner.name);
      expect(rowsForOwner.length).toBe(1);
      for (const alias of owner.aliases) {
        if (alias === owner.name) continue;
        expect(stats.find((s) => s.manager === alias)).toBeUndefined();
      }
    }
  });

  it("getLuckIndex, getManagerConsistency, and getPlayoffStats never key on a raw alias for a merged owner", () => {
    const rawAliases = aliasedOwners.flatMap((o) =>
      o.aliases.filter((a) => a !== o.name)
    );
    for (const list of [getLuckIndex(), getManagerConsistency(), getPlayoffStats()]) {
      for (const alias of rawAliases) {
        expect(list.find((r) => r.manager === alias)).toBeUndefined();
      }
    }
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
