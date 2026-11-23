// One play on the field, 11 on 11. Pure and deterministic for a seed: the 3D layer calls step()
// every frame with the player's input and draws whatever state comes back.
//
// Coordinates are yards: x across the field (0 to 53.3), y from your own goal line.

import { dist, FIELD_WIDTH, seededRng, stepToward, type Rng, type Vec } from "@/lib/games/core";
import { DEFENSE_ALIGN, OFFENSE_ALIGN, type PlayCall, type Role } from "./plays";

export const DT = 1 / 60;
export const TACKLE_RADIUS = 1;
const BALL_SPEED = 21;
const BALL_X = FIELD_WIDTH / 2;
const JUKE_TIME = 0.35;
const JUKE_COOLDOWN = 1.4;
const STUMBLE_TIME = 0.8;
const HANDOFF_AT = 0.45;

export type Coverage = "man" | "zone" | "blitz";

/** What the player's body is doing; the 3D layer maps this to an animation. */
export type Act = "stance" | "idle" | "jog" | "sprint" | "block" | "throw" | "tackled" | "dive" | "celebrate" | "stumble";

export interface Player {
  id: number;
  team: "off" | "def";
  role: Role;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Top speed, yards per second. */
  speed: number;
  act: Act;
  /** Absolute route (pass catchers) or run path (RB on runs). */
  path?: Vec[];
  /** Defender: whom he covers (man) or where he drops (zone). */
  cover?: number;
  zone?: Vec;
  /** Defender: man-coverage reaction lag in seconds. */
  lag?: number;
  /** Lineman or rusher: engaged until this time. */
  engagedUntil?: number;
  /** Blocker: the defender he's assigned to. */
  blocking?: number;
  rush?: boolean;
  stumbleUntil?: number;
}

export interface Ball {
  state: "held" | "air" | "dead";
  carrier?: number;
  /** In the air. */
  from?: Vec;
  to?: Vec;
  t0?: number;
  t1?: number;
  target?: number;
}

export type EndHow = "tackle" | "out of bounds" | "incomplete" | "touchdown" | "interception" | "sack";

export interface PlayResult {
  how: EndHow;
  yards: number;
  duration: number;
  /** Who had the ball (or was thrown to). */
  by?: number;
}

export interface Ratings {
  qb: number;
  rb: number;
  wr1: number;
  wr2: number;
  flex: number;
  te: number;
  def: number;
}

export interface Sim {
  t: number;
  los: number;
  call: PlayCall;
  coverage: Coverage;
  players: Player[];
  ball: Ball;
  /** The player you're steering, once the ball is in a runner's hands. */
  controlled?: number;
  jukeUntil: number;
  jukeReadyAt: number;
  jukeDir: number;
  /** When the QB gets hit if he still has the ball. */
  sackAt: number;
  result?: PlayResult;
  /** Short call-outs for the HUD ("CAUGHT", "JUKE", ...), newest last. */
  events: string[];
  rng: Rng;
  ratings: Ratings;
}

export interface Input {
  /** Steering direction, any length (normalized here); zero = keep running upfield. */
  dir: Vec;
  juke: boolean;
  /** Pass target: a player id. */
  throwTo?: number;
}

const NO_INPUT: Input = { dir: { x: 0, y: 0 }, juke: false };

const ratingFor = (r: Ratings, role: Role) =>
  role === "WR1" ? r.wr1 : role === "WR2" ? r.wr2 : role === "FLEX" ? r.flex : role === "TE" ? r.te : role === "RB" ? r.rb : 0.5;

function topSpeed(role: Role, r: Ratings): number {
  switch (role) {
    case "RB":
      return 7.6 + r.rb;
    case "WR1":
    case "WR2":
    case "FLEX":
      return 7.3 + 0.8 * ratingFor(r, role);
    case "TE":
      return 6.8 + 0.6 * r.te;
    case "QB":
      return 6;
    case "OL":
      return 4.5;
    case "DL":
      return 5.8 + 0.6 * r.def;
    case "LB":
      return 6.6 + 0.6 * r.def;
    case "CB":
      return 7.5 + 0.6 * r.def;
    case "S":
      return 7.3 + 0.6 * r.def;
  }
}

