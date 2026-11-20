import { describe, expect, it } from "vitest";
import { deficit, nemesis, series, seriesLine, type SeriesGame } from "./series";
import { applyPlay, betweenPlays, callTimeout, clockLabel, spike, startTwoMinuteDrill, HUDDLE_SECONDS } from "./drive";

const g = (season: number, week: number, a: string, as: number, b: string, bs: number): SeriesGame => ({
  season_year: season,
  week,
  team1_manager: a,
  team1_score: as,
  team2_manager: b,
  team2_score: bs,
  is_tied: false,
});

const GAMES = [
  g(2020, 3, "Me", 100, "Pete", 120),
  g(2021, 5, "Pete", 90, "Me", 110),
  g(2022, 1, "Me", 80, "Pete", 113),
  g(2022, 9, "Me", 95, "Bob", 90),
  g(2023, 2, "Bob", 70, "Me", 71),
  g(2024, 4, "Al", 100, "Me", 99),
  g(2024, 5, "Me", 100, "Al", 100),
];

describe("series", () => {
  it("counts the record from my side and remembers the last meeting and last loss", () => {
    const s = series(GAMES, "Me", "Pete");
    expect([s.wins, s.losses, s.ties]).toEqual([1, 2, 0]);
    expect(s.last).toEqual({ season: 2022, week: 1, mine: 80, theirs: 113 });
    expect(s.lastLoss).toEqual(s.last);
  });

  it("orders games chronologically regardless of input order", () => {
    expect(series([...GAMES].reverse(), "Me", "Pete").last?.season).toBe(2022);
  });

  it("counts ties", () => {
    expect(series(GAMES, "Me", "Al")).toMatchObject({ wins: 0, losses: 1, ties: 1 });
  });

  it("nemesis = most net losses to, then most games", () => {
    expect(nemesis(GAMES, "Me", ["Pete", "Bob", "Al"])).toBe("Pete");
    expect(nemesis(GAMES, "Me", ["Bob", "Al"])).toBe("Al");
  });

  it("deficit scales with the last loss, 4 to 6", () => {
    expect(deficit(series(GAMES, "Me", "Pete"))).toBe(6); // lost by 33
    expect(deficit({ wins: 0, losses: 1, ties: 0, lastLoss: { season: 1, week: 1, mine: 80, theirs: 96 } })).toBe(5); // by 16
    expect(deficit(series(GAMES, "Me", "Al"))).toBe(4); // lost by 1
    expect(deficit(series(GAMES, "Me", "Bob"))).toBe(4); // never lost
  });

  it("series line", () => {
    expect(seriesLine(series(GAMES, "Me", "Pete"), "ME", "PETE")).toBe("PETE LEADS 2-1");
    expect(seriesLine(series(GAMES, "Me", "Bob"), "ME", "BOB")).toBe("ME LEADS 2-0");
    expect(seriesLine(series(GAMES, "Me", "Al"), "ME", "AL")).toBe("AL LEADS 1-0-1");
    expect(seriesLine({ wins: 2, losses: 2, ties: 0 }, "ME", "X")).toBe("SERIES TIED 2-2");
  });
});

describe("two-minute drill", () => {
  const d0 = startTwoMinuteDrill();

  it("starts at the 25 with 2:00 and a timeout", () => {
    expect(d0).toMatchObject({ downs: { yardLine: 25, down: 1, toGo: 10 }, clock: 120, timeouts: 1, running: false });
    expect(clockLabel(120)).toBe("2:00");
    expect(clockLabel(9.2)).toBe("0:10");
  });

  it("in-bounds tackles keep the clock running; incompletions and sidelines stop it", () => {
    expect(applyPlay(d0, { yards: 4, how: "tackle", duration: 5 })).toMatchObject({ clock: 115, running: true, downs: { down: 2, toGo: 6 } });
    expect(applyPlay(d0, { yards: 0, how: "incomplete", duration: 4 }).running).toBe(false);
    expect(applyPlay(d0, { yards: 12, how: "out of bounds", duration: 6 })).toMatchObject({ running: false, downs: { down: 1, yardLine: 37 } });
  });

  it("huddle burns time only while running; timeout stops it once", () => {
    const run = applyPlay(d0, { yards: 4, how: "tackle", duration: 5 });
    expect(betweenPlays(run).clock).toBe(115 - HUDDLE_SECONDS);
    const to = callTimeout(run);
    expect(to).toMatchObject({ timeouts: 0, running: false });
    expect(betweenPlays(to).clock).toBe(115);
    expect(callTimeout({ ...run, timeouts: 0 })).toEqual({ ...run, timeouts: 0 });
  });

  it("spike stops the clock and costs a down, but not on 4th", () => {
    const run = applyPlay(d0, { yards: 4, how: "tackle", duration: 5 });
    expect(spike(run)).toMatchObject({ running: false, clock: 112, downs: { down: 3 } });
    const fourth = { ...run, downs: { yardLine: 40, down: 4, toGo: 3 } };
    expect(spike(fourth)).toBe(fourth);
  });

  it("drive outcomes: touchdown, pick, downs, clock", () => {
    expect(applyPlay(d0, { yards: 75, how: "touchdown", duration: 9 }).outcome).toBe("touchdown");
    expect(applyPlay(d0, { yards: 0, how: "interception", duration: 3 }).outcome).toBe("interception");
    expect(applyPlay({ ...d0, downs: { yardLine: 40, down: 4, toGo: 5 } }, { yards: 2, how: "tackle", duration: 4 }).outcome).toBe("turnover on downs");
    expect(applyPlay({ ...d0, clock: 4 }, { yards: 3, how: "tackle", duration: 6 })).toMatchObject({ clock: 0, outcome: "time expired" });
    // a touchdown as time expires still counts
    expect(applyPlay({ ...d0, clock: 2, downs: { yardLine: 95, down: 1, toGo: 5 } }, { yards: 5, how: "touchdown", duration: 4 }).outcome).toBe("touchdown");
    expect(betweenPlays({ ...applyPlay(d0, { yards: 2, how: "tackle", duration: 4 }), clock: 10 }).outcome).toBe("time expired");
  });

  it("sacks lose yards and keep the clock running", () => {
    expect(applyPlay(d0, { yards: -7, how: "sack", duration: 3 })).toMatchObject({ running: true, downs: { yardLine: 18, down: 2, toGo: 17 } });
  });
});
