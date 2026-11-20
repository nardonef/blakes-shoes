// Shared leaderboard: each game keeps every manager's best score (a Redis sorted set per game).

import { z } from "zod";

export const GAMES = {
  kicker: { label: "KICKER", unit: "YD", min: 0, max: 75 },
  qb: { label: "QB", unit: "YDS", min: 0, max: 500 },
  run: { label: "RUN", unit: "PTS", min: 0, max: 999 },
  coach: { label: "COACH", unit: "MARGIN", min: -99, max: 99 },
} as const;

export type GameId = keyof typeof GAMES;
export const GAME_IDS = Object.keys(GAMES) as GameId[];

export interface ScoreEntry {
  manager: string;
  score: number;
}

/** The two sorted-set operations the leaderboard needs; Upstash Redis in prod, a fake in tests. */
export interface ScoreStore {
  /** Add member with score, keeping the existing score if it's higher. */
  addIfGreater(key: string, member: string, score: number): Promise<void>;
  /** Highest `n` members, best first. */
  top(key: string, n: number): Promise<ScoreEntry[]>;
}

export const scoreKey = (game: GameId) => `games:${game}`;

export function parseSubmission(
  body: unknown,
  managers: readonly string[],
): { ok: true; game: GameId; manager: string; score: number } | { ok: false; error: string } {
  const parsed = z
    .object({ game: z.enum(GAME_IDS as [GameId, ...GameId[]]), manager: z.string(), score: z.number().int() })
    .safeParse(body);
  if (!parsed.success) return { ok: false, error: "Invalid score" };
  const { game, manager, score } = parsed.data;
  if (!managers.includes(manager)) return { ok: false, error: "Unknown manager" };
  if (score < GAMES[game].min || score > GAMES[game].max) return { ok: false, error: "Score out of range" };
  return { ok: true, game, manager, score };
}

export async function allLeaderboards(store: ScoreStore, n = 12): Promise<Record<GameId, ScoreEntry[]>> {
  const lists = await Promise.all(GAME_IDS.map((g) => store.top(scoreKey(g), n)));
  return Object.fromEntries(GAME_IDS.map((g, i) => [g, lists[i]])) as Record<GameId, ScoreEntry[]>;
}

/** Signed display: coach margins get a "+", everything else is plain. */
export function formatScore(game: GameId, score: number): string {
  return game === "coach" && score > 0 ? `+${score}` : String(score);
}
