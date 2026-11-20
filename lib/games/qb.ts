// QB pass challenge: three receivers run routes, each shadowed by a defender who reacts late by a
// random lag. Tap a receiver to throw (the ball leads him). Ten dropbacks; an interception ends it.
// Score = total passing yards.

import { dist, FIELD_WIDTH, type Rng, type Vec } from "./core";

// Coordinates in yards: x across the field, y downfield from the line of scrimmage.
export const QB_SPOT: Vec = { x: FIELD_WIDTH / 2, y: -5 };
export const BALL_SPEED = 22;
export const RECEIVER_SPEED = 7.5;
export const DROPBACKS = 10;
export const SACK_YARDS = -6;

export type Route = Vec[];

const L = 6;
const R = FIELD_WIDTH - 6;
const S = 18;

/** Each concept is three routes: left outside, right outside, slot. */
export const CONCEPTS: { name: string; routes: Route[] }[] = [
  {
    name: "SLANTS",
    routes: [
      [{ x: L, y: 0 }, { x: L, y: 4 }, { x: L + 14, y: 14 }],
      [{ x: R, y: 0 }, { x: R, y: 4 }, { x: R - 14, y: 14 }],
      [{ x: S, y: 0 }, { x: S, y: 10 }, { x: S + 2, y: 30 }],
    ],
  },
  {
    name: "FOUR VERTS",
    routes: [
      [{ x: L, y: 0 }, { x: L, y: 45 }],
      [{ x: R, y: 0 }, { x: R, y: 45 }],
      [{ x: S, y: 0 }, { x: S + 4, y: 12 }, { x: S + 4, y: 45 }],
    ],
  },
  {
    name: "CURL FLAT",
    routes: [
      [{ x: L, y: 0 }, { x: L, y: 12 }, { x: L + 2, y: 9 }],
      [{ x: R, y: 0 }, { x: R, y: 12 }, { x: R - 2, y: 9 }],
      [{ x: S, y: 0 }, { x: S - 3, y: 3 }, { x: 1, y: 4 }],
    ],
  },
  {
    name: "POST CORNER",
    routes: [
      [{ x: L, y: 0 }, { x: L, y: 12 }, { x: L + 16, y: 32 }],
      [{ x: R, y: 0 }, { x: R, y: 12 }, { x: R + 4, y: 26 }],
      [{ x: S, y: 0 }, { x: S, y: 8 }, { x: S + 16, y: 8 }],
    ],
  },
];

/** Position along a route after t seconds at constant speed; past the last point he keeps going. */
export function routePosition(route: Route, t: number, speed = RECEIVER_SPEED): Vec {
  let remaining = Math.max(0, t) * speed;
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1];
    const b = route[i];
    const seg = dist(a, b);
    if (remaining <= seg || i === route.length - 1) {
      const f = seg === 0 ? 0 : remaining / seg;
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }
    remaining -= seg;
  }
  return { ...route[0] };
}

export interface Coverage {
  /** Seconds the defender trails the receiver's route. */
  lag: number;
  /** Cushion: how many yards deeper than the trailed spot he plays. */
  cushion: number;
}

export function rollCoverage(rng: Rng): Coverage {
  return { lag: 0.05 + rng() * 0.45, cushion: rng() * 1.5 };
}

export function defenderPosition(route: Route, c: Coverage, t: number): Vec {
  const p = routePosition(route, t - c.lag);
  return { x: p.x, y: p.y + c.cushion };
}

export function sackTime(rng: Rng): number {
  return 2.6 + rng() * 1.4;
}

/** Where to throw and when it arrives, leading the receiver. Iterates since flight time depends on target. */
export function leadThrow(route: Route, releaseT: number): { target: Vec; arriveT: number } {
  let arriveT = releaseT + 0.4;
  let target = routePosition(route, arriveT);
  for (let i = 0; i < 4; i++) {
    arriveT = releaseT + dist(QB_SPOT, target) / BALL_SPEED;
    target = routePosition(route, arriveT);
  }
  return { target, arriveT };
}

export type ThrowOutcome = "complete" | "incomplete" | "interception";

/** Completion odds rise with separation; tight windows risk a pick. */
export function resolveThrow(separation: number, rng: Rng): ThrowOutcome {
  const pComplete = Math.min(0.95, Math.max(0.05, (separation - 0.5) / 2.5));
  if (rng() < pComplete) return "complete";
  return rng() < (separation < 1 ? 0.35 : 0.08) ? "interception" : "incomplete";
}

/** Yards on a completion: catch depth plus a little run after the catch. Never negative. */
export function completionYards(catchY: number, rng: Rng): number {
  return Math.max(0, Math.round(catchY + rng() * 5));
}
