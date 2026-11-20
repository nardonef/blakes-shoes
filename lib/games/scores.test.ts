import { describe, expect, it } from "vitest";
import { allLeaderboards, formatScore, parseSubmission, scoreKey } from "./scores";
import { leagueManagers } from "./managers";
import { fakeStore } from "./fake-store";

const MANAGERS = ["Frankie Nardone", "Peter Klensch"];

describe("parseSubmission", () => {
  it("accepts a valid score", () => {
    expect(parseSubmission({ game: "kicker", manager: "Peter Klensch", score: 55 }, MANAGERS)).toEqual({
      ok: true,
      game: "kicker",
      manager: "Peter Klensch",
      score: 55,
    });
    expect(parseSubmission({ game: "coach", manager: "Peter Klensch", score: -14 }, MANAGERS).ok).toBe(true);
  });

  it("rejects bad games, managers, non-integers, and out-of-range scores", () => {
    expect(parseSubmission({ game: "golf", manager: "Peter Klensch", score: 1 }, MANAGERS)).toEqual({ ok: false, error: "Invalid score" });
    expect(parseSubmission({ game: "qb", manager: "Tom Brady", score: 1 }, MANAGERS)).toEqual({ ok: false, error: "Unknown manager" });
    expect(parseSubmission({ game: "qb", manager: "Peter Klensch", score: 1.5 }, MANAGERS).ok).toBe(false);
    expect(parseSubmission({ game: "kicker", manager: "Peter Klensch", score: 76 }, MANAGERS)).toEqual({ ok: false, error: "Score out of range" });
    expect(parseSubmission({ game: "run", manager: "Peter Klensch", score: -1 }, MANAGERS).ok).toBe(false);
    expect(parseSubmission(null, MANAGERS).ok).toBe(false);
    expect(parseSubmission({ game: "rivalry", manager: "Peter Klensch", score: 120 }, MANAGERS).ok).toBe(true);
    expect(parseSubmission({ game: "rivalry", manager: "Peter Klensch", score: 121 }, MANAGERS).ok).toBe(false);
  });
});

describe("leaderboards", () => {
  it("keeps each manager's best and sorts best first", async () => {
    const store = fakeStore();
    await store.addIfGreater(scoreKey("qb"), "Peter Klensch", 120);
    await store.addIfGreater(scoreKey("qb"), "Peter Klensch", 80);
    await store.addIfGreater(scoreKey("qb"), "Frankie Nardone", 200);
    const all = await allLeaderboards(store);
    expect(all.qb).toEqual([
      { manager: "Frankie Nardone", score: 200 },
      { manager: "Peter Klensch", score: 120 },
    ]);
    expect(all.kicker).toEqual([]);
  });

  it("formats coach margins with a sign", () => {
    expect(formatScore("coach", 7)).toBe("+7");
    expect(formatScore("coach", -3)).toBe("-3");
    expect(formatScore("qb", 7)).toBe("7");
  });
});

describe("leagueManagers", () => {
  it("returns this season's 12 managers by full name", () => {
    const m = leagueManagers();
    expect(m).toHaveLength(12);
    expect(m).toContain("Frankie Nardone");
    expect(m).toContain("Ryan Jenks");
    expect(m).toContain("Ryan Kaplan");
    expect(new Set(m).size).toBe(12);
  });
});
