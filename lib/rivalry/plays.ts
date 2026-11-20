// Offensive play calls: formation is fixed (shotgun, 2 wide + slot + TE, RB beside the QB); each
// play sets routes and the run path. Points are offsets from the player's own alignment, in yards
// (x across the field, y downfield from the line of scrimmage).

import type { Vec } from "@/lib/games/core";

export type Skill = "QB" | "RB" | "WR1" | "WR2" | "FLEX" | "TE";
export type Role = Skill | "OL" | "DL" | "LB" | "CB" | "S";

export interface PlayCall {
  name: string;
  kind: "run" | "pass";
  /** One-line description for the play-call card. */
  blurb: string;
  /** Run path for the RB (handoff happens on the way). */
  run?: Vec[];
  /** Pass routes by skill player; players without one block. */
  routes: Partial<Record<Exclude<Skill, "QB">, Vec[]>>;
  /** Seconds the QB holds a play-action fake before he can throw. */
  fake?: number;
}

/**
 * Offense alignment: offsets from the ball (x) and the line of scrimmage (y). Splits are tighter
 * than a real field's so all 22 players fit a phone screen in portrait.
 */
export const OFFENSE_ALIGN: { role: Role; x: number; y: number }[] = [
  { role: "OL", x: -4, y: -1 },
  { role: "OL", x: -2, y: -1 },
  { role: "OL", x: 0, y: -1 },
  { role: "OL", x: 2, y: -1 },
  { role: "OL", x: 4, y: -1 },
  { role: "QB", x: 0, y: -5 },
  { role: "RB", x: 1.8, y: -5 },
  { role: "WR1", x: -13, y: -1 },
  { role: "WR2", x: 13, y: -1 },
  { role: "FLEX", x: -8.5, y: -1.5 },
  { role: "TE", x: 6.5, y: -1.2 },
];

export const DEFENSE_ALIGN: { role: Role; x: number; y: number }[] = [
  { role: "DL", x: -5, y: 1 },
  { role: "DL", x: -1.7, y: 1 },
  { role: "DL", x: 1.7, y: 1 },
  { role: "DL", x: 5, y: 1 },
  { role: "LB", x: -6, y: 5 },
  { role: "LB", x: 0, y: 5.5 },
  { role: "LB", x: 6, y: 5 },
  { role: "CB", x: -13, y: 6 },
  { role: "CB", x: 13, y: 6 },
  { role: "S", x: -7, y: 13 },
  { role: "S", x: 7, y: 13 },
];

export const PLAYS: PlayCall[] = [
  {
    name: "HB DIVE",
    kind: "run",
    blurb: "Straight downhill behind the guards. Hit the hole fast.",
    run: [{ x: 0, y: 0 }, { x: -1.6, y: 1 }, { x: -2, y: 5 }],
    routes: {},
  },
  {
    name: "HB TOSS",
    kind: "run",
    blurb: "Pitch it outside and race the edge. Big play or stuffed.",
    run: [{ x: 0, y: 0 }, { x: 8, y: -1 }, { x: 13, y: 1 }, { x: 14, y: 6 }],
    routes: {},
  },
  {
    name: "SLANTS",
    kind: "pass",
    blurb: "Quick inside breaks. Get it out before the rush gets home.",
    routes: {
      WR1: [{ x: 0, y: 0 }, { x: 0, y: 4 }, { x: 9, y: 11 }, { x: 13, y: 22 }],
      WR2: [{ x: 0, y: 0 }, { x: 0, y: 4 }, { x: -9, y: 11 }, { x: -13, y: 22 }],
      FLEX: [{ x: 0, y: 0 }, { x: 0, y: 6 }, { x: 7, y: 12 }, { x: 9, y: 24 }],
      TE: [{ x: 0, y: 0 }, { x: 0, y: 7 }, { x: -6, y: 12 }],
      RB: [{ x: 0, y: 0 }, { x: 6, y: 1 }, { x: 12, y: 3 }],
    },
  },
  {
    name: "CURL FLAT",
    kind: "pass",
    blurb: "Outside curls and a flat. Safe yards and a shot at the sideline.",
    routes: {
      WR1: [{ x: 0, y: 0 }, { x: 0, y: 12 }, { x: 1.5, y: 10 }],
      WR2: [{ x: 0, y: 0 }, { x: 0, y: 12 }, { x: -1.5, y: 10 }],
      FLEX: [{ x: 0, y: 0 }, { x: -3, y: 2 }, { x: -10, y: 3 }],
      TE: [{ x: 0, y: 0 }, { x: 0, y: 8 }, { x: -1, y: 6.5 }],
      RB: [{ x: 0, y: 0 }, { x: 7, y: 1 }, { x: 14, y: 2 }],
    },
  },
  {
    name: "FOUR VERTS",
    kind: "pass",
    blurb: "Everybody goes. Find the one who beat his man deep.",
    routes: {
      WR1: [{ x: 0, y: 0 }, { x: 0, y: 45 }],
      WR2: [{ x: 0, y: 0 }, { x: 0, y: 45 }],
      FLEX: [{ x: 0, y: 0 }, { x: 2, y: 10 }, { x: 2, y: 45 }],
      TE: [{ x: 0, y: 0 }, { x: -1, y: 10 }, { x: -1, y: 45 }],
      RB: [{ x: 0, y: 0 }, { x: -3, y: 2 }, { x: -3, y: 4 }],
    },
  },
  {
    name: "PA POST",
    kind: "pass",
    blurb: "Fake the run, hold it, then hit the post over the top.",
    fake: 0.7,
    routes: {
      WR1: [{ x: 0, y: 0 }, { x: 0, y: 12 }, { x: 13, y: 30 }, { x: 17, y: 45 }],
      WR2: [{ x: 0, y: 0 }, { x: 0, y: 12 }, { x: -13, y: 13 }],
      FLEX: [{ x: 0, y: 0 }, { x: 0, y: 10 }, { x: -9, y: 22 }],
      TE: [{ x: 0, y: 0 }, { x: -2, y: 3 }, { x: -16, y: 5 }],
    },
  },
];
