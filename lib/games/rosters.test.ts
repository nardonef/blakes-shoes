import { describe, expect, it } from "vitest";
import { buildGameRosters, gameRosters, shortName } from "./rosters";
import { leagueManagers } from "./managers";

describe("shortName", () => {
  it("uses the last name, skipping suffixes", () => {
    expect(shortName("CeeDee Lamb")).toBe("LAMB");
    expect(shortName("Aaron Jones Sr.")).toBe("JONES");
    expect(shortName("Marvin Harrison Jr.")).toBe("HARRISON");
    expect(shortName("Titans")).toBe("TITANS");
  });
});

describe("buildGameRosters", () => {
  const row = (team: string, week: number, slot: string, player: string, points: number | null) => ({ season: 2026, week, team_id: team, slot, player, points });
  const lineup = (team: string, week: number, tag: string, base: number) =>
    [
      ["QB", "Q"],
      ["RB", "R1"],
      ["RB", "R2"],
      ["WR", "W1"],
      ["WR", "W2"],
      ["TE", "T"],
      ["W/R/T", "F"],
      ["K", "K"],
      ["DEF", "D"],
    ].map(([slot, p], i) => row(team, week, slot, `${tag} ${p}`, base + i));
  const managers = new Map([
    ["1", "Alpha Person"],
    ["2", "Beta Person"],
  ]);

  it("takes starters from the latest week and rates them against the other team", () => {
    const rows = [...lineup("1", 1, "a", 10), ...lineup("2", 1, "b", 0), ...lineup("1", 2, "a", 10), ...lineup("2", 2, "b", 0), row("1", 1, "IR", "a hurt", 99)];
    const r = buildGameRosters(rows, managers, 2026);
    expect(r.week).toBe(2);
    expect(r.teams.map((t) => t.manager)).toEqual(["Alpha Person", "Beta Person"]);
    const [a, b] = r.teams;
    expect(a.qb).toEqual({ name: "a Q", short: "Q", ppg: 10, rating: 1 });
    expect(b.qb.rating).toBe(0);
    // RB1 is the higher-scoring RB; WR1 outranks WR2
    expect(a.rb.name).toBe("a R2");
    expect(a.wr1.name).toBe("a W2");
    expect(a.wr2.name).toBe("a W1");
    // WRs are ranked across all four WRs
    expect([a.wr1.rating, a.wr2.rating, b.wr1.rating, b.wr2.rating]).toEqual([1, 0.67, 0.33, 0]);
    expect(a.color).not.toBe(b.color);
  });

  it("skips weeks with no recorded points", () => {
    const rows = [...lineup("1", 1, "a", 10), ...lineup("2", 1, "b", 0), row("1", 0, "BN", "a Q", null)];
    expect(buildGameRosters(rows, managers, 2026).teams[0].qb.ppg).toBe(10);
  });
});

describe("gameRosters (real data)", () => {
  const r = gameRosters();

  it("has every current manager with a full set of starters", () => {
    expect(r.teams.map((t) => t.manager)).toEqual(leagueManagers());
    for (const t of r.teams) {
      for (const p of [t.qb, t.rb, t.wr1, t.wr2, t.te, t.flex, t.k, t.def]) {
        expect(p.name).toBeTruthy();
        expect(p.rating).toBeGreaterThanOrEqual(0);
        expect(p.rating).toBeLessThanOrEqual(1);
      }
    }
  });

  it("matches the week-7 lineup for a known team", () => {
    expect(r.week).toBe(7);
    const frankie = r.teams.find((t) => t.manager === "Frankie Nardone")!;
    expect(frankie.qb.name).toBe("Brock Purdy");
    expect(frankie.k.name).toBe("Will Reichard");
    expect(frankie.def.short).toBe("TITANS");
    expect(frankie.flex.name).toBe("Xavier Worthy");
    expect([frankie.wr1.name, frankie.wr2.name]).toContain("CeeDee Lamb");
  });
});
