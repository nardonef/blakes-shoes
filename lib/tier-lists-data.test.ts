import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  LEAGUE_TIER_LISTS,
  ARCHIVE_TIER_LISTS,
  formatPostedOn,
  altText,
  tierMovement,
} from "./tier-lists-data";

describe("tierMovement", () => {
  const m = tierMovement();
  const path = (team: string) => m.teams.find((t) => t.team === team)!;

  it("runs weeks oldest to newest", () => {
    expect(m.weeks).toEqual(["Week 6", "Week 7", "Week 8", "Week 9"]);
  });

  it("tracks 12 teams with a rank and tier every week", () => {
    expect(m.teams).toHaveLength(12);
    for (const t of m.teams) {
      expect(t.ranks).toHaveLength(m.weeks.length);
      expect(t.tiers).toHaveLength(m.weeks.length);
    }
  });

  it("uses each rank 1-12 once per week", () => {
    for (let w = 0; w < m.weeks.length; w++) {
      expect(m.teams.map((t) => t.ranks[w]).sort((a, b) => a - b)).toEqual(
        Array.from({ length: 12 }, (_, i) => i + 1),
      );
    }
  });

  it("ranks by position on the image", () => {
    expect(path("The Loose Cannons").ranks).toEqual([3, 1, 1, 1]);
    expect(path("The Hullabaloos").ranks).toEqual([2, 6, 7, 10]);
    expect(path("The Hullabaloos").tiers).toEqual(["Big Dogs", "Watch Out!", "Hopes and Prayers", "GMR's"]);
  });

  it("merges the Jones Crew rename into Jones Crib", () => {
    expect(path("Jones Crib").ranks).toEqual([8, 9, 8, 5]);
    expect(m.teams.some((t) => t.team === "Jones Crew")).toBe(false);
  });

  it("matches Week 9's printed ranks", () => {
    expect(m.teams.map((t) => t.team)).toEqual([
      "The Loose Cannons", "Bryan Yatskos Team", "Wizards of Koz",
      "Post Grad Apartments", "Jones Crib", "Not Popular Boys",
      "Anthony's Nifty Team", "New Crew", "Peter is Corrupt",
      "The Hullabaloos", "All Business Pete", "Brianna Red Carpet",
    ]);
  });

  it("sorts teams by latest rank and lists the latest tier names", () => {
    expect(m.teams[0].team).toBe("The Loose Cannons");
    expect(m.teams[11].team).toBe("Brianna Red Carpet");
    expect(m.tierNames).toEqual(["Big Dogs", "Watch Out!", "Hopes and Prayers", "GMR's"]);
  });
});

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
