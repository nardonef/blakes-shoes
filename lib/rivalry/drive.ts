// The two-minute drill: clock, downs, timeouts, and how a drive ends.

import { advance, startDrive, type Downs } from "@/lib/games/core";

export const START_CLOCK = 120;
export const HUDDLE_SECONDS = 15;
export const SPIKE_SECONDS = 3;
export const TIMEOUTS = 1;

export type DriveOutcome = "touchdown" | "turnover on downs" | "interception" | "time expired";

export interface Drive {
  downs: Downs;
  /** Seconds left. */
  clock: number;
  timeouts: number;
  /** Clock runs before the next snap (in-bounds tackle, no timeout called). */
  running: boolean;
  outcome?: DriveOutcome;
}

/** How a play ended, as reported by the field simulation. */
export interface PlayEnd {
  /** Yards gained (negative for losses). */
  yards: number;
  how: "tackle" | "out of bounds" | "incomplete" | "touchdown" | "interception" | "sack";
  /** Seconds the play took. */
  duration: number;
}

export function startTwoMinuteDrill(): Drive {
  return { downs: startDrive(25), clock: START_CLOCK, timeouts: TIMEOUTS, running: false };
}

/**
 * Apply a finished play. A play that starts with time left always finishes; the drive ends when
 * the clock hits zero after it (no untimed down: keep it simple).
 */
export function applyPlay(d: Drive, p: PlayEnd): Drive {
  if (d.outcome) return d;
  const clock = Math.max(0, d.clock - p.duration);
  if (p.how === "interception") return { ...d, clock, running: false, outcome: "interception" };
  const yards = p.how === "incomplete" ? 0 : p.how === "touchdown" ? 100 - d.downs.yardLine : p.yards;
  const { state, event } = advance(d.downs, yards);
  if (event === "touchdown") return { ...d, downs: state, clock, running: false, outcome: "touchdown" };
  if (event === "turnover-on-downs") return { ...d, downs: state, clock, running: false, outcome: "turnover on downs" };
  if (clock === 0) return { ...d, downs: state, clock, running: false, outcome: "time expired" };
  const running = p.how === "tackle" || p.how === "sack";
  return { ...d, downs: state, clock, running };
}

/** Time that comes off between plays: the huddle, if the clock is running. */
export function betweenPlays(d: Drive): Drive {
  if (d.outcome || !d.running) return d;
  const clock = Math.max(0, d.clock - HUDDLE_SECONDS);
  return clock === 0 ? { ...d, clock, running: false, outcome: "time expired" } : { ...d, clock };
}

/** Call timeout before the huddle runs: the clock stops. */
export function callTimeout(d: Drive): Drive {
  if (d.outcome || d.timeouts === 0 || !d.running) return d;
  return { ...d, timeouts: d.timeouts - 1, running: false };
}

/** Spike: a quick snap that stops the clock and costs a down. Not on 4th. */
export function spike(d: Drive): Drive {
  if (d.outcome || d.downs.down === 4) return d;
  return applyPlay({ ...d, running: false }, { yards: 0, how: "incomplete", duration: SPIKE_SECONDS });
}

export function clockLabel(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
