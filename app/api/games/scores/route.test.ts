import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeStore } from "@/lib/games/fake-store";
import type { ScoreStore } from "@/lib/games/scores";

let store: ScoreStore | null = null;
vi.mock("@/lib/games/redis-store", () => ({ getScoreStore: () => store }));

const { GET, POST } = await import("./route");

const post = (body: unknown) =>
  POST(new Request("http://x/api/games/scores", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));

describe("/api/games/scores", () => {
  beforeEach(() => {
    store = fakeStore();
  });

  it("503s when the store isn't configured", async () => {
    store = null;
    expect((await GET()).status).toBe(503);
    expect((await post({ game: "qb", manager: "Peter Klensch", score: 1 })).status).toBe(503);
  });

  it("records a score and returns every leaderboard", async () => {
    const res = await post({ game: "kicker", manager: "Peter Klensch", score: 52 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kicker).toEqual([{ manager: "Peter Klensch", score: 52 }]);
    expect(Object.keys(body).sort()).toEqual(["coach", "kicker", "qb", "run"]);
    expect(await (await GET()).json()).toEqual(body);
  });

  it("keeps only a manager's best", async () => {
    await post({ game: "run", manager: "Frankie Nardone", score: 21 });
    const body = await (await post({ game: "run", manager: "Frankie Nardone", score: 7 })).json();
    expect(body.run).toEqual([{ manager: "Frankie Nardone", score: 21 }]);
  });

  it("400s on bad input: non-JSON, unknown manager, out of range", async () => {
    expect((await post("not json")).status).toBe(400);
    expect((await post({ game: "qb", manager: "Tom Brady", score: 10 })).status).toBe(400);
    expect((await post({ game: "kicker", manager: "Peter Klensch", score: 99 })).status).toBe(400);
  });
});
