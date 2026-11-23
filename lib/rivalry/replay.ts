// Instant replay: record a play at 30 frames a second and play it back interpolated (for slow-mo).

import type { Vec } from "@/lib/games/core";
import { ballPosition, type Act, type Sim } from "./sim";

export const FRAME_DT = 1 / 30;

export interface Frame {
  t: number;
  /** x, y, vx, vy per player. */
  pos: Float32Array;
  acts: Act[];
  ball: Vec & { h: number };
}

/** Add a frame if at least FRAME_DT of play time has passed since the last one (or it's the first). */
export function record(frames: Frame[], s: Sim): void {
  const last = frames[frames.length - 1];
  if (last && s.t - last.t < FRAME_DT - 1e-9 && !s.result) return;
  const pos = new Float32Array(s.players.length * 4);
  s.players.forEach((p, i) => pos.set([p.x, p.y, p.vx, p.vy], i * 4));
  frames.push({ t: s.t, pos, acts: s.players.map((p) => p.act), ball: ballPosition(s) });
}

/** The frame at time t, positions interpolated between recorded frames; acts from the earlier one. */
export function frameAt(frames: Frame[], t: number): Frame {
  if (t <= frames[0].t) return frames[0];
  const last = frames[frames.length - 1];
  if (t >= last.t) return last;
  let i = 1;
  while (frames[i].t < t) i++;
  const a = frames[i - 1];
  const b = frames[i];
  const f = (t - a.t) / (b.t - a.t);
  const pos = new Float32Array(a.pos.length);
  for (let k = 0; k < pos.length; k++) pos[k] = a.pos[k] + (b.pos[k] - a.pos[k]) * f;
  const lerp = (x: number, y: number) => x + (y - x) * f;
  return { t, pos, acts: a.acts, ball: { x: lerp(a.ball.x, b.ball.x), y: lerp(a.ball.y, b.ball.y), h: lerp(a.ball.h, b.ball.h) } };
}

/** A copy of the play for showing replays, so the real sim is left alone. */
export function replayCopy(s: Sim): Sim {
  return { ...s, players: s.players.map((p) => ({ ...p })), ball: { ...s.ball }, events: [], result: undefined };
}

/** Pose the copy's players as they were in a frame. */
export function applyFrame(s: Sim, f: Frame): void {
  s.players.forEach((p, i) => {
    p.x = f.pos[i * 4];
    p.y = f.pos[i * 4 + 1];
    p.vx = f.pos[i * 4 + 2];
    p.vy = f.pos[i * 4 + 3];
    p.act = f.acts[i];
  });
  s.t = f.t;
}

/** Worth offering a replay: a touchdown, a pick, a sack, or a gain of 15+. */
export function replayWorthy(how: string, yards: number): boolean {
  return how === "touchdown" || how === "interception" || how === "sack" || yards >= 15;
}