/** The defense's call: better real defenses blitz a bit more and play man a bit more. */
export function pickCoverage(rng: Rng, defRating: number): Coverage {
  const x = rng();
  if (x < 0.2 + 0.1 * defRating) return "blitz";
  if (x < 0.6 + 0.1 * defRating) return "man";
  return "zone";
}

/** Position along an absolute path after t seconds at `speed`; keeps going past the end. */
export function alongPath(path: Vec[], t: number, speed: number): Vec {
  let remaining = Math.max(0, t) * speed;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const seg = dist(a, b);
    if (remaining <= seg || i === path.length - 1) {
      const f = seg === 0 ? 0 : remaining / seg;
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }
    remaining -= seg;
  }
  return { ...path[0] };
}

export function createSim(call: PlayCall, los: number, ratings: Ratings, seed: number, coverage?: Coverage): Sim {
  const rng = seededRng(seed);
  const cov = coverage ?? pickCoverage(rng, ratings.def);
  const players: Player[] = [];
  for (const a of OFFENSE_ALIGN) {
    const x = BALL_X + a.x;
    const y = los + a.y;
    const p: Player = { id: players.length, team: "off", role: a.role, x, y, vx: 0, vy: 0, speed: topSpeed(a.role, ratings), act: "stance" };
    const route = call.routes[a.role as keyof PlayCall["routes"]];
    if (route) p.path = route.map((o) => ({ x: x + o.x, y: y + o.y }));
    if (a.role === "RB" && call.run) p.path = call.run.map((o) => ({ x: x + o.x, y: y + o.y }));
    players.push(p);
  }
  const off = (role: Role) => players.find((p) => p.team === "off" && p.role === role)!;
  // Pocket time: one rusher gets loose when the QB's clock runs out; blitzes shave time off.
  const qbClock = 2.4 + rng() * 1.4 + ratings.qb * 0.6 - (cov === "blitz" ? 0.6 : 0);
  let rusherFree = Math.floor(rng() * 4);
  for (const a of DEFENSE_ALIGN) {
    const x = BALL_X + a.x;
    const y = los + a.y;
    const p: Player = { id: players.length, team: "def", role: a.role, x, y, vx: 0, vy: 0, speed: topSpeed(a.role, ratings), act: "stance" };
    if (a.role === "DL") {
      p.rush = true;
      p.engagedUntil = rusherFree-- === 0 ? qbClock : qbClock + 0.8 + rng() * 1.5;
      if (call.kind === "run") p.engagedUntil = 0.9 + rng() * 1.6;
    }
    players.push(p);
  }
  // Coverage assignments.
  const lbs = players.filter((p) => p.role === "LB");
  const cbs = players.filter((p) => p.role === "CB");
  const ss = players.filter((p) => p.role === "S");
  const lagFor = (role: Role) => 0.05 + rng() * 0.22 + ratingFor(ratings, role) * 0.15;
  if (cov === "zone") {
    cbs[0].zone = { x: BALL_X - 13, y: los + 14 };
    cbs[1].zone = { x: BALL_X + 13, y: los + 14 };
    ss[0].zone = { x: BALL_X - 8, y: los + 22 };
    ss[1].zone = { x: BALL_X + 8, y: los + 22 };
    lbs.forEach((lb, i) => (lb.zone = { x: BALL_X + (i - 1) * 9, y: los + 7 }));
  } else {
    const pairs: [Player, Role][] = [
      [cbs[0], "WR1"],
      [cbs[1], "WR2"],
      [ss[0], "FLEX"],
      [lbs[2], "TE"],
      [lbs[0], "RB"],
    ];
    for (const [d, role] of pairs) {
      d.cover = off(role).id;
      d.lag = lagFor(role);
    }
    ss[1].zone = { x: BALL_X, y: los + 20 };
    if (cov === "blitz") {
      lbs[1].rush = true;
      lbs[1].engagedUntil = qbClock - 0.3;
    } else lbs[1].zone = { x: BALL_X, y: los + 6 };
  }
  assignBlocks(players, call, rng);
  return {
    t: 0,
    los,
    call,
    coverage: cov,
    players,
    ball: { state: "held", carrier: off("QB").id },
    jukeUntil: 0,
    jukeReadyAt: 0,
    jukeDir: 1,
    sackAt: qbClock,
    events: [],
    rng,
    ratings,
  };
}

