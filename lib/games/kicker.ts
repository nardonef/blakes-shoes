// Field goal kicker: lock an aim meter, then a power meter. Every make moves the kick back 5 yards;
// three misses ends the run. Score = longest field goal made.

import type { Rng } from "./core";

export const KICK_START = 20;
export const KICK_STEP = 5;
export const KICK_MAX_RANGE = 70;
export const KICK_STRIKES = 3;

/** Triangle wave 0 -> 1 -> 0 over `period` seconds. */
export function meter(t: number, period: number): number {
  const x = (((t % period) + period) % period) / period;
  return x < 0.5 ? x * 2 : 2 - x * 2;
}

/** Meters speed up as kicks get longer. */
export function meterPeriod(distance: number): number {
  return Math.max(0.55, 1.5 - (distance - KICK_START) * 0.02);
}

/** Wind in mph, -15 (blowing left) to +15 (blowing right). */
export function rollWind(rng: Rng): number {
  return Math.round((rng() * 2 - 1) * 15);
}

export type KickMiss = "short" | "wide left" | "wide right";

export interface KickResult {
  good: boolean;
  miss?: KickMiss;
  /** Where the ball crosses the posts: -1..1 roughly, 0 = dead center. */
  lateral: number;
  /** Half-width of the uprights at this distance, in the same units as `lateral`. */
  tolerance: number;
  range: number;
}

/**
 * aim: aim-meter reading 0..1 (0.5 = straight). power: power-meter reading 0..1.
 * Wind pushes the ball more the farther it travels; the uprights look narrower from deeper.
 */
export function kickResult(distance: number, aim: number, power: number, windMph: number): KickResult {
  const range = KICK_MAX_RANGE * power;
  const lateral = (aim * 2 - 1) + (windMph / 15) * (distance / 100);
  const tolerance = 4.5 / distance;
  let miss: KickMiss | undefined;
  if (range < distance) miss = "short";
  else if (lateral < -tolerance) miss = "wide left";
  else if (lateral > tolerance) miss = "wide right";
  return { good: !miss, miss, lateral, tolerance, range };
}
