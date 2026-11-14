import { describe, it, expect } from "vitest";
import { tabLabel, isFinalHour, withCountdown } from "./tab-countdown";

const S = 1e3;
const M = 60 * S;
const H = 60 * M;
const D = 24 * H;

describe("tabLabel", () => {
  it("is off outside deadline week and after the deadline", () => {
    expect(tabLabel(8 * D)).toBeNull();
    expect(tabLabel(7 * D + 1)).toBeNull();
    expect(tabLabel(0)).toBeNull();
    expect(tabLabel(-5 * M)).toBeNull();
  });

  it("shows days and hours, then hours and minutes, then minutes and seconds", () => {
    expect(tabLabel(7 * D)).toBe("7d 0h");
    expect(tabLabel(D + 3 * H + 20 * M)).toBe("1d 3h");
    expect(tabLabel(5 * H + 7 * M)).toBe("5h 07m");
    expect(tabLabel(47 * M + 5 * S)).toBe("47m 05s");
  });
});

describe("isFinalHour", () => {
  it("is true only in the last hour before the deadline", () => {
    expect(isFinalHour(H)).toBe(true);
    expect(isFinalHour(10 * S)).toBe(true);
    expect(isFinalHour(H + 1)).toBe(false);
    expect(isFinalHour(0)).toBe(false);
  });
});

describe("withCountdown", () => {
  const base = "Stats | Blake's Shoes";

  it("prefixes the page title", () => {
    expect(withCountdown(base, "1d 3h")).toBe("⏱ 1d 3h · Stats | Blake's Shoes");
  });

  it("replaces an existing prefix instead of stacking", () => {
    expect(withCountdown("⏱ 1d 3h · Stats | Blake's Shoes", "1d 2h")).toBe("⏱ 1d 2h · Stats | Blake's Shoes");
  });

  it("removes the prefix when the countdown ends", () => {
    expect(withCountdown("⏱ 0m 01s · Stats | Blake's Shoes", null)).toBe(base);
    expect(withCountdown(base, null)).toBe(base);
  });
});
