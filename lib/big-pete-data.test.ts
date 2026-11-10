import { describe, it, expect } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DRAFT_ORDER_VIDEOS, BONUS_VIDEOS, videoSrc, posterSrc, formatDuration } from "./big-pete-data";

const ALL = [...DRAFT_ORDER_VIDEOS, ...BONUS_VIDEOS];

const DIR = join(process.cwd(), "public", "big-pete");

describe("big pete draft order data", () => {
  it("has an announcement for every draft season 2016-2026", () => {
    const seasons = [...new Set(DRAFT_ORDER_VIDEOS.map((v) => v.season))];
    expect(seasons).toEqual(Array.from({ length: 11 }, (_, i) => 2026 - i));
    expect(DRAFT_ORDER_VIDEOS).toHaveLength(12);
  });

  it("dates each video within its season and names files by that date", () => {
    for (const v of DRAFT_ORDER_VIDEOS) {
      expect(v.date.startsWith(String(v.season))).toBe(true);
      expect(v.slug.startsWith(v.date)).toBe(true);
    }
  });

  it("labels 2025's two-parter, later part first", () => {
    const parts = DRAFT_ORDER_VIDEOS.filter((v) => v.part).map((v) => [v.season, v.part]);
    expect(parts).toEqual([
      [2025, "Part 2"],
      [2025, "Part 1"],
    ]);
  });

  it("has a video and poster for every entry and no unlisted videos", () => {
    for (const v of ALL) {
      expect(existsSync(join(process.cwd(), "public", videoSrc(v)))).toBe(true);
      expect(existsSync(join(process.cwd(), "public", posterSrc(v)))).toBe(true);
    }
    const files = readdirSync(DIR).filter((f) => f.endsWith(".mp4")).sort();
    expect(files).toEqual(ALL.map((v) => `${v.slug}.mp4`).sort());
  });

  it("keeps four bonus clips, newest first, separate from the season list", () => {
    expect(BONUS_VIDEOS.map((v) => v.date)).toEqual(["2026-03-29", "2024-09-27", "2018-06-08", "2018-05-27"]);
    expect(BONUS_VIDEOS.map((v) => v.title)).toContain("Blake in the sombrero");
    expect(new Set(ALL.map((v) => v.slug)).size).toBe(ALL.length);
  });

  it("formats durations as m:ss", () => {
    expect(formatDuration(8.5)).toBe("0:09");
    expect(formatDuration(171)).toBe("2:51");
    expect(formatDuration(60)).toBe("1:00");
  });
});
