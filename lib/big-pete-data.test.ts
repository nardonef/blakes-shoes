import { describe, it, expect } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PETER_VIDEOS, videoSrc, posterSrc, formatDuration } from "./peter-videos-data";

const DIR = join(process.cwd(), "public", "peter-videos");

describe("peter videos data", () => {
  it("lists 16 videos from Jul 2016 to Aug 2026", () => {
    expect(PETER_VIDEOS).toHaveLength(16);
    expect(PETER_VIDEOS[0].postedOn).toBe("2026-08-08");
    expect(PETER_VIDEOS.at(-1)!.postedOn).toBe("2016-07-22");
  });

  it("dates each slug by its Eastern-time day", () => {
    for (const v of PETER_VIDEOS) expect(v.slug.startsWith(v.postedOn)).toBe(true);
  });

  it("numbers same-day videos as parts, with the later part first", () => {
    const sameDay = PETER_VIDEOS.filter((v) => PETER_VIDEOS.filter((w) => w.postedOn === v.postedOn).length > 1);
    expect(sameDay.map((v) => [v.slug, v.part])).toEqual([
      ["2025-08-18-b", "2 of 2"],
      ["2025-08-18-a", "1 of 2"],
      ["2018-05-27-b", "2 of 2"],
      ["2018-05-27-a", "1 of 2"],
    ]);
  });

  it("has no video files in public/ that the page doesn't list", () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith(".mp4")).sort();
    expect(files).toEqual(PETER_VIDEOS.map((v) => `${v.slug}.mp4`).sort());
  });

  it("has a video and poster file in public/ for every entry", () => {
    for (const v of PETER_VIDEOS) {
      expect(existsSync(join(process.cwd(), "public", videoSrc(v)))).toBe(true);
      expect(existsSync(join(process.cwd(), "public", posterSrc(v)))).toBe(true);
    }
  });

  it("uses unique slugs, newest first", () => {
    expect(new Set(PETER_VIDEOS.map((v) => v.slug)).size).toBe(PETER_VIDEOS.length);
    const dates = PETER_VIDEOS.map((v) => v.postedOn);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("formats durations as m:ss", () => {
    expect(formatDuration(8.5)).toBe("0:09");
    expect(formatDuration(171)).toBe("2:51");
    expect(formatDuration(60)).toBe("1:00");
  });
});
