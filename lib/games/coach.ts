// Play-call sim: you vs another league manager. You call plays on offense and the scheme on defense;
// the CPU picks the other side. Five possessions each. Score = your final margin.

import { advance, startDrive, type Downs, type Rng } from "./core";

export const OFFENSE = ["INSIDE RUN", "OUTSIDE RUN", "SHORT PASS", "DEEP SHOT", "PLAY ACTION"] as const;
export const DEFENSE = ["RUN STOP", "ZONE", "BLITZ"] as const;
export type OffCall = (typeof OFFENSE)[number];
export type DefCall = (typeof DEFENSE)[number];

export const POSSESSIONS = 5;
export const FG_MAX = 57;

interface Cell {
  mean: number;
  sd: number;
  /** Chance a pass falls incomplete (0 for runs). */
  inc: number;
  /** Chance of an interception or fumble. */
  to: number;
}

// Rows: offense call. Columns: RUN STOP, ZONE, BLITZ.
const MATRIX: Record<OffCall, [Cell, Cell, Cell]> = {
  "INSIDE RUN": [
    { mean: 1, sd: 2, inc: 0, to: 0.02 },
    { mean: 5, sd: 3, inc: 0, to: 0.01 },
    { mean: 4, sd: 5, inc: 0, to: 0.02 },
  ],
  "OUTSIDE RUN": [
    { mean: 2, sd: 4, inc: 0, to: 0.02 },
    { mean: 5, sd: 5, inc: 0, to: 0.02 },
    { mean: 7, sd: 7, inc: 0, to: 0.03 },
  ],
  "SHORT PASS": [
    { mean: 8, sd: 4, inc: 0.2, to: 0.02 },
    { mean: 4, sd: 3, inc: 0.35, to: 0.04 },
    { mean: 7, sd: 6, inc: 0.3, to: 0.04 },
  ],
  "DEEP SHOT": [
    { mean: 24, sd: 10, inc: 0.45, to: 0.04 },
    { mean: 18, sd: 8, inc: 0.65, to: 0.1 },
    { mean: 30, sd: 12, inc: 0.6, to: 0.05 },
  ],
  "PLAY ACTION": [
    { mean: 16, sd: 8, inc: 0.35, to: 0.03 },
    { mean: 8, sd: 6, inc: 0.45, to: 0.06 },
    { mean: -5, sd: 3, inc: 0, to: 0.06 },
  ],
};

function normal(rng: Rng): number {
  const u = Math.max(rng(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

export interface PlayResult {
  yards: number;
  turnover: boolean;
  incomplete: boolean;
}

export function resolvePlay(off: OffCall, def: DefCall, rng: Rng): PlayResult {
  const c = MATRIX[off][DEFENSE.indexOf(def)];
  if (rng() < c.to) return { yards: 0, turnover: true, incomplete: false };
  if (rng() < c.inc) return { yards: 0, turnover: false, incomplete: true };
  return { yards: Math.round(c.mean + c.sd * normal(rng)), turnover: false, incomplete: false };
}

export function pick<T>(arr: readonly T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Field goal distance from a yard line: snap 7 yards back, plus 10 for the end zone. */
export function fgDistance(yardLine: number): number {
  return 100 - yardLine + 17;
}

export function fgOdds(distance: number): number {
  if (distance > FG_MAX) return 0;
  return Math.min(0.98, Math.max(0.05, 1.05 - (distance - 20) * 0.012));
}

export type Side = "you" | "cpu";

export interface CoachGame {
  you: number;
  cpu: number;
  possession: Side;
  drive: Downs;
  /** Possessions not yet started, per side. */
  left: Record<Side, number>;
  log: string[];
  over: boolean;
}

export function newCoachGame(): CoachGame {
  return { you: 0, cpu: 0, possession: "you", drive: startDrive(), left: { you: POSSESSIONS - 1, cpu: POSSESSIONS }, log: [], over: false };
}

const other = (s: Side): Side => (s === "you" ? "cpu" : "you");

/** Hand the ball to the other side at `yardLine` (from their own goal), or end the game if they're out of possessions. */
function changePossession(g: CoachGame, yardLine: number, note: string): CoachGame {
  const next = other(g.possession);
  const log = [note, ...g.log];
  if (g.left[next] === 0) return { ...g, log: ["FINAL", ...log], over: true };
  return { ...g, possession: next, drive: startDrive(yardLine), left: { ...g.left, [next]: g.left[next] - 1 }, log };
}

function addPoints(g: CoachGame, pts: number): CoachGame {
  return g.possession === "you" ? { ...g, you: g.you + pts } : { ...g, cpu: g.cpu + pts };
}

export function runPlay(g: CoachGame, off: OffCall, def: DefCall, rng: Rng): CoachGame {
  if (g.over) return g;
  const r = resolvePlay(off, def, rng);
  const tag = `${off} vs ${def}`;
  if (r.turnover) return changePossession(g, 100 - g.drive.yardLine, `${tag}: TURNOVER`);
  const { state, event } = advance(g.drive, r.yards);
  const desc = r.incomplete ? "incomplete" : `${r.yards >= 0 ? "+" : ""}${r.yards}`;
  if (event === "touchdown") return changePossession(addPoints(g, 7), 25, `${tag}: TOUCHDOWN`);
  if (event === "turnover-on-downs") return changePossession(g, 100 - state.yardLine, `${tag}: ${desc}, turnover on downs`);
  return { ...g, drive: state, log: [`${tag}: ${desc}${event === "first-down" ? ", first down" : ""}`, ...g.log] };
}

export function punt(g: CoachGame): CoachGame {
  if (g.over) return g;
  const land = g.drive.yardLine + 40;
  return changePossession(g, land >= 100 ? 20 : 100 - land, "PUNT");
}

export function fieldGoal(g: CoachGame, rng: Rng): CoachGame {
  if (g.over) return g;
  const d = fgDistance(g.drive.yardLine);
  if (rng() < fgOdds(d)) return changePossession(addPoints(g, 3), 25, `${d}-YD FIELD GOAL: GOOD`);
  return changePossession(g, Math.max(20, 100 - g.drive.yardLine - 7), `${d}-YD FIELD GOAL: NO GOOD`);
}

/** CPU's 4th-down decision: go for it on short yardage past midfield, kick if in range, else punt. */
export function cpuFourthDown(g: CoachGame): "go" | "fg" | "punt" {
  if (g.drive.toGo <= 2 && g.drive.yardLine >= 50) return "go";
  if (fgOdds(fgDistance(g.drive.yardLine)) >= 0.5) return "fg";
  return "punt";
}
