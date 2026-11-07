import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PETER_VIDEOS, videoSrc, posterSrc, formatDuration } from "./peter-videos-data";

describe("peter videos data", () => {
  it("lists the 10 recoverable GroupMe videos plus the Aug 8, 2026 video", () => {
    expect(PETER_VIDEOS).toHaveLength(11);
    expect(PETER_VIDEOS[0]).toMatchObject({ slug: "2026-08-08", postedOn: "2026-08-08" });
    expect(PETER_VIDEOS[0].likes).toBeUndefined();
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