/**
 * Who blocks whom. Linemen take the four DL plus the middle linebacker on runs (the extra rusher on
 * blitzes); anyone else without a route takes the nearest unblocked defender. On runs, blocked
 * defenders are held up for a while before they shed and pursue.
 */
function assignBlocks(players: Player[], call: PlayCall, rng: Rng) {
  const def = players.filter((p) => p.team === "def");
  const taken = new Set<number>();
  const blockers = players.filter((p) => p.team === "off" && p.role !== "QB" && !p.path);
  const ol = blockers.filter((p) => p.role === "OL");
  const others = blockers.filter((p) => p.role !== "OL");
  const priority = (d: Player) => (d.role === "DL" ? 0 : d.rush ? 1 : d.role === "LB" ? 2 : 3);
  const take = (b: Player, pool: Player[]) => {
    const d = pool.filter((q) => !taken.has(q.id)).sort((x, y) => priority(x) - priority(y) || dist(x, b) - dist(y, b))[0];
    if (!d) return;
    taken.add(d.id);
    b.blocking = d.id;
    if (call.kind === "run") {
      const hold = d.role === "DL" ? 1 + rng() * 1.8 : d.role === "LB" ? 0.7 + rng() * 1.2 : 1 + rng() * 1.5;
      d.engagedUntil = Math.max(d.engagedUntil ?? 0, hold);
    }
  };
  // Linemen work left to right across the front.
  for (const b of [...ol].sort((x, y) => x.x - y.x)) take(b, def.filter((d) => d.role === "DL" || d.role === "LB" || d.rush));
  for (const b of others) take(b, def);
}

/**
 * Where a chaser at `from` running `speed` can meet a target moving at constant velocity: the
 * earliest t with |target + v t - from| = speed t, capped at 1.5 s ahead. Falls back to the target.
 */
export function interceptPoint(from: Vec, speed: number, target: Player): Vec {
  const rx = target.x - from.x;
  const ry = target.y - from.y;
  const a = target.vx * target.vx + target.vy * target.vy - speed * speed;
  const b = 2 * (rx * target.vx + ry * target.vy);
  const c = rx * rx + ry * ry;
  let t: number;
  if (Math.abs(a) < 1e-6) t = b < 0 ? -c / b : 1.5;
  else {
    const disc = b * b - 4 * a * c;
    if (disc < 0) t = 1.5;
    else {
      const roots = [(-b - Math.sqrt(disc)) / (2 * a), (-b + Math.sqrt(disc)) / (2 * a)].filter((r) => r > 0);
      t = roots.length ? Math.min(...roots) : 1.5;
    }
  }
  t = Math.min(1.5, t);
  return { x: target.x + target.vx * t, y: target.y + target.vy * t };
}

const byId = (s: Sim, id: number | undefined) => (id === undefined ? undefined : s.players[id]);
const role = (s: Sim, r: Role) => s.players.find((p) => p.team === "off" && p.role === r)!;

function moveTo(p: Player, target: Vec, speed: number) {
  const n = stepToward(p, target, speed, DT);
  p.vx = (n.x - p.x) / DT;
  p.vy = (n.y - p.y) / DT;
  p.x = n.x;
  p.y = n.y;
}

