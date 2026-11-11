import { describe, it, expect } from "vitest";
import { unitsLeft } from "./countdown";

describe("unitsLeft", () => {
  it("splits time into days, hours, minutes and seconds", () => {
    const ms = ((3 * 24 + 4) * 60 * 60 + 5 * 60 + 6) * 1000 + 999;
    expect(unitsLeft(ms)).toEqual([3, 4, 5, 6]);
  });

  it("is all zeros at or past the deadline", () => {
    expect(unitsLeft(0)).toEqual([0, 0, 0, 0]);
    expect(unitsLeft(-5000)).toEqual([0, 0, 0, 0]);
  });

  it("rolls seconds into minutes at the boundary", () => {
    expect(unitsLeft(60_000)).toEqual([0, 0, 1, 0]);
    expect(unitsLeft(59_999)).toEqual([0, 0, 0, 59]);
  });
});
