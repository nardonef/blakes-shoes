// Test helper: in-memory ScoreStore.

import type { ScoreStore } from "./scores";

/** In-memory sorted sets with the same semantics as ZADD GT / ZRANGE REV. */
export function fakeStore(): ScoreStore & { sets: Map<string, Map<string, number>> } {
  const sets = new Map<string, Map<string, number>>();
  return {
    sets,
    async addIfGreater(key, member, score) {
      const s = sets.get(key) ?? new Map<string, number>();
      if (!s.has(member) || score > s.get(member)!) s.set(member, score);
      sets.set(key, s);
    },
    async top(key, n) {
      return [...(sets.get(key) ?? new Map<string, number>())]
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([manager, score]) => ({ manager, score }));
    },
  };
}