function end(s: Sim, how: EndHow, spotY: number, by?: number) {
  if (s.result) return;
  const yards = how === "incomplete" || how === "interception" ? 0 : Math.round(spotY - s.los);
  s.result = { how, yards, duration: Math.max(1, Math.round(s.t)), by };
  s.ball.state = "dead";
  for (const p of s.players) {
    p.vx = 0;
    p.vy = 0;
    if (p.act !== "tackled" && p.act !== "dive") p.act = "idle";
  }
  if (how === "touchdown") for (const p of s.players) if (p.team === "off") p.act = "celebrate";
}

/** Advance the play by one fixed step. Mutates and returns the sim. */
export function step(s: Sim, input: Input = NO_INPUT): Sim {
  if (s.result) return s;
  s.t += DT;
  const qb = role(s, "QB");
  const rb = role(s, "RB");
  const carrier = byId(s, s.ball.carrier);

  // --- Handoff (or pitch) on runs; after that you steer the RB.
  if (s.call.kind === "run" && s.ball.carrier === qb.id && (s.t >= HANDOFF_AT || (dist(qb, rb) < 1.2 && s.t > 0.25))) {
    s.ball.carrier = rb.id;
    s.controlled = rb.id;
    s.events.push("HANDOFF");
  }

  // --- Throw.
  if (input.throwTo !== undefined && s.call.kind === "pass" && s.ball.carrier === qb.id && s.t >= (s.call.fake ?? 0.3)) {
    const target = s.players[input.throwTo];
    if (target?.team === "off" && target.path) {
      let arrive = s.t + 0.4;
      let to = alongPath(target.path, arrive, target.speed);
      for (let i = 0; i < 4; i++) {
        arrive = s.t + dist(qb, to) / BALL_SPEED;
        to = alongPath(target.path, arrive, target.speed);
      }
      s.ball = { state: "air", from: { x: qb.x, y: qb.y }, to, t0: s.t, t1: arrive, target: target.id };
      qb.act = "throw";
      s.events.push("THROW");
    }
  }

  // --- Ball arrives.
  if (s.ball.state === "air" && s.t >= s.ball.t1!) {
    const target = s.players[s.ball.target!];
    const near = s.players.filter((p) => p.team === "def").reduce((m, d) => Math.min(m, dist(d, target)), Infinity);
    const sep = near + 0.5 * ratingFor(s.ratings, target.role);
    // Long balls are harder: full odds to about 12 air yards, down to 40% at 43+.
    const air = dist(s.ball.from!, s.ball.to!);
    const accuracy = Math.min(1, Math.max(0.4, 1.25 - air / 50));
    const pComplete = Math.min(0.92, Math.max(0.05, ((sep - 0.8) / 2.8) * accuracy));
    if (s.rng() < pComplete) {
      s.ball = { state: "held", carrier: target.id };
      s.controlled = target.id;
      s.events.push("CAUGHT");
    } else if (s.rng() < (sep < 1 ? 0.25 : 0.05) + (air > 25 ? 0.1 : 0)) {
      s.events.push("INTERCEPTED");
      end(s, "interception", s.los, target.id);
      return s;
    } else {
      s.events.push("INCOMPLETE");
      end(s, "incomplete", s.los, target.id);
      return s;
    }
  }

  const ball = byId(s, s.ball.carrier) ?? carrier;
  const runnerLoose = ball && ball.id === s.controlled;

  // --- Offense.
  for (const p of s.players.filter((q) => q.team === "off")) {
    if (p.id === s.controlled) continue;
    if (p.role === "QB") {
      if (s.ball.carrier === p.id) {
        // Drop back a couple of yards; on runs meet the back.
        moveTo(p, s.call.kind === "run" ? rb : { x: BALL_X, y: s.los - 7 }, 3);
        p.act = s.call.fake && s.t < s.call.fake ? "jog" : "idle";
      } else {
        moveTo(p, p, 0);
        if (s.ball.state !== "air" || s.t - (s.ball.t0 ?? 0) > 0.5) p.act = "idle";
      }
      continue;
    }
    if (!p.path || (runnerLoose && p.role === "OL")) {
      // Block: stay between your man and the ball (or the nearest defender if unassigned).
      const d =
        byId(s, p.blocking) ??
        s.players.filter((q) => q.team === "def" && q.y > p.y - 2).reduce<Player | undefined>((m, q) => (!m || dist(q, p) < dist(m, p) ? q : m), undefined);
      if (d) moveTo(p, { x: d.x, y: d.y - 1 }, p.speed * 1.3);
      p.act = "block";
      continue;
    }
    if (!runnerLoose) {
      const at = s.call.kind === "run" && p.role === "RB" ? alongPath(p.path, s.t, p.speed * 0.8) : alongPath(p.path, s.t, p.speed);
      moveTo(p, at, p.speed * 1.2);
      p.act = "sprint";
      continue;
    }
    // Downfield blockers once a runner is loose: lead the way.
    if (ball) moveTo(p, { x: ball.x + (p.x < ball.x ? -2 : 2), y: ball.y + 4 }, p.speed * 0.8);
    p.act = "jog";
  }

  // --- The runner you control.
  const me = byId(s, s.controlled);
  if (me) {
    let dx = input.dir.x;
    let dy = input.dir.y;
    if (dx === 0 && dy === 0) dy = 1;
    const m = Math.hypot(dx, dy);
    dx /= m;
    dy /= m;
    if (input.juke && s.t >= s.jukeReadyAt) {
      s.jukeUntil = s.t + JUKE_TIME;
      s.jukeReadyAt = s.t + JUKE_COOLDOWN;
      s.jukeDir = dx !== 0 ? Math.sign(dx) : s.rng() < 0.5 ? -1 : 1;
      s.events.push("JUKE");
      for (const d of s.players) if (d.team === "def" && dist(d, me) < 3) d.stumbleUntil = s.t + STUMBLE_TIME;
    }
    if (s.t < s.jukeUntil) {
      dx = s.jukeDir * 0.95;
      dy = 0.3;
    }
    const speed = s.t < s.jukeUntil ? me.speed * 1.1 : me.speed;
    me.vx = dx * speed;
    me.vy = dy * speed;
    me.x += me.vx * DT;
    me.y += me.vy * DT;
    me.act = "sprint";
  }

  // --- Defense.
  const target = byId(s, s.ball.carrier);
  for (const d of s.players.filter((q) => q.team === "def")) {
    if (d.stumbleUntil && s.t < d.stumbleUntil) {
      d.vx = d.vy = 0;
      d.act = "stumble";
      continue;
    }
    if (d.engagedUntil !== undefined && s.t < d.engagedUntil) {
      // Held up at the line: lean forward a little.
      moveTo(d, { x: d.x, y: d.y - 0.2 }, 0.4);
      d.act = "block";
      continue;
    }
    const chasingRunner = target && (target.id === s.controlled || (s.call.kind === "run" && target.id !== qb.id));
    if (d.rush && !chasingRunner && target) {
      moveTo(d, target, d.speed);
      d.act = "sprint";
      continue;
    }
    if (chasingRunner && target) {
      // Pursuit angle: aim where the runner will be.
      moveTo(d, interceptPoint(d, d.speed, target), d.speed);
      d.act = "sprint";
      continue;
    }
    if (s.ball.state === "air" && s.t - s.ball.t0! > 0.35 && dist(d, s.ball.to!) < 7) {
      // Break on the throw if he's close enough to make a play.
      moveTo(d, s.ball.to!, d.speed * 0.75);
      d.act = "sprint";
      continue;
    }
    const man = byId(s, d.cover);
    if (man?.path) {
      const shadow = alongPath(man.path, s.t - (d.lag ?? 0.2), man.speed);
      moveTo(d, { x: shadow.x, y: shadow.y + 0.8 }, d.speed * 1.15);
      d.act = "sprint";
      continue;
    }
    if (man) {
      // Covering a blocker: sit on him.
      moveTo(d, { x: man.x, y: man.y + 3 }, d.speed);
      d.act = "jog";
      continue;
    }
    if (d.zone) {
      // Drop, then squeeze the closest receiver in the area.
      const threat = s.players
        .filter((o) => o.team === "off" && o.path && dist(o, d.zone!) < 9)
        .reduce<Player | undefined>((m, o) => (!m || dist(o, d) < dist(m, d) ? o : m), undefined);
      moveTo(d, threat ? { x: threat.x, y: threat.y + 1.5 } : d.zone, d.speed * 0.9);
      d.act = dist(d, d.zone) > 0.5 || threat ? "jog" : "idle";
    }
  }

  // --- Sack.
  if (s.ball.state === "held" && s.ball.carrier === qb.id && s.call.kind === "pass") {
    const hit = s.players.find((d) => d.team === "def" && d.rush && dist(d, qb) < TACKLE_RADIUS && !(d.engagedUntil && s.t < d.engagedUntil));
    if (hit || s.t > s.sackAt + 2.5) {
      qb.act = "tackled";
      if (hit) hit.act = "dive";
      s.events.push("SACK");
      end(s, "sack", qb.y, qb.id);
      return s;
    }
  }

  // --- Runner: touchdown, sideline, tackle.
  if (me) {
    if (me.y >= 100) {
      s.events.push("TOUCHDOWN");
      end(s, "touchdown", 100, me.id);
      return s;
    }
    if (me.x < 0 || me.x > FIELD_WIDTH) {
      s.events.push("OUT OF BOUNDS");
      end(s, "out of bounds", me.y, me.id);
      return s;
    }
    if (s.t >= s.jukeUntil) {
      const tackler = s.players.find((d) => d.team === "def" && dist(d, me) < TACKLE_RADIUS && !(d.stumbleUntil && s.t < d.stumbleUntil) && !(d.engagedUntil && s.t < d.engagedUntil));
      if (tackler) {
        me.act = "tackled";
        tackler.act = "dive";
        s.events.push("TACKLED");
        end(s, "tackle", me.y, me.id);
        return s;
      }
    }
  }
  return s;
}

