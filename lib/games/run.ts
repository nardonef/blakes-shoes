// Arcade drive: run the ball through chasing defenders. Four downs to make 10; a touchdown is 7 and
// starts a new drive against more, faster defenders. Turning it over on downs ends the game.

import { FIELD_WIDTH, dist, stepToward, type Rng, type Vec } from "./core";

export const PLAYER_SPEED = 8;
export const TACKLE_RADIUS = 1;

export interface Defender extends Vec {
  speed: number;
}

/** Defenders line up 2-18 yards past the line of scrimmage; more and faster each level. */
export function spawnDefenders(los: number, level: number, rng: Rng): Defender[] {
  const count = Math.min(11, 4 + level);
  const out: Defender[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: 3 + rng() * (FIELD_WIDTH - 6),
      y: los + 2 + rng() * 16,
      speed: Math.min(7.6, 5 + level * 0.3 + rng() * 1.2),
    });
  }
  return out;
}

/** Defenders pursue toward where the runner is headed, a fraction of a second ahead. */
export function stepDefenders(defs: Defender[], player: Vec, playerVel: Vec, dt: number): Defender[] {
  return defs.map((d) => {
    const lead = Math.min(0.5, dist(d, player) / 20);
    const aim = { x: player.x + playerVel.x * lead, y: player.y + playerVel.y * lead };
    return { ...stepToward(d, aim, d.speed, dt), speed: d.speed };
  });
}

/** Move the runner along a direction (normalized here), at full speed for any non-zero input. */
export function stepPlayer(p: Vec, dir: Vec, dt: number): { pos: Vec; vel: Vec } {
  const m = Math.hypot(dir.x, dir.y);
  if (m === 0) return { pos: p, vel: { x: 0, y: 0 } };
  const vel = { x: (dir.x / m) * PLAYER_SPEED, y: (dir.y / m) * PLAYER_SPEED };
  return { pos: { x: p.x + vel.x * dt, y: p.y + vel.y * dt }, vel };
}

export type PlayEnd = "tackled" | "out of bounds" | "touchdown" | null;

export function playEnded(p: Vec, defs: Defender[]): PlayEnd {
  if (p.y >= 100) return "touchdown";
  if (p.x < 0 || p.x > FIELD_WIDTH) return "out of bounds";
  if (defs.some((d) => dist(d, p) < TACKLE_RADIUS)) return "tackled";
  return null;
}
