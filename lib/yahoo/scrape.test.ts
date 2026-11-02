import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

// The scraper is pasted into a Yahoo tab, so it can't be imported; load the real file in a sandbox.
// With no `window` it only defines its helpers.
const ctx: { finishedWeeks?: (year: number, played: number[], now: number) => number } = {};
runInNewContext(readFileSync("scripts/yahoo-scrape.browser.js", "utf8"), ctx);
const finishedWeeks = ctx.finishedWeeks!;
const at = (iso: string) => Date.parse(iso);

describe("scraper finishedWeeks", () => {
  it("defines the helper without starting a scrape outside the browser", () => {
    expect(typeof finishedWeeks).toBe("function");
  });

  it("follows team records during the regular season", () => {
    // Sunday of week 8, 2026: everyone has played 7.
    expect(finishedWeeks(2026, Array(12).fill(7), at("2026-11-01T20:00Z"))).toBe(7);
    expect(finishedWeeks(2026, [0, 0], at("2026-08-20T12:00Z"))).toBe(0);
  });

  it("counts a week done from the Wednesday after it", () => {
    expect(finishedWeeks(2026, [0], at("2026-09-16T05:00Z"))).toBe(0);
    expect(finishedWeeks(2026, [0], at("2026-09-16T07:00Z"))).toBe(1);
  });

  it("keeps counting playoff weeks after records stop at 14 games", () => {
    expect(finishedWeeks(2026, Array(12).fill(14), at("2026-12-16T07:00Z"))).toBe(14);
    expect(finishedWeeks(2026, Array(12).fill(14), at("2026-12-23T07:00Z"))).toBe(15);
    expect(finishedWeeks(2026, Array(12).fill(14), at("2027-01-06T07:00Z"))).toBe(17);
  });

  it("uses the fewest games played when a team is behind", () => {
    expect(finishedWeeks(2026, [7, 7, 6], at("2026-10-27T12:00Z"))).toBe(6);
  });
});
