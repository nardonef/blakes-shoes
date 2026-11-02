import { describe, expect, it } from "vitest";
import championsData from "@/data/champions.json";
import draftData from "@/data/draft_history.json";
import matchupsData from "@/data/matchups.json";
import standingsData from "@/data/standings.json";
import { HIDDEN, identifiedHiddenTeams, isKnownManager, personFor, personForAccount } from "./managers";
import { champions, matchups, standings } from "./stats-data";

const rawNames = new Set([
  ...standingsData.map((s) => s.manager_name),
  ...matchupsData.flatMap((m) => [m.team1_manager, m.team2_manager]),
  ...championsData.flatMap((c) => [c.champion_manager, c.runner_up_manager, c.third_place_manager]),
  ...draftData.map((d) => d.manager_name),
]);

describe("manager registry", () => {
  it("knows every account name in the data", () => {
    const unknown = [...rawNames].filter((n) => n !== HIDDEN && !isKnownManager(n));
    expect(unknown).toEqual([]);
  });

  it("merges each person's accounts, telling Ryan Kaplan and Ryan Jenks apart by case", () => {
    expect(personForAccount("eric")).toBe("Eric Rios");
    expect(personForAccount("efuego93")).toBe("Eric Rios");
    expect(personForAccount("John")).toBe("John Cox");
    expect(personForAccount("john")).toBe("John Cox");
    expect(personForAccount("Jake")).toBe("Jake Slagle");
    expect(personForAccount("Ryan")).toBe("Ryan Kaplan");
    expect(personForAccount("ryan")).toBe("Ryan Jenks");
    expect(personForAccount("Chris")).toBe("Chris Zolner");
    expect(personForAccount("Kyle")).toBe("Kyle Cost");
    expect(personForAccount("Eric Rios")).toBe("Eric Rios");
  });

  it("names a hidden manager only for the season and team they ran", () => {
    expect(personFor(2017, "Cam Shoopton", HIDDEN)).toBe("John Cox");
    expect(personFor(2012, "Brianas red carpet", HIDDEN)).toBe("Ryan Jenks");
    expect(personFor(2012, "Chelsea vigorita", HIDDEN)).toBe(HIDDEN);
    expect(personFor(2018, "Cam Shoopton", HIDDEN)).toBe(HIDDEN);
  });

  it("only identifies hidden teams that exist in that season's standings", () => {
    for (const t of identifiedHiddenTeams()) {
      const row = standingsData.find((s) => s.season_year === t.season && s.team_name === t.team);
      expect(row?.manager_name, `${t.season} ${t.team}`).toBe(HIDDEN);
    }
  });

  it("leaves the 11 unidentified hidden team-seasons hidden", () => {
    expect(standingsData.filter((s) => s.manager_name === HIDDEN)).toHaveLength(16);
    expect(standings.filter((s) => s.manager_name === HIDDEN)).toHaveLength(11);
  });
});

describe("normalized data", () => {
  const owner = new Map(standings.map((s) => [`${s.season_year}|${s.team_name}`, s.manager_name]));

  it("agrees with standings on who ran each team in every matchup", () => {
    const mismatches = matchups.flatMap((m) =>
      [
        [m.team1_name, m.team1_manager],
        [m.team2_name, m.team2_manager],
      ]
        .filter(([team, mgr]) => owner.get(`${m.season_year}|${team}`) !== mgr)
        .map(([team, mgr]) => `${m.season_year} wk${m.week} ${team}: ${mgr}`),
    );
    expect(mismatches).toEqual([]);
  });

  it("agrees with standings on every champion, runner-up and third place", () => {
    for (const c of champions) {
      expect(c.champion_manager).toBe(owner.get(`${c.season_year}|${c.champion_team_name}`));
      expect(c.runner_up_manager).toBe(owner.get(`${c.season_year}|${c.runner_up_team_name}`));
      expect(c.third_place_manager).toBe(owner.get(`${c.season_year}|${c.third_place_team_name}`));
    }
  });
});
