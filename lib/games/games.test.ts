import { describe, expect, it } from "vitest";
import { advance, downLabel, seededRng, spotLabel, startDrive, stepToward } from "./core";
import { kickResult, meter, meterPeriod, rollWind } from "./kicker";
import { CONCEPTS, completionYards, defenderPosition, leadThrow, QB_SPOT, BALL_SPEED, resolveThrow, routePosition } from "./qb";
import { playEnded, spawnDefenders, stepDefenders, stepPlayer, TACKLE_RADIUS } from "./run";
import {
  cpuFourthDown,
  fgDistance,
  fgOdds,
  fieldGoal,
  newCoachGame,
  POSSESSIONS,
  punt,
  resolvePlay,
  runPlay,
  type CoachGame,
} from "./coach";
import { dist } from "./core";

const always = (v: number) => () => v;

describe("core", () => {
  it("seeded rng is deterministic and in [0,1)", () => {
    const a = seededRng(42);
    const b = seededRng(42);
    const xs = Array.from({ length: 100 }, a);
    expect(xs).toEqual(Array.from({ length: 100 }, b));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it("stepToward stops at the target and moves speed*dt otherwise", () => {
    expect(stepToward({ x: 0, y: 0 }, { x: 1, y: 0 }, 10, 1)).toEqual({ x: 1, y: 0 });
    expect(stepToward({ x: 0, y: 0 }, { x: 10, y: 0 }, 2, 1)).toEqual({ x: 2, y: 0 });
  });

  it("advance handles first downs, downs, touchdowns, and turnovers", () => {
    const s = startDrive(25);
    expect(advance(s, 4)).toEqual({ state: { yardLine: 29, down: 2, toGo: 6 }, event: null });
    expect(advance(s, 12)).toEqual({ state: { yardLine: 37, down: 1, toGo: 10 }, event: "first-down" });
    expect(advance({ yardLine: 95, down: 1, toGo: 5 }, 9).event).toBe("touchdown");
    expect(advance({ yardLine: 50, down: 4, toGo: 3 }, 2).event).toBe("turnover-on-downs");
    // goal-to-go: first down inside the 10 is to the goal line
    expect(advance({ yardLine: 80, down: 1, toGo: 10 }, 12).state.toGo).toBe(8);
    // can't lose past the 1
    expect(advance({ yardLine: 3, down: 1, toGo: 10 }, -10).state).toEqual({ yardLine: 1, down: 2, toGo: 12 });
  });

  it("labels the spot and down", () => {
    expect(spotLabel(25)).toBe("OWN 25");
    expect(spotLabel(50)).toBe("50");
    expect(spotLabel(65)).toBe("OPP 35");
    expect(downLabel({ yardLine: 25, down: 3, toGo: 4 })).toBe("3RD & 4");
    expect(downLabel({ yardLine: 95, down: 1, toGo: 5 })).toBe("1ST & GOAL");
  });
});

describe("kicker", () => {
  it("meter is a 0..1..0 triangle wave", () => {
    expect(meter(0, 2)).toBe(0);
    expect(meter(1, 2)).toBe(1);
    expect(meter(0.5, 2)).toBe(0.5);
    expect(meter(2, 2)).toBe(0);
  });

  it("meters speed up with distance but have a floor", () => {
    expect(meterPeriod(20)).toBe(1.5);
    expect(meterPeriod(40)).toBeLessThan(meterPeriod(30));
    expect(meterPeriod(500)).toBe(0.55);
  });

  it("wind stays within +/-15 mph", () => {
    expect(rollWind(always(0))).toBe(-15);
    expect(rollWind(always(0.5))).toBe(0);
    expect(rollWind(always(0.9999))).toBe(15);
  });

  it("dead center with enough leg is good", () => {
    expect(kickResult(30, 0.5, 1, 0)).toMatchObject({ good: true, range: 70 });
  });

  it("misses short, wide left, wide right", () => {
    expect(kickResult(50, 0.5, 0.5, 0).miss).toBe("short");
    expect(kickResult(30, 0, 1, 0).miss).toBe("wide left");
    expect(kickResult(30, 1, 1, 0).miss).toBe("wide right");
  });

  it("wind pushes the ball, more at long range", () => {
    // straight kick, 15 mph crosswind: fine at 20, wide at 60
    expect(kickResult(20, 0.5, 1, 15).good).toBe(true);
    expect(kickResult(60, 0.5, 1, 15).miss).toBe("wide right");
    expect(kickResult(60, 0.5, 1, -15).miss).toBe("wide left");
  });
});

describe("qb", () => {
  const route = [{ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 10, y: 10 }];

  it("receivers move along their routes at constant speed and keep going", () => {
    expect(routePosition(route, 0, 5)).toEqual({ x: 0, y: 0 });
    expect(routePosition(route, 1, 5)).toEqual({ x: 0, y: 5 });
    expect(routePosition(route, 3, 5)).toEqual({ x: 5, y: 10 });
    expect(routePosition(route, 6, 5)).toEqual({ x: 20, y: 10 });
  });

  it("defenders trail by their lag and cushion", () => {
    expect(defenderPosition(route, { lag: 1, cushion: 1 }, 2)).toEqual(
      (() => {
        const p = routePosition(route, 1);
        return { x: p.x, y: p.y + 1 };
      })(),
    );
  });

  it("leadThrow aims where the receiver will be when the ball gets there", () => {
    for (const { routes } of CONCEPTS) {
      for (const r of routes) {
        const { target, arriveT } = leadThrow(r, 1);
        expect(dist(target, routePosition(r, arriveT))).toBeLessThan(1e-9);
        expect(Math.abs(arriveT - 1 - dist(QB_SPOT, target) / BALL_SPEED)).toBeLessThan(0.02);
      }
    }
  });

  it("wide open is a completion, blanketed can be picked", () => {
    expect(resolveThrow(4, always(0.5))).toBe("complete");
    expect(resolveThrow(0.2, always(0.3))).toBe("interception");
    expect(resolveThrow(0.2, always(0.5))).toBe("incomplete");
  });

  it("completion yards are never negative", () => {
    expect(completionYards(-3, always(0))).toBe(0);
    expect(completionYards(12, always(0.5))).toBe(15);
  });
});

describe("run", () => {
  it("spawns more, faster defenders each level, downfield of the line", () => {
    const rng = seededRng(1);
    const l1 = spawnDefenders(25, 1, rng);
    const l5 = spawnDefenders(25, 5, seededRng(1));
    expect(l1).toHaveLength(5);
    expect(l5).toHaveLength(9);
    expect(spawnDefenders(25, 50, rng)).toHaveLength(11);
    expect(l1.every((d) => d.y >= 27 && d.y <= 43)).toBe(true);
    expect(Math.min(...l5.map((d) => d.speed))).toBeGreaterThan(Math.min(...l1.map((d) => d.speed)) - 1e-9);
  });

  it("runner moves at full speed in any direction; idle stays put", () => {
    const { pos } = stepPlayer({ x: 10, y: 10 }, { x: 3, y: 4 }, 1);
    expect(dist(pos, { x: 10, y: 10 })).toBeCloseTo(8);
    expect(stepPlayer({ x: 1, y: 1 }, { x: 0, y: 0 }, 1).pos).toEqual({ x: 1, y: 1 });
  });

  it("defenders close in on the runner", () => {
    const p = { x: 20, y: 30 };
    const before = [{ x: 20, y: 40, speed: 6 }];
    const after = stepDefenders(before, p, { x: 0, y: 0 }, 0.5);
    expect(dist(after[0], p)).toBeCloseTo(7);
  });

  it("detects tackles, sidelines, and touchdowns", () => {
    expect(playEnded({ x: 10, y: 100 }, [])).toBe("touchdown");
    expect(playEnded({ x: -0.1, y: 40 }, [])).toBe("out of bounds");
    expect(playEnded({ x: 10, y: 40 }, [{ x: 10, y: 40 + TACKLE_RADIUS / 2, speed: 5 }])).toBe("tackled");
    expect(playEnded({ x: 10, y: 40 }, [{ x: 10, y: 45, speed: 5 }])).toBeNull();
  });
});

describe("coach", () => {
  it("field goal distance and odds", () => {
    expect(fgDistance(75)).toBe(42);
    expect(fgOdds(30)).toBeGreaterThan(fgOdds(50));
    expect(fgOdds(58)).toBe(0);
  });

  it("turnovers and incompletions", () => {
    // rng 0 -> turnover roll hits
    expect(resolvePlay("DEEP SHOT", "ZONE", always(0))).toEqual({ yards: 0, turnover: true, incomplete: false });
    // runs never fall incomplete
    const run = resolvePlay("INSIDE RUN", "ZONE", seededRng(3));
    expect(run.incomplete).toBe(false);
  });

  it("play action into a blitz loses yards on average", () => {
    const rng = seededRng(9);
    let total = 0;
    for (let i = 0; i < 400; i++) total += resolvePlay("PLAY ACTION", "BLITZ", rng).yards;
    expect(total / 400).toBeLessThan(0);
  });

  it("a touchdown scores 7 and flips possession to the CPU at its 25", () => {
    const g: CoachGame = { ...newCoachGame(), drive: { yardLine: 99, down: 1, toGo: 1 } };
    // seeded so the run gains at least 1
    let next = g;
    for (let seed = 0; next.you === 0 && seed < 50; seed++) next = runPlay(g, "OUTSIDE RUN", "ZONE", seededRng(seed));
    expect(next.you).toBe(7);
    expect(next.possession).toBe("cpu");
    expect(next.drive).toEqual(startDrive(25));
  });

  it("punts flip the field; touchbacks come out to the 20", () => {
    const g = newCoachGame();
    expect(punt({ ...g, drive: { yardLine: 30, down: 4, toGo: 5 } }).drive.yardLine).toBe(30);
    expect(punt({ ...g, drive: { yardLine: 70, down: 4, toGo: 5 } }).drive.yardLine).toBe(20);
  });

  it("field goal good adds 3", () => {
    const g = { ...newCoachGame(), drive: { yardLine: 80, down: 4, toGo: 3 } };
    expect(fieldGoal(g, always(0)).you).toBe(3);
    expect(fieldGoal(g, always(0.999)).you).toBe(0);
  });

  it("the game ends after five possessions each", () => {
    let g = newCoachGame();
    let changes = 0;
    while (!g.over) {
      g = punt(g);
      changes++;
    }
    expect(changes).toBe(POSSESSIONS * 2);
    expect(g.log[0]).toBe("FINAL");
    expect(punt(g)).toBe(g);
  });

  it("CPU 4th down: go on short yardage, kick in range, else punt", () => {
    const g = newCoachGame();
    expect(cpuFourthDown({ ...g, drive: { yardLine: 60, down: 4, toGo: 1 } })).toBe("go");
    expect(cpuFourthDown({ ...g, drive: { yardLine: 75, down: 4, toGo: 8 } })).toBe("fg");
    expect(cpuFourthDown({ ...g, drive: { yardLine: 30, down: 4, toGo: 8 } })).toBe("punt");
  });
});
