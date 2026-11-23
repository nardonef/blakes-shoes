import { describe, expect, it } from "vitest";
import { PLAYS } from "./plays";
import { ballPosition, createSim, runFor, separation, step, targets, type Ratings, type Sim } from "./sim";

const AVG: Ratings = { qb: 0.5, rb: 0.5, wr1: 0.5, wr2: 0.5, flex: 0.5, te: 0.5, def: 0.5 };
const play = (name: string) => PLAYS.find((p) => p.name === name)!;
const offense = (s: Sim) => s.players.filter((p) => p.team === "off");
const defense = (s: Sim) => s.players.filter((p) => p.team === "def");
/** Clear the defense out of the way (for "nobody there" cases). */
const noDefense = (s: Sim) => {
  for (const d of defense(s)) {
    d.x = -50;
    d.y = -50;
    d.speed = 0;
    d.rush = false;
    d.cover = undefined;
    d.zone = undefined;
  }
  s.sackAt = 99;
  return s;
};

describe("formation", () => {
  it("lines up 11 on 11, offense behind the line, defense past it", () => {
    const s = createSim(play("SLANTS"), 25, AVG, 1);
    expect(offense(s)).toHaveLength(11);
    expect(defense(s)).toHaveLength(11);
    expect(offense(s).every((p) => p.y < 25)).toBe(true);
    expect(defense(s).every((p) => p.y > 25)).toBe(true);
    expect(s.ball).toEqual({ state: "held", carrier: offense(s).find((p) => p.role === "QB")!.id });
  });

  it("pass plays have targets; runs don't", () => {
    expect(targets(createSim(play("FOUR VERTS"), 25, AVG, 1)).length).toBe(5);
    expect(targets(createSim(play("PA POST"), 25, AVG, 1)).length).toBe(4);
    expect(targets(createSim(play("HB DIVE"), 25, AVG, 1))).toEqual([]);
  });
});

describe("runs", () => {
  it("hands off to the RB, who you then steer", () => {
    const s = runFor(createSim(play("HB DIVE"), 25, AVG, 2), 0.5);
    const rb = offense(s).find((p) => p.role === "RB")!;
    expect(s.ball.carrier).toBe(rb.id);
    expect(s.controlled).toBe(rb.id);
    expect(s.events).toContain("HANDOFF");
  });

  it("with nobody there, the RB runs it in for a touchdown", () => {
    const s = runFor(noDefense(createSim(play("HB DIVE"), 25, AVG, 3)), 20);
    expect(s.result).toMatchObject({ how: "touchdown", yards: 75 });
    expect(offense(s).every((p) => p.act === "celebrate")).toBe(true);
  });

  it("running for the sideline ends out of bounds at that spot", () => {
    const s = noDefense(createSim(play("HB TOSS"), 25, AVG, 4));
    runFor(s, 6, { dir: { x: 1, y: 0.2 }, juke: false });
    expect(s.result?.how).toBe("out of bounds");
    expect(s.result!.yards).toBeGreaterThanOrEqual(-3);
  });

  it("a defender in the way makes the tackle at the runner's spot", () => {
    const s = createSim(play("HB DIVE"), 25, AVG, 5);
    runFor(s, 0.5);
    const rb = s.players[s.controlled!];
    const d = defense(s)[4];
    d.engagedUntil = undefined;
    d.x = rb.x;
    d.y = rb.y + 3;
    runFor(s, 2);
    expect(s.result?.how).toBe("tackle");
    expect(s.players[s.controlled!].act).toBe("tackled");
  });

  it("a juke freezes nearby defenders for a moment", () => {
    const s = createSim(play("HB DIVE"), 25, AVG, 6);
    runFor(s, 0.5);
    const rb = s.players[s.controlled!];
    const d = defense(s)[5];
    d.engagedUntil = undefined;
    d.x = rb.x + 1;
    d.y = rb.y + 2;
    step(s, { dir: { x: 1, y: 0 }, juke: true });
    expect(s.events).toContain("JUKE");
    expect(d.act).toBe("stumble");
    // can't juke again right away
    step(s, { dir: { x: 1, y: 0 }, juke: true });
    expect(s.events.filter((e) => e === "JUKE")).toHaveLength(1);
  });
});

