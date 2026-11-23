import { describe, expect, it } from "vitest";
import { PLAYS } from "./plays";
import { applyFrame, frameAt, record, replayCopy, replayWorthy, FRAME_DT, type Frame } from "./replay";
import { createSim, step, type Ratings } from "./sim";

const AVG: Ratings = { qb: 0.5, rb: 0.5, wr1: 0.5, wr2: 0.5, flex: 0.5, te: 0.5, def: 0.5 };

function recorded(seconds: number) {
  const s = createSim(PLAYS[0], 30, AVG, 11);
  const frames: Frame[] = [];
  for (let i = 0; i < seconds * 60 && !s.result; i++) {
    step(s);
    record(frames, s);
  }
  return { s, frames };
}

describe("replay", () => {
  it("records about 30 frames a second, plus the final whistle", () => {
    const { frames, s } = recorded(2);
    expect(s.t).toBeGreaterThan(0.5);
    expect(Math.abs(frames.length - s.t * 30)).toBeLessThanOrEqual(2);
    for (let i = 1; i < frames.length - 1; i++) expect(frames[i].t - frames[i - 1].t).toBeGreaterThanOrEqual(FRAME_DT - 1e-6);
    expect(frames[0].pos.length).toBe(s.players.length * 4);
  });

  it("interpolates between frames and clamps at the ends", () => {
    const { frames } = recorded(2);
    const [a, b] = [frames[10], frames[11]];
    const mid = frameAt(frames, (a.t + b.t) / 2);
    expect(mid.pos[0]).toBeCloseTo((a.pos[0] + b.pos[0]) / 2, 5);
    expect(mid.ball.y).toBeCloseTo((a.ball.y + b.ball.y) / 2, 5);
    expect(frameAt(frames, -1)).toBe(frames[0]);
    expect(frameAt(frames, 999)).toBe(frames[frames.length - 1]);
  });

  it("poses a copy, leaving the real play untouched", () => {
    const { s, frames } = recorded(2);
    const before = { x: s.players[0].x, y: s.players[0].y };
    const copy = replayCopy(s);
    applyFrame(copy, frames[0]);
    expect(copy.players[0].x).toBeCloseTo(frames[0].pos[0], 5);
    expect(copy.t).toBe(frames[0].t);
    expect(s.players[0]).toMatchObject(before);
    expect(copy.result).toBeUndefined();
  });

  it("offers replays for big plays only", () => {
    expect(replayWorthy("touchdown", 75)).toBe(true);
    expect(replayWorthy("interception", 0)).toBe(true);
    expect(replayWorthy("sack", -7)).toBe(true);
    expect(replayWorthy("tackle", 18)).toBe(true);
    expect(replayWorthy("tackle", 6)).toBe(false);
    expect(replayWorthy("incomplete", 0)).toBe(false);
  });
});
