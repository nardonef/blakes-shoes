import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  LEAGUE_TIER_LISTS,
  ARCHIVE_TIER_LISTS,
  formatPostedOn,
  altText,
} from "./tier-lists-data";

const ALL = [...LEAGUE_TIER_LISTS, ...ARCHIVE_TIER_LISTS];

describe("tier lists data", () => {
  it("has an image file in public/ for every list", () => {
    for (const l of ALL) expect(existsSync(join(process.cwd(), "public", l.src))).toBe(true);
  });

  it("uses unique slugs", () => {
    expect(new Set(ALL.map((l) => l.slug)).size).toBe(ALL.length);
  });

  it("orders each section newest first", () => {
    for (const list of [LEAGUE_TIER_LISTS, ARCHIVE_TIER_LISTS]) {
      const dates = list.map((l) => l.postedOn);
      expect(dates).toEqual([...dates].sort().reverse());
    }
  });

  it("places all 12 teams exactly once in each league tier list, 3 per tier", () => {
    for (const l of LEAGUE_TIER_LISTS) {
      expect(l.tiers).toHaveLength(4);
      for (const t of l.tiers!) expect(t.teams).toHaveLength(3);
      const teams = l.tiers!.flatMap((t) => t.teams);
      expect(new Set(teams).size).toBe(12);
    }
  });

  it("formats posted dates without timezone drift", () => {
    expect(formatPostedOn("2026-11-03")).toBe("Nov 3, 2026");
  });

  it("builds alt text from the tiers", () => {
    expect(altText(LEAGUE_TIER_LISTS[0])).toContain("Big Dogs: The Loose Cannons");
    expect(altText(ARCHIVE_TIER_LISTS[1])).toBe("Fast Food tier list");
  });
});
