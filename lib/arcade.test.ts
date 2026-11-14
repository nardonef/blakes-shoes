import { describe, it, expect } from "vitest";
import { KONAMI, keyInput, touchInput, konamiMatcher, shouldStep, type CodeInput } from "./arcade";

const feed = (inputs: (CodeInput | null)[]) => {
  const m = konamiMatcher();
  return inputs.map((i) => m.push(i));
};

describe("konamiMatcher", () => {
  it("fires on the full code, on the last input only", () => {
    const out = feed([...KONAMI]);
    expect(out.at(-1)).toBe(true);
    expect(out.slice(0, -1).every((x) => !x)).toBe(true);
  });

  it("does not fire on a wrong input mid-code", () => {
    expect(feed(["up", "up", "down", "left", "left", "right", "left", "right", "b", "a"]).some(Boolean)).toBe(false);
  });

  it("recovers from an extra 'up' at the start", () => {
    expect(feed(["up", "up", "up", ...KONAMI.slice(2)]).at(-1)).toBe(true);
  });

  it("recovers after junk input and can fire twice", () => {
    expect(feed([null, "a", "left", ...KONAMI]).at(-1)).toBe(true);
    expect(feed([...KONAMI, ...KONAMI]).filter(Boolean)).toHaveLength(2);
  });
});

describe("keyInput", () => {
  it("maps arrow keys and B/A in either case, ignores the rest", () => {
    expect(keyInput("ArrowUp")).toBe("up");
    expect(keyInput("ArrowRight")).toBe("right");
    expect(keyInput("B")).toBe("b");
    expect(keyInput("a")).toBe("a");
    expect(keyInput("Enter")).toBeNull();
  });
});

describe("touchInput", () => {
  it("reads swipes by their dominant direction", () => {
    expect(touchInput(0, -80, 0)).toBe("up");
    expect(touchInput(5, 90, 0)).toBe("down");
    expect(touchInput(-70, 20, 0)).toBe("left");
    expect(touchInput(60, -10, 0)).toBe("right");
  });

  it("treats short touches as taps that alternate B then A", () => {
    expect(touchInput(3, 4, 0)).toBe("b");
    expect(touchInput(-2, 1, 1)).toBe("a");
  });

  it("lets a phone enter the whole code with swipes and two taps", () => {
    const m = konamiMatcher();
    const swipes: [number, number][] = [[0, -80], [0, -80], [0, 80], [0, 80], [-80, 0], [80, 0], [-80, 0], [80, 0]];
    let fired = false;
    swipes.forEach(([dx, dy]) => (fired = m.push(touchInput(dx, dy, 0))));
    fired = m.push(touchInput(0, 0, 0)) || fired;
    fired = m.push(touchInput(0, 0, 1));
    expect(fired).toBe(true);
  });
});

describe("shouldStep", () => {
  it("drops the first print, then one per gap of travel", () => {
    expect(shouldStep(null, 10, 10)).toBe(true);
    expect(shouldStep({ x: 0, y: 0 }, 30, 30)).toBe(false); // ~42px
    expect(shouldStep({ x: 0, y: 0 }, 40, 30)).toBe(true); // 50px
  });
});