/** Run the sim for `seconds` with a fixed input (tests, previews). */
export function runFor(s: Sim, seconds: number, input: Input = NO_INPUT): Sim {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps && !s.result; i++) step(s, input);
  return s;
}

/** Where the ball is drawn: in a hand, or on its arc. Height in yards. */
export function ballPosition(s: Sim): Vec & { h: number } {
  if (s.ball.state === "air") {
    const f = Math.min(1, (s.t - s.ball.t0!) / (s.ball.t1! - s.ball.t0!));
    const len = dist(s.ball.from!, s.ball.to!);
    return {
      x: s.ball.from!.x + (s.ball.to!.x - s.ball.from!.x) * f,
      y: s.ball.from!.y + (s.ball.to!.y - s.ball.from!.y) * f,
      h: 2 + Math.sin(f * Math.PI) * Math.min(9, len / 4),
    };
  }
  const c = byId(s, s.ball.carrier) ?? role(s, "QB");
  return { x: c.x, y: c.y, h: 1.2 };
}

/** Pass targets you can throw to on this play (ids), in WR1, WR2, FLEX, TE, RB order. */
export function targets(s: Sim): number[] {
  if (s.call.kind !== "pass") return [];
  return (["WR1", "WR2", "FLEX", "TE", "RB"] as Role[]).map((r) => role(s, r)).filter((p) => p.path).map((p) => p.id);
}

/** Separation of a pass catcher from the nearest defender, for the open/covered indicator. */
export function separation(s: Sim, id: number): number {
  const p = s.players[id];
  return s.players.filter((d) => d.team === "def").reduce((m, d) => Math.min(m, dist(d, p)), Infinity);
}
