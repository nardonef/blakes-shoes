import { describe, expect, it } from "vitest";
import { buildHistory, buildSeason } from "./transform";
import type { SeasonPayload } from "./types";

// 4-team league. Rosters 1-4 owned by u1-u4; roster 4's owner is missing in 2023.
function season(year: number, overrides: Partial<SeasonPayload> = {}): SeasonPayload {
  const names: Record<string, string> = { u1: "Ann", u2: "Bo", u3: "Cy", u4: "Di" };
  return {
    league: {
      league_id: `L${year}`,
      season: String(year),
      status: "complete",
      name: "Test League",
      previous_league_id: year > 2022 ? `L${year - 1}` : null,
      total_rosters: 4,
      settings: { playoff_week_start: 3, playoff_teams: 4, last_scored_leg: 4 },
    },
    users: Object.entries(names).map(([user_id, display_name]) => ({
      user_id,
      display_name,
      avatar: null,
      metadata: user_id === "u1" ? { team_name: "Ann's Aces" } : {},
    })),
    rosters: [
      { roster_id: 1, owner_id: "u1", settings: { wins: 2, losses: 0, ties: 0, fpts: 200, fpts_decimal: 50, fpts_against: 150 }, metadata: { streak: "2W" } },
      { roster_id: 2, owner_id: "u2", settings: { wins: 1, losses: 1, ties: 0, fpts: 180, fpts_against: 170 }, metadata: { streak: "1L" } },
      { roster_id: 3, owner_id: "u3", settings: { wins: 1, losses: 1, ties: 0, fpts: 170, fpts_against: 180 } },
      { roster_id: 4, owner_id: "u4", settings: { wins: 0, losses: 2, ties: 0, fpts: 100, fpts_against: 150 } },
    ],
    matchupsByWeek: {
      1: [
        { roster_id: 1, matchup_id: 1, points: 100 },
        { roster_id: 2, matchup_id: 1, points: 90 },
        { roster_id: 3, matchup_id: 2, points: 85 },
        { roster_id: 4, matchup_id: 2, points: 50 },
      ],
      2: [
        { roster_id: 1, matchup_id: 1, points: 100.5 },
        { roster_id: 3, matchup_id: 1, points: 85 },
        { roster_id: 2, matchup_id: 2, points: 90 },
        { roster_id: 4, matchup_id: 2, points: 50 },
      ],
      // playoffs: 1v2 championship path, 3v4 is the consolation game
      3: [
        { roster_id: 1, matchup_id: 1, points: 120 },
        { roster_id: 4, matchup_id: 1, points: 60 },
        { roster_id: 2, matchup_id: 2, points: 110 },
        { roster_id: 3, matchup_id: 2, points: 105 },
      ],
      4: [
        { roster_id: 1, matchup_id: 1, points: 99 },
        { roster_id: 2, matchup_id: 1, points: 101 },
        { roster_id: 3, matchup_id: 2, points: 70 },
        { roster_id: 4, matchup_id: 2, points: 40 },
      ],
    },
    winnersBracket: [
      { r: 1, m: 1, w: 1, l: 4 },
      { r: 1, m: 2, w: 2, l: 3 },
      { r: 2, m: 3, w: 2, l: 1, p: 1 },
      { r: 2, m: 4, w: 3, l: 4, p: 3 },
    ],
    ...overrides,
  };
}

