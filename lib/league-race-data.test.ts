import { describe, it, expect } from "vitest";
import { getLeagueRace } from "./league-race-data";
import { standingsAt, seasonCaption, leadersBySeason, leadChanges, closestCall, raceHeadline } from "./league-race";
import { getManagerLegacies } from "./legacy-data";

describe("getLeagueRace (real league data)", () => {
  const race = getLeagueRace();
  const m = (name: string) => race.managers.find((x) => x.name === name)!;

  it("covers every season from 2012 with the current one live", () => {
    expect(race.seasons[0]).toBe(2012);
    expect(race.seasons).toEqual(Array.from({ length: race.seasons.length }, (_, i) => 2012 + i));
    expect(race.liveSeason).toBe(race.seasons.at(-1));
  });

  it("has all 12 current owners with photos", () => {
    expect(race.managers).toHaveLength(12);
    for (const x of race.managers) expect(x.image).toMatch(/^\/owners\/.+\.jpg$/);
  });

  it("ends each manager's line at their career win total", () => {
    for (const l of getManagerLegacies()) expect(m(l.owner.name).cumWins.at(-1)).toBe(l.wins);
  });

  it("never decreases, and stays at 0 before a manager joins", () => {
    for (const x of race.managers) {
      x.cumWins.forEach((v, i) => i && expect(v).toBeGreaterThanOrEqual(x.cumWins[i - 1]));
    }
    const falcone = m("Tyler Falcone");
    expect(falcone.cumWins[race.seasons.indexOf(2023)]).toBe(0);
    expect(falcone.cumWins[race.seasons.indexOf(2024)]).toBeGreaterThan(0);
  });

  it("matches the legacy page's title years", () => {
    expect(m("Ryan Jenks").titleYears).toEqual([2022, 2024]);
    expect(m("Peter Klensch").titleYears).toEqual([2018, 2021]);
  });

  it("has Peter Klensch leading every season, so the lead never changed hands", () => {
    expect(new Set(leadersBySeason(race))).toEqual(new Set(["Peter Klensch"]));
    expect(leadChanges(race)).toBe(0);
  });

  it("headlines Peter's run and Curran's 2014 tie", () => {
    expect(raceHeadline(race)).toBe(
      "Peter K. has led or shared the all-time lead every season since 2012. Only Ryan C. has caught him, tying it up in 2014.",
    );
  });

  it("finds a real closest call behind Peter", () => {
    const c = closestCall(race);
    expect(c.leader).toBe("Peter K.");
    expect(c.gap).toBeGreaterThanOrEqual(0);
    const [first, second] = standingsAt(race, c.index);
    expect(first.value - second.value).toBe(c.gap);
  });

  it("captions champions, including the 2012 champ who has since left", () => {
    expect(seasonCaption(race, 2017)).toBe("2017 · Ryan Curran wins it all with Loose Cannons");
    expect(seasonCaption(race, 2012)).toMatch(/^2012 · Chris Zolner wins it all with /);
  });
});
