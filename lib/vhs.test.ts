import { describe, it, expect } from "vitest";
import { vcrDate, osdLabel } from "./vhs";

describe("vcrDate", () => {
  it("stamps dates like a camcorder, zero-padded, no timezone shift", () => {
    expect(vcrDate("2026-08-08")).toBe("AUG 08 2026");
    expect(vcrDate("2016-07-22")).toBe("JUL 22 2016");
    expect(vcrDate("2018-05-27")).toBe("MAY 27 2018");
    expect(vcrDate("2025-12-01")).toBe("DEC 01 2025");
  });
});

describe("osdLabel", () => {
  it("labels each tape state", () => {
    expect(osdLabel("stop")).toBe("■ STOP");
    expect(osdLabel("play")).toBe("▶ PLAY");
    expect(osdLabel("pause")).toBe("❚❚ PAUSE");
  });
});
