import { describe, expect, it } from "vitest";
import { seasonsToRebuild } from "./live";

describe("seasonsToRebuild", () => {
  it("rebuilds a live season until its champion is recorded", () => {
    expect(seasonsToRebuild([2026], [{ season_year: 2025 }])).toEqual([2026]);
    expect(seasonsToRebuild([2026], [{ season_year: 2025 }, { season_year: 2026 }])).toEqual([]);
  });

  it("only skips the finished seasons", () => {
    expect(seasonsToRebuild([2026, 2027], [{ season_year: 2026 }])).toEqual([2027]);
  });
});
