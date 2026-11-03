import { describe, expect, it } from "vitest";
import { easeOut, formatAt, parseNumber } from "./count-up";

describe("parseNumber / formatAt", () => {
  it.each([
    ["202.00", "0.00"],
    ["+102.1", "+0.0"],
    ["$100", "$0"],
    ["1,762 pts", "0 pts"],
    ["90.4%", "0.0%"],
    ["7 of 14", "0 of 14"],
    ["74 starts", "0 starts"],
    ["15", "0"],
  ])("keeps the format of %s while counting from %s", (text, zero) => {
    const p = parseNumber(text)!;
    expect(formatAt(p, 0)).toBe(zero);
    expect(formatAt(p, p.value)).toBe(text);
  });

  it("formats values on the way up like the final value", () => {
    const p = parseNumber("1,762 pts")!;
    expect(formatAt(p, 1234.4)).toBe("1,234 pts");
    expect(formatAt(parseNumber("+102.1")!, 51.06)).toBe("+51.1");
  });

  it("leaves text with no number alone", () => {
    expect(parseNumber("Same")).toBeNull();
  });
});

describe("easeOut", () => {
  it("starts at 0, ends at 1 and front-loads the motion", () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    expect(easeOut(0.5)).toBeGreaterThan(0.5);
  });
});
