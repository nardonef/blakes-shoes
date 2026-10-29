import { describe, expect, it } from "vitest";
import { getPlayers, playerSlug } from "./player-data";

describe("playerSlug", () => {
  it("lowercases, strips punctuation and accents", () => {
    expect(playerSlug("Saquon Barkley")).toBe("saquon-barkley");
    expect(playerSlug("Ja'Marr Chase")).toBe("ja-marr-chase");
    expect(playerSlug("Amon-Ra St. Brown")).toBe("amon-ra-st-brown");
    expect(playerSlug("Travis Etienne Jr.")).toBe("travis-etienne-jr");
  });
});

describe("player history", () => {
  const [saquon] = getPlayers("saquon-barkley");

  it("follows Saquon Barkley's 2025: Matt drafts him, trades him to Anthony in week 4, Anthony to Ryan Curran", () => {
    const s2025 = saquon.stints.filter((s) => s.season === 2025);
    expect(s2025.map((s) => s.manager)).toEqual(["Matt Borba", "Anthony Bove", "Ryan Curran"]);
    expect(s2025[0].acquired.kind).toBe("draft");
    expect(s2025[1]).toMatchObject({ firstWeek: 4, acquired: { kind: "trade" } });
    expect(saquon.draft.find((d) => d.season === 2025)).toMatchObject({ round: 1, pick: 2, manager: "Matt Borba" });
    expect(saquon.trades.some((t) => t.id === "2025-60" && t.to === "Anthony Bove" && t.from === "Matt Borba")).toBe(true);
  });

  it("adds up career totals from the stints", () => {
    expect(saquon.totalPoints).toBeCloseTo(saquon.stints.reduce((a, s) => a + s.points, 0), 0);
    expect(saquon.totalStarts).toBe(saquon.stints.reduce((a, s) => a + s.starts, 0));
    expect(saquon.position).toBe("RB");
    expect(saquon.managers.length).toBeGreaterThanOrEqual(3);
    expect(saquon.seasons[0]).toBeLessThanOrEqual(2018);
  });

  it("keeps team defenses, which have no player id, as one player per team", () => {
    const [pats] = getPlayers("patriots");
    expect(pats.position).toBe("DEF");
    expect(pats.managers.length).toBe(14);
  });

  it("returns nothing for an unknown slug", () => {
    expect(getPlayers("not-a-real-player")).toEqual([]);
  });
});
