import { describe, expect, it } from "vitest";
import { SleeperHttpError, type SleeperGet } from "./client";
import { fetchHistory, fetchLeagueChain, findUserLeagues } from "./ingest";
import type { SleeperLeague } from "./types";

function league(id: string, season: number, prev: string | null, settings: SleeperLeague["settings"] = {}): SleeperLeague {
  return { league_id: id, season: String(season), status: "complete", name: "L", previous_league_id: prev, total_rosters: 2, settings };
}

/** Serves canned responses by path and records every path requested. */
function fakeApi(routes: Record<string, unknown>) {
  const paths: string[] = [];
  const api: SleeperGet = {
    async get<T>(path: string) {
      paths.push(path);
      if (!(path in routes)) throw new SleeperHttpError(404, path);
      return routes[path] as T | null;
    },
  };
  return { api, paths };
}

describe("fetchLeagueChain", () => {
  it("walks previous_league_id to the first season, newest first", async () => {
    const { api } = fakeApi({
      "/league/c": league("c", 2024, "b"),
      "/league/b": league("b", 2023, "a"),
      "/league/a": league("a", 2022, null),
    });
    const chain = await fetchLeagueChain(api, "c");
    expect(chain.leagues.map((l) => l.league_id)).toEqual(["c", "b", "a"]);
    expect(chain.stoppedBecause).toBe("no-previous");
  });

  it("treats a previous id of '0' as the end of the chain", async () => {
    const { api } = fakeApi({ "/league/a": league("a", 2022, "0") });
    expect((await fetchLeagueChain(api, "a")).stoppedBecause).toBe("no-previous");
  });

  it("stops on a cycle instead of looping", async () => {
    const { api } = fakeApi({ "/league/a": league("a", 2023, "b"), "/league/b": league("b", 2022, "a") });
    const chain = await fetchLeagueChain(api, "a");
    expect(chain.leagues).toHaveLength(2);
    expect(chain.stoppedBecause).toBe("cycle");
  });

  it("stops at maxSeasons", async () => {
    const { api } = fakeApi({ "/league/c": league("c", 2024, "b"), "/league/b": league("b", 2023, "a"), "/league/a": league("a", 2022, null) });
    const chain = await fetchLeagueChain(api, "c", { maxSeasons: 2 });
    expect(chain.leagues).toHaveLength(2);
    expect(chain.stoppedBecause).toBe("max-seasons");
  });

  it("records a missing predecessor (404 or null) without losing newer seasons", async () => {
    const { api } = fakeApi({ "/league/b": league("b", 2023, "gone"), "/league/nullish": null });
    const chain = await fetchLeagueChain(api, "b");
    expect(chain.leagues.map((l) => l.league_id)).toEqual(["b"]);
    expect(chain.stoppedBecause).toBe("missing-league");
    const nullChain = await fetchLeagueChain(fakeApi({ "/league/nullish": null }).api, "nullish");
    expect(nullChain.leagues).toHaveLength(0);
    expect(nullChain.stoppedBecause).toBe("missing-league");
  });
});

describe("fetchHistory", () => {
  const routes = {
    "/league/b": league("b", 2023, "a", { last_scored_leg: 2 }),
    "/league/a": league("a", 2022, null, { leg: 3 }),
    "/league/b/users": [{ user_id: "u", display_name: "U", avatar: null }],
    "/league/b/rosters": [],
    "/league/b/winners_bracket": [],
    "/league/b/matchups/1": [{ roster_id: 1, matchup_id: 1, points: 1 }],
    "/league/b/matchups/2": null,
    "/league/a/users": [],
    "/league/a/rosters": [],
    "/league/a/winners_bracket": null,
    "/league/a/matchups/1": [],
    "/league/a/matchups/2": [],
    "/league/a/matchups/3": [],
  };

  it("returns seasons oldest-first and fetches weeks 1..last_scored_leg (falling back to leg)", async () => {
    const { api, paths } = fakeApi(routes);
    const history = await fetchHistory(api, "b");
    expect(history.seasons.map((s) => s.league.league_id)).toEqual(["a", "b"]);
    expect(paths.filter((p) => p.startsWith("/league/b/matchups/"))).toHaveLength(2);
    expect(paths.filter((p) => p.startsWith("/league/a/matchups/"))).toHaveLength(3);
  });

  it("normalises null bodies to empty arrays", async () => {
    const { api } = fakeApi(routes);
    const [a, b] = (await fetchHistory(api, "b")).seasons;
    expect(a.winnersBracket).toEqual([]);
    expect(b.matchupsByWeek[2]).toEqual([]);
  });

  it("defaults to 18 weeks when the league gives no week setting", async () => {
    const r: Record<string, unknown> = { "/league/z": league("z", 2020, null), "/league/z/users": [], "/league/z/rosters": [], "/league/z/winners_bracket": [] };
    for (let w = 1; w <= 18; w++) r[`/league/z/matchups/${w}`] = [];
    const { api, paths } = fakeApi(r);
    await fetchHistory(api, "z");
    expect(paths.filter((p) => p.startsWith("/league/z/matchups/"))).toHaveLength(18);
  });
});

describe("findUserLeagues", () => {
  it("resolves a username to its leagues for a season", async () => {
    const { api } = fakeApi({
      "/user/frank": { user_id: "99", display_name: "frank" },
      "/user/99/leagues/nfl/2025": [league("x", 2025, null)],
    });
    const found = await findUserLeagues(api, "frank", 2025);
    expect(found?.map((l) => l.league_id)).toEqual(["x"]);
  });

  it("returns null for an unknown username", async () => {
    const { api } = fakeApi({ "/user/ghost": null });
    expect(await findUserLeagues(api, "ghost", 2025)).toBeNull();
  });
});
