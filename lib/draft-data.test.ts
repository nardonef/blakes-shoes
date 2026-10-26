import { describe, expect, it } from "vitest";
import lineupsRaw from "@/data/weekly_lineups.json";
import { getDraftPicks } from "./draft-data";

const picks = getDraftPicks();

describe("draft picks", () => {
  it("covers every pick: 15 rounds in 2012, 16 after, 12 teams", () => {
    const bySeason = new Map<number, number>();
    for (const p of picks) bySeason.set(p.season, (bySeason.get(p.season) ?? 0) + 1);
    expect(bySeason.get(2012)).toBe(180);
    for (let y = 2013; y <= 2025; y++) expect(bySeason.get(y)).toBe(192);
  });

  it("names all but a handful of picks", () => {
    const unresolved = picks.filter((p) => !p.resolved);
    expect(unresolved.length).toBeLessThanOrEqual(4);
    for (const p of unresolved) expect(p.player).toMatch(/^Unknown player/);
  });

  it("names drafted defenses the way the lineups do", () => {
    const defenses = picks.filter((p) => p.position === "DEF");
    expect(defenses.length).toBe(196);
    const lineupDefenseNames = new Set(lineupsRaw.filter((r) => r.slot === "DEF").map((r) => r.player));
    for (const d of defenses) expect(lineupDefenseNames).toContain(d.player);
  });

  it("puts a drafted defense on its drafter's week-1 roster in nearly every case", () => {
    const wk1 = new Set(
      lineupsRaw.filter((r) => r.week === 1 && r.player_id === null).map((r) => `${r.season}|${r.team_id}|${r.player}`),
    );
    const defenses = picks.filter((p) => p.position === "DEF");
    const onRoster = defenses.filter((d) => wk1.has(`${d.season}|${Number(d.teamKey.split(".t.")[1])}|${d.player}`));
    // A few get dropped before week 1; the mapping is wrong if many miss.
    expect(onRoster.length / defenses.length).toBeGreaterThan(0.8);
  });

  it("resolves a known pick: Bijan Robinson to Blake in round 1 of 2025", () => {
    expect(picks.find((p) => p.season === 2025 && p.player === "Bijan Robinson")).toMatchObject({
      round: 1,
      manager: "Blake",
      position: "RB",
    });
  });
});
