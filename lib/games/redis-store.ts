// Upstash Redis-backed ScoreStore. Returns null when the store isn't configured (e.g. local dev
// without `vercel env pull`), so the API can report the leaderboard as offline.

import { Redis } from "@upstash/redis";
import type { ScoreStore } from "./scores";

let store: ScoreStore | null | undefined;

export function getScoreStore(): ScoreStore | null {
  if (store !== undefined) return store;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return (store = null);
  const redis = new Redis({ url, token });
  store = {
    async addIfGreater(key, member, score) {
      await redis.zadd(key, { gt: true }, { score, member });
    },
    async top(key, n) {
      const flat = await redis.zrange<(string | number)[]>(key, 0, n - 1, { rev: true, withScores: true });
      const out = [];
      for (let i = 0; i < flat.length; i += 2) out.push({ manager: String(flat[i]), score: Number(flat[i + 1]) });
      return out;
    },
  };
  return store;
}
