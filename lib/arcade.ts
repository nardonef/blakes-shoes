// Arcade mode (components/ArcadeMode.tsx): the Konami code matcher and footprint spacing. Client-safe.

export const KONAMI = ["up", "up", "down", "down", "left", "right", "left", "right", "b", "a"] as const;
export type CodeInput = (typeof KONAMI)[number];

const KEYS: Record<string, CodeInput> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  b: "b",
  B: "b",
  a: "a",
  A: "a",
};

/** A keyboard key as a code input, or null for keys that aren't part of the code. */
export const keyInput = (key: string): CodeInput | null => KEYS[key] ?? null;

/**
 * A touch gesture as a code input: a swipe of at least `min` px is a direction; anything shorter is
 * a tap, which counts as the next button of "B, A" (so tap, tap finishes the code).
 */
export function touchInput(dx: number, dy: number, tapsSoFar: number, min = 30): CodeInput {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < min) return tapsSoFar % 2 === 0 ? "b" : "a";
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

/** Feeds inputs in; `push` returns true when the last ten inputs spell the Konami code. */
export function konamiMatcher() {
  let progress = 0;
  return {
    push(input: CodeInput | null): boolean {
      if (input === KONAMI[progress]) progress++;
      // A wrong input can still be the start of a new attempt (e.g. a third "up").
      else progress = input === KONAMI[0] ? (progress === 2 && input === "up" ? 2 : 1) : 0;
      if (progress === KONAMI.length) {
        progress = 0;
        return true;
      }
      return false;
    },
  };
}

/** True when the pointer has moved far enough from the last print to leave another. */
export const shouldStep = (from: { x: number; y: number } | null, x: number, y: number, gap = 46) =>
  !from || Math.hypot(x - from.x, y - from.y) >= gap;
