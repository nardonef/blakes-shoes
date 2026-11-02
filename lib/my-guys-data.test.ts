import { describe, expect, it } from "vitest";
import { CURRENT_OWNERS } from "./legacy-data";
import { getMyGuys, type GuyCategory } from "./my-guys-data";

const all = getMyGuys();
const of = (name: string) => all.find((g) => g.manager === name)!;
const CATEGORIES: GuyCategory[] = ["starts", "points", "weeks"];

describe("my guys", () => {
  it("has three guys in each category for every current owner", () => {
    expect(all.map((g) => g.manager)).toEqual(CURRENT_OWNERS.map((o) => o.name));
    for (const g of all) for (const c of CATEGORIES) expect(g.top[c]).toHaveLength(3);
  });

  it("orders each category by its own measure", () => {
    for (const g of all) {
      for (const c of CATEGORIES) {
        const values = g.top[c].map((x) => x[c]);
        expect(values).toEqual([...values].sort((a, b) => b - a));
      }
    }
  });

  it("finds the known guys of finished careers", () => {
    // Players long gone from the league, so these can't change.
    expect(of("Blake Kozloski").top.starts[0].player).toBe("Le'Veon Bell");
    expect(of("Frankie Nardone").top.points[0].player).toBe("Antonio Brown");
    expect(of("Matt Borba").top.weeks[0]).toMatchObject({ player: "Justin Tucker", pos: "K" });
  });

  it("counts a starter's points only when he started", () => {
    for (const g of all) {
      for (const guy of g.top.points) {
        expect(guy.starts).toBeLessThanOrEqual(guy.weeks);
        if (guy.starts === 0) expect(guy.points).toBe(0);
      }
    }
  });
});