describe("passes", () => {
  it("an uncovered receiver catches it, and you take over", () => {
    const s = noDefense(createSim(play("SLANTS"), 25, AVG, 7));
    runFor(s, 1);
    const wr = targets(s)[0];
    step(s, { dir: { x: 0, y: 0 }, juke: false, throwTo: wr });
    expect(s.ball.state).toBe("air");
    expect(ballPosition(s).h).toBeGreaterThan(1);
    runFor(s, 3);
    expect(s.events).toContain("CAUGHT");
    expect(s.controlled).toBe(wr);
  });

  it("can't throw before the play-action fake finishes", () => {
    const s = createSim(play("PA POST"), 25, AVG, 8);
    runFor(s, 0.2);
    step(s, { dir: { x: 0, y: 0 }, juke: false, throwTo: targets(s)[0] });
    expect(s.ball.state).toBe("held");
  });

  it("holding it forever gets you sacked behind the line", () => {
    const s = runFor(createSim(play("FOUR VERTS"), 25, AVG, 9), 10);
    expect(s.result?.how).toBe("sack");
    expect(s.result!.yards).toBeLessThan(0);
  });

  it("separation is measured to the nearest defender", () => {
    const s = createSim(play("SLANTS"), 25, AVG, 10);
    const wr = targets(s)[0];
    expect(separation(s, wr)).toBeGreaterThan(0);
    expect(separation(noDefense(s), wr)).toBeGreaterThan(50);
  });
});

describe("determinism and balance", () => {
  it("same seed, same play", () => {
    const a = runFor(createSim(play("HB TOSS"), 30, AVG, 42), 12);
    const b = runFor(createSim(play("HB TOSS"), 30, AVG, 42), 12);
    expect(a.result).toEqual(b.result);
  });

  it("the deep shot is boom-or-bust, not a cheat code", () => {
    let tds = 0;
    const N = 200;
    for (let seed = 1; seed <= N; seed++) {
      const s = createSim(play("FOUR VERTS"), 30, AVG, seed);
      runFor(s, 1.5);
      if (!s.result) {
        const open = targets(s).sort((x, y) => separation(s, y) - separation(s, x))[0];
        step(s, { dir: { x: 0, y: 0 }, juke: false, throwTo: open });
        runFor(s, 15);
      }
      if (s.result!.how === "touchdown") tds++;
    }
    expect(tds / N).toBeGreaterThan(0.04);
    expect(tds / N).toBeLessThan(0.15);
  });

  it("a simple bot gets sane results over many plays", () => {
    let runYards = 0;
    let runs = 0;
    let comps = 0;
    let passes = 0;
    let sacks = 0;
    let picks = 0;
    for (let seed = 1; seed <= 150; seed++) {
      for (const call of PLAYS) {
        const s = createSim(call, 30, AVG, seed);
        if (call.kind === "run") {
          runFor(s, 15);
          runYards += s.result!.yards;
          runs++;
        } else {
          runFor(s, 1.5);
          if (!s.result) {
            const open = targets(s).sort((x, y) => separation(s, y) - separation(s, x))[0];
            step(s, { dir: { x: 0, y: 0 }, juke: false, throwTo: open });
            runFor(s, 15);
          }
          passes++;
          if (s.events.includes("CAUGHT")) comps++;
          if (s.result!.how === "sack") sacks++;
          if (s.result!.how === "interception") picks++;
        }
      }
    }
    const ypc = runYards / runs;
    expect(ypc).toBeGreaterThan(1);
    expect(ypc).toBeLessThan(15);
    expect(comps / passes).toBeGreaterThan(0.35);
    expect(comps / passes).toBeLessThan(0.9);
    expect(sacks / passes).toBeLessThan(0.25);
    expect(picks / passes).toBeLessThan(0.12);
  });
});
