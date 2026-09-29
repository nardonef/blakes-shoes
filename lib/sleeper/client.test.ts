import { describe, expect, it, vi } from "vitest";
import { createSleeperClient, SleeperHttpError, type Clock } from "./client";

function fakeClock() {
  const sleeps: number[] = [];
  const clock: Clock = {
    now: () => 1000,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
  };
  return { clock, sleeps };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("createSleeperClient", () => {
  it("returns parsed JSON, including a null body", async () => {
    const { clock } = fakeClock();
    const client = createSleeperClient({ clock, minIntervalMs: 0, fetchImpl: async () => json(null) });
    expect(await client.get("/user/nobody")).toBeNull();
  });

  it("retries 429 and 5xx with exponential backoff, then succeeds", async () => {
    const { clock, sleeps } = fakeClock();
    const statuses = [500, 429, 200];
    const client = createSleeperClient({
      clock,
      minIntervalMs: 0,
      baseDelayMs: 100,
      fetchImpl: async () => json({ ok: true }, statuses.shift()!),
    });
    expect(await client.get("/league/1")).toEqual({ ok: true });
    expect(sleeps).toEqual([100, 200]);
    expect(client.callCount()).toBe(3);
  });

  it("gives up after maxAttempts and throws the last error", async () => {
    const { clock } = fakeClock();
    const client = createSleeperClient({ clock, minIntervalMs: 0, baseDelayMs: 1, maxAttempts: 3, fetchImpl: async () => json({}, 503) });
    await expect(client.get("/league/1")).rejects.toMatchObject({ status: 503 });
    expect(client.callCount()).toBe(3);
  });

  it("does not retry other 4xx errors", async () => {
    const { clock } = fakeClock();
    const client = createSleeperClient({ clock, minIntervalMs: 0, fetchImpl: async () => json({}, 404) });
    await expect(client.get("/league/x")).rejects.toBeInstanceOf(SleeperHttpError);
    expect(client.callCount()).toBe(1);
  });

  it("retries network errors", async () => {
    const { clock } = fakeClock();
    let n = 0;
    const client = createSleeperClient({
      clock,
      minIntervalMs: 0,
      baseDelayMs: 1,
      fetchImpl: async () => {
        if (n++ === 0) throw new TypeError("fetch failed");
        return json([1]);
      },
    });
    expect(await client.get("/x")).toEqual([1]);
  });

  it("spaces concurrent request starts by minIntervalMs", async () => {
    vi.useFakeTimers();
    try {
      const t0 = Date.now();
      const starts: number[] = [];
      const client = createSleeperClient({
        minIntervalMs: 100,
        fetchImpl: async () => {
          starts.push(Date.now() - t0);
          return json([]);
        },
      });
      const all = Promise.all([client.get("/a"), client.get("/b"), client.get("/c")]);
      await vi.advanceTimersByTimeAsync(300);
      await all;
      expect(starts).toEqual([0, 100, 200]);
    } finally {
      vi.useRealTimers();
    }
  });
});