describe("buildSeason", () => {
  it("derives champion, runner-up and third place from the p-marked bracket games", () => {
    const { champion } = buildSeason(season(2023));
    expect(champion).toMatchObject({
      season_year: 2023,
      champion_manager: "Bo",
      champion_team_name: "Bo",
      runner_up_manager: "Ann",
      runner_up_team_name: "Ann's Aces",
      third_place_manager: "Cy",
      champion_wins: 1,
      champion_losses: 1,
      champion_points_for: 180,
    });
  });

  it("returns no champion for an unfinished season or one with no final", () => {
    expect(buildSeason(season(2023, { league: { ...season(2023).league, status: "in_season" } })).champion).toBeNull();
    expect(buildSeason(season(2023, { winnersBracket: [] })).champion).toBeNull();
    const unplayed = [{ r: 2, m: 3, w: null, l: null, p: 1 }];
    expect(buildSeason(season(2023, { winnersBracket: unplayed })).champion).toBeNull();
  });

  it("builds standings in the existing Standing shape with bracket-derived ranks", () => {
    const { standings } = buildSeason(season(2023));
    const byRoster = Object.fromEntries(standings.map((s) => [s.team_id, s]));
    expect(byRoster["2"].final_rank).toBe(1);
    expect(byRoster["1"].final_rank).toBe(2);
    expect(byRoster["3"].final_rank).toBe(3);
    expect(byRoster["4"].final_rank).toBe(4);
    expect(byRoster["1"]).toMatchObject({
      season_year: 2023,
      team_key: "L2023.t.1",
      team_name: "Ann's Aces",
      manager_name: "Ann",
      win_percentage: 1,
      points_for: 200.5,
      streak_type: "win",
      streak_value: "2",
      playoff_seed: "1",
    });
    expect(byRoster["2"].streak_type).toBe("loss");
    expect(byRoster["3"].streak_type).toBe("");
  });

  it("adds the decimal part to points against", () => {
    const payload = season(2023);
    payload.rosters[0].settings.fpts_against_decimal = 25;
    const { standings } = buildSeason(payload);
    expect(standings.find((s) => s.team_id === "1")!.points_against).toBe(150.25);
    expect(standings.find((s) => s.team_id === "2")!.points_against).toBe(170);
  });

  it("ranks teams outside the bracket after placed teams, by record then points", () => {
    const partial = [{ r: 1, m: 1, w: 1, l: 2, p: 1 }];
    const { standings } = buildSeason(season(2023, { winnersBracket: partial }));
    const ranks = Object.fromEntries(standings.map((s) => [s.team_id, s.final_rank]));
    expect(ranks).toEqual({ "1": 1, "2": 2, "3": 3, "4": 4 });
  });

  it("classifies matchups and skips byes and unplayed weeks", () => {
    const payload = season(2023);
    payload.matchupsByWeek[5] = [
      { roster_id: 1, matchup_id: 1, points: 0 },
      { roster_id: 2, matchup_id: 1, points: 0 },
    ];
    payload.matchupsByWeek[1].push({ roster_id: 9, matchup_id: null, points: 10 });
    const { matchups } = buildSeason(payload);
    expect(matchups.filter((m) => m.week === 5)).toHaveLength(0);
    expect(matchups.filter((m) => m.week === 1)).toHaveLength(2);
    const wk = (n: number) => matchups.filter((m) => m.week === n).map((m) => m.matchup_type);
    expect(wk(2)).toEqual(["regular", "regular"]);
    // week 3: 1v4 and 2v3 are winners-bracket games; week 4: 1v2 final is playoff, 3v4 is the third-place game
    expect(wk(3)).toEqual(["playoff", "playoff"]);
    expect(wk(4)).toEqual(["playoff", "playoff"]);
  });

  it("marks playoff-week games outside the winners bracket as consolation", () => {
    const payload = season(2023, { winnersBracket: [{ r: 1, m: 1, w: 1, l: 2, p: 1 }] });
    const wk4 = buildSeason(payload).matchups.filter((m) => m.week === 4);
    expect(wk4.map((m) => m.matchup_type)).toEqual(["playoff", "consolation"]);
  });

  it("orders each matchup by roster id and names the winner by team name; ties have no winner", () => {
    const payload = season(2023);
    payload.matchupsByWeek[1] = [
      { roster_id: 2, matchup_id: 1, points: 90 },
      { roster_id: 1, matchup_id: 1, points: 90 },
    ];
    const [m] = buildSeason(payload).matchups.filter((x) => x.week === 1);
    expect(m).toMatchObject({ team1_manager: "Ann", team2_manager: "Bo", winner: "", is_tied: true });
    const w2 = buildSeason(payload).matchups.find((x) => x.week === 2)!;
    expect(w2.winner).toBe("Ann's Aces");
  });

  it("labels rosters with no owner instead of throwing", () => {
    const payload = season(2023);
    payload.rosters[3].owner_id = null;
    const { standings } = buildSeason(payload);
    expect(standings.find((s) => s.team_id === "4")!.manager_name).toBe("Unknown (roster 4)");
  });
});

describe("buildHistory", () => {
  it("resolves renamed users to their newest display name across seasons", () => {
    const old = season(2022);
    old.users[0].display_name = "AnnOld";
    const { standings, matchups, renamedUsers } = buildHistory([old, season(2023)]);
    expect(renamedUsers).toBe(1);
    expect(standings.filter((s) => s.season_year === 2022).map((s) => s.manager_name)).toContain("Ann");
    expect(matchups.every((m) => m.team1_manager !== "AnnOld")).toBe(true);
  });

  it("excludes consolation games from head-to-head", () => {
    const bracketOnlyFinal = [{ r: 1, m: 1, w: 1, l: 2, p: 1 }];
    const { h2h } = buildHistory([season(2023, { winnersBracket: bracketOnlyFinal })]);
    // Cy-Di met in wk1 (regular) and wk4 (consolation: not in bracket) => only wk1 counts
    expect(h2h.find((r) => r.manager1 === "Cy" && r.manager2 === "Di")!.total_matchups).toBe(1);
    // Ann-Bo: wk1 regular + wk4 final (in bracket) => both count
    expect(h2h.find((r) => r.manager1 === "Ann" && r.manager2 === "Bo")!.total_matchups).toBe(2);
  });

  it("aggregates head-to-head across seasons", () => {
    const { h2h } = buildHistory([season(2022), season(2023)]);
    const annBo = h2h.find((r) => r.manager1 === "Ann" && r.manager2 === "Bo")!;
    // per season: wk1 Ann win, wk3 (no meeting), wk4 Bo win => 1-1 per season
    expect(annBo).toMatchObject({ total_matchups: 4, manager1_wins: 2, manager2_wins: 2, ties: 0 });
    const cyDi = h2h.find((r) => r.manager1 === "Cy" && r.manager2 === "Di")!;
    // Cy-Di: wk1 (Cy win), wk4 third-place game (Cy win) per season
    expect(cyDi.total_matchups).toBe(4);
  });

  it("collects champions oldest-first", () => {
    const { champions } = buildHistory([season(2022), season(2023)]);
    expect(champions.map((c) => c.season_year)).toEqual([2022, 2023]);
  });
});
