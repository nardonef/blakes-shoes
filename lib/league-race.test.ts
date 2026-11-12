import { describe, it, expect } from "vitest";
import {
  valueAt,
  standingsAt,
  positionsAt,
  leadersBySeason,
  leadChanges,
  closestCall,
  raceHeadline,
  seasonCaption,
  shortName,
  type LeagueRace,
} from "./league-race";

const race: LeagueRace = {
  seasons: [2020, 2021, 2022],
  liveSeason: 2022,
  managers: [
    { name: "Ann Able", short: "Ann A.", image: "/a.jpg", cumWins: [10, 12, 20], titleYears: [2021] },
    { name: "Bob Baker", short: "Bob B.", image: "/b.jpg", cumWins: [5, 15, 18], titleYears: [] },
    { name: "Cal Cole", short: "Cal C.", image: "/c.jpg", cumWins: [0, 0, 4], titleYears: [] },
  ],
  champions: [
    { season: 2020, manager: "Zed Zolo", team: "Zeds" },
    { season: 2021, manager: "Ann Able", team: "Able Team" },
  ],
};

describe("valueAt", () => {
  it("returns each season's total exactly at whole t", () => {
    expect(valueAt([10, 12, 20], 0)).toBe(10);
    expect(valueAt([10, 12, 20], 1)).toBe(12);
    expect(valueAt([10, 12, 20], 2)).toBe(20);
  });

  it("eases between seasons, halfway at the midpoint", () => {
    expect(valueAt([10, 12, 20], 1.5)).toBeCloseTo(16);
    expect(valueAt([10, 12, 20], 1.25)).toBeGreaterThan(12);
    expect(valueAt([10, 12, 20], 1.25)).toBeLessThan(14); // slower than linear at the start
  });

  it("clamps outside the timeline", () => {
    expect(valueAt([10, 12, 20], -1)).toBe(10);
    expect(valueAt([10, 12, 20], 9)).toBe(20);
  });
});

describe("standingsAt", () => {
  it("ranks by value and lets the lead change mid-race", () => {
    expect(standingsAt(race, 0).map((r) => r.manager.short)).toEqual(["Ann A.", "Bob B.", "Cal C."]);
    expect(standingsAt(race, 1).map((r) => r.manager.short)).toEqual(["Bob B.", "Ann A.", "Cal C."]);
    expect(standingsAt(race, 2).map((r) => [r.manager.short, r.rank])).toEqual([
      ["Ann A.", 0],
      ["Bob B.", 1],
      ["Cal C.", 2],
    ]);
  });

  it("counts titles only once their season is reached", () => {
    const ann = (t: number) => standingsAt(race, t).find((r) => r.manager.short === "Ann A.")!.titles;
    expect(ann(0)).toBe(0);
    expect(ann(1)).toBe(1);
    expect(ann(0.4)).toBe(0);
    expect(ann(0.6)).toBe(1); // rounds to the nearer season
  });

  it("breaks ties by name so the order is stable", () => {
    const tied: LeagueRace = { ...race, managers: [race.managers[2], { ...race.managers[1], cumWins: [0, 0, 0] }] };
    expect(standingsAt(tied, 0).map((r) => r.manager.short)).toEqual(["Bob B.", "Cal C."]);
  });
});

describe("positionsAt", () => {
  it("matches the ranks at each season's end", () => {
    for (const t of [0, 1, 2]) {
      const pos = positionsAt(race, t);
      for (const r of standingsAt(race, t)) expect(pos.get(r.manager.name)).toBe(r.rank);
    }
  });

  it("moves overtaking bars smoothly past each other mid-season", () => {
    // Ann goes 0 -> 1 and Bob 1 -> 0 between t=0 and t=1; they cross at the midpoint.
    const mid = positionsAt(race, 0.5);
    expect(mid.get("Ann Able")).toBeCloseTo(0.5);
    expect(mid.get("Bob Baker")).toBeCloseTo(0.5);
    expect(positionsAt(race, 0.25).get("Ann Able")).toBeLessThan(0.25); // eased, not linear
    expect(mid.get("Cal Cole")).toBe(2);
  });

  it("clamps outside the timeline", () => {
    expect(positionsAt(race, 5).get("Ann Able")).toBe(0);
    expect(positionsAt(race, -1).get("Bob Baker")).toBe(1);
  });
});

describe("leaders", () => {
  it("tracks the leader each season and counts lead changes", () => {
    expect(leadersBySeason(race)).toEqual(["Ann Able", "Bob Baker", "Ann Able"]);
    expect(leadChanges(race)).toBe(2);
  });
});

describe("closestCall", () => {
  it("finds the season-end with the smallest gap between first and second", () => {
    // gaps: 2020 10-5=5, 2021 15-12=3, 2022 20-18=2
    expect(closestCall(race)).toEqual({ index: 2, season: 2022, leader: "Ann A.", chaser: "Bob B.", gap: 2 });
  });
});

describe("raceHeadline", () => {
  it("counts lead changes when the lead moved", () => {
    expect(raceHeadline(race)).toBe("The all-time lead has changed hands 2 times since 2020.");
  });

  it("names the wire-to-wire leader and the closest call when it never moved", () => {
    const wire: LeagueRace = { ...race, managers: [{ ...race.managers[0], cumWins: [10, 20, 30] }, race.managers[1]] };
    expect(raceHeadline(wire)).toBe(
      "Ann A. has led the all-time race every season since 2020. Closest call: Bob B., 5 back in 2020.",
    );
  });

  it("says 'led or shared' when someone tied the leader", () => {
    const tie: LeagueRace = { ...race, managers: [{ ...race.managers[0], cumWins: [10, 15, 30] }, race.managers[1]] };
    expect(raceHeadline(tie)).toBe(
      "Ann A. has led or shared the all-time lead every season since 2020. Only Bob B. has caught him, tying it up in 2021.",
    );
  });
});

describe("seasonCaption", () => {
  it("names the champion, including former members", () => {
    expect(seasonCaption(race, 2020)).toBe("2020 · Zed Zolo wins it all with Zeds");
    expect(seasonCaption(race, 2021)).toBe("2021 · Ann Able wins it all with Able Team");
  });

  it("marks the live season", () => {
    expect(seasonCaption(race, 2022)).toBe("2022 · Season in progress");
  });
});

describe("shortName", () => {
  it("abbreviates the last name", () => {
    expect(shortName("Ryan Curran")).toBe("Ryan C.");
    expect(shortName("Cher")).toBe("Cher");
  });
});
