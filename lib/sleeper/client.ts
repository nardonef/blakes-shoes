export const SLEEPER_BASE_URL = "https://api.sleeper.app/v1";

export class SleeperHttpError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
  ) {
    super(`Sleeper ${status} for ${path}`);
  }
}

/** The one method the ingest needs; a fake implements this in tests. */
export interface SleeperGet {
  /** Sleeper answers 200 with a null body for unknown users/leagues, so null is a valid result. */
  get<T>(path: string): Promise<T | null>;
}

export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export interface SleeperClientOptions {
  fetchImpl?: typeof fetch;
  clock?: Clock;
  /** Minimum gap between request starts. 80ms ~ 750 calls/min, under the documented 1000/min. */
  minIntervalMs?: number;
  maxAttempts?: number;
  baseDelayMs?: number;
}

const realClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

export function createSleeperClient(opts: SleeperClientOptions = {}) {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const clock = opts.clock ?? realClock;
  const minIntervalMs = opts.minIntervalMs ?? 80;
  const maxAttempts = opts.maxAttempts ?? 4;
  const baseDelayMs = opts.baseDelayMs ?? 500;

  let nextStart = 0;
  let calls = 0;

  // Reserve the next start slot synchronously so concurrent callers queue up in order.
  async function waitForSlot() {
    const start = Math.max(clock.now(), nextStart);
    nextStart = start + minIntervalMs;
    const wait = start - clock.now();
    if (wait > 0) await clock.sleep(wait);
  }

  async function get<T>(path: string): Promise<T | null> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await waitForSlot();
      calls++;
      try {
        const res = await fetchImpl(`${SLEEPER_BASE_URL}${path}`, { headers: { accept: "application/json" } });
        if (res.ok) return (await res.json()) as T | null;
        // Only rate limits and server errors are worth retrying.
        if (res.status !== 429 && res.status < 500) throw new SleeperHttpError(res.status, path);
        lastError = new SleeperHttpError(res.status, path);
      } catch (error) {
        if (error instanceof SleeperHttpError && error.status < 500 && error.status !== 429) throw error;
        lastError = error;
      }
      if (attempt < maxAttempts) await clock.sleep(baseDelayMs * 2 ** (attempt - 1));
    }
    throw lastError;
  }

  return { get, callCount: () => calls };
}
