// Shared pieces for the /games football games: a seedable RNG, field geometry, and down-and-distance.

export type Rng = () => number;

/** Mulberry32: small seedable PRNG so game logic is deterministic under test. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const FIELD_WIDTH = 53.3;

export interface Vec {
  x: number;
  y: number;
}

export function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Move `from` toward `to` by at most speed * dt. */
export function stepToward(from: Vec, to: Vec, speed: number, dt: number): Vec {
  const d = dist(from, to);
  const step = speed * dt;
  if (d <= step || d === 0) return { ...to };
  return { x: from.x + ((to.x - from.x) / d) * step, y: from.y + ((to.y - from.y) / d) * step };
}

/** Ball position: yardLine is yards from your own goal line (0-100). */
export interface Downs {
  yardLine: number;
  down: number;
  toGo: number;
}

export type DownEvent = "touchdown" | "first-down" | "turnover-on-downs" | null;

export function startDrive(yardLine = 25): Downs {
  return { yardLine, down: 1, toGo: 10 };
}

/** Apply a play's yardage. The ball can't go behind the 1 (no safeties in these games). */
export function advance(s: Downs, yards: number): { state: Downs; event: DownEvent } {
  const yardLine = Math.min(100, Math.max(1, s.yardLine + yards));
  const gained = yardLine - s.yardLine;
  if (yardLine >= 100) return { state: { yardLine: 100, down: 1, toGo: 0 }, event: "touchdown" };
  if (gained >= s.toGo) return { state: { yardLine, down: 1, toGo: Math.min(10, 100 - yardLine) }, event: "first-down" };
  if (s.down === 4) return { state: { yardLine, down: 4, toGo: s.toGo - gained }, event: "turnover-on-downs" };
  return { state: { yardLine, down: s.down + 1, toGo: s.toGo - gained }, event: null };
}

/** "OWN 25", "50", "OPP 35" for a yard line measured from your own goal. */
export function spotLabel(yardLine: number): string {
  const y = Math.round(yardLine);
  if (y === 50) return "50";
  return y < 50 ? `OWN ${y}` : `OPP ${100 - y}`;
}

export function downLabel(s: Downs): string {
  const ord = ["1ST", "2ND", "3RD", "4TH"][s.down - 1];
  const toGo = s.yardLine + s.toGo >= 100 ? "GOAL" : String(Math.max(1, Math.round(s.toGo)));
  return `${ord} & ${toGo}`;
}
