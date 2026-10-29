import { describe, expect, it } from "vitest";
import {
  defaultManager,
  getAllTrades,
  getRosterSeasons,
  getSeasonModel,
  getTeamView,
  managerLabel,
  managerSlug,
  transactionWeek,
} from "./rosters-data";

const S2025 = getSeasonModel(2025)!;

describe("transactionWeek", () => {
  it("puts Thursday-Sunday moves in that week and Monday-morning-on moves in the next", () => {
    expect(transactionWeek(2025, "2025-09-23 08:32", 17)).toBe(4); // Tuesday
    expect(transactionWeek(2025, "2025-10-12 09:25", 17)).toBe(6); // Sunday
    expect(transactionWeek(2020, "2020-10-19 08:36", 16)).toBe(7); // Monday morning
    expect(transactionWeek(2013, "2013-10-21 01:02", 16)).toBe(7); // Sunday night, after midnight
    expect(transactionWeek(2021, "2021-09-09 22:06", 17)).toBe(1); // opening night
  });

  it("clamps preseason and post-season dates", () => {
    expect(transactionWeek(2025, "2025-08-20 12:00", 17)).toBe(1);
    expect(transactionWeek(2025, "2026-01-20 12:00", 17)).toBe(17);
  });
});

describe("managers", () => {
  it("covers every season from 2012, newest first", () => {
    const years = getRosterSeasons();
    expect(years.filter((y) => y <= 2025)).toEqual([2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012]);
    expect(years).toEqual([...years].sort((a, b) => b - a));
  });

  it("never shows a raw Yahoo username or a bare 'Hidden manager'", () => {
    for (const y of getRosterSeasons()) {
      for (const m of getSeasonModel(y)!.managers) {
        // Hidden managers are labelled by their team name, which may start lowercase.
        if (!m.endsWith("(unknown manager)")) expect(m).not.toMatch(/^[a-z]/);
        expect(m).not.toBe("Hidden manager");
        expect(m).not.toBe("--hidden--");
      }
    }
  });

  it("resolves aliases, capitalizes unknown usernames, and names hidden managers by team", () => {
    expect(managerLabel("AB", "x")).toBe("Anthony Bove");
    expect(managerLabel("john", "x")).toBe("John");
    expect(managerLabel("Hidden manager", "MD Celtics")).toBe("MD Celtics (unknown manager)");
    expect(getSeasonModel(2012)!.managers).toContain("MD Celtics (unknown manager)");
    expect(managerSlug("Blake Kozloski")).toBe("blake-kozloski");
  });

  it("defaults to Blake Kozloski", () => {
    expect(defaultManager(S2025)).toBe("Blake Kozloski");
  });
});

describe("team view", () => {
  it("defaults to the final roster from the manager's last week", () => {
    const v = getTeamView(S2025, "Blake Kozloski", null);
    expect(v.isFinal).toBe(true);
    expect(v.week).toBe(v.weeks[v.weeks.length - 1]);
    expect(v.final).not.toBeNull();
    expect(v.groups[0].title).toBe("STARTERS");
  });

  it("shows Saquon Barkley coming in by trade for Anthony in week 4", () => {
    const v = getTeamView(S2025, "Anthony Bove", 4);
    expect(v.changes!.ins).toContainEqual({ player: "Saquon Barkley", label: "Trade · Matt", tradeId: "2025-60" });
    const row = v.groups.flatMap((g) => g.rows).find((r) => r.player === "Saquon Barkley")!;
    expect(row).toMatchObject({ isNew: true, acq: { kind: "trade", week: 4 } });
  });

  it("shows Saquon going out to Anthony for Matt in week 4", () => {
    const v = getTeamView(S2025, "Matt Borba", 4);
    expect(v.changes!.outs).toContainEqual({ player: "Saquon Barkley", label: "Traded to Anthony", tradeId: "2025-60" });
  });

  it("labels drafted players with their round and waiver pickups with the bid", () => {
    const rows = getTeamView(S2025, "Peter Klensch", 1).groups.flatMap((g) => g.rows);
    expect(rows.find((r) => r.player === "Jayden Daniels")!.acq.label).toMatch(/^Draft · Rd \d+$/);
    const onRoster = (mgr: string, week: number, player: string) =>
      getTeamView(S2025, mgr, week).groups.flatMap((g) => g.rows).find((r) => r.player === player);
    const waiver = S2025.txns.find((t) => t.type === "add" && t.faab > 0 && onRoster(t.mgr, t.week, t.player))!;
    expect(onRoster(waiver.mgr, waiver.week, waiver.player)!.acq).toMatchObject({
      kind: "waiver",
      label: `Waiver · $${waiver.faab}`,
      week: waiver.week,
    });
  });

  it("gives drafted defenses their round", () => {
    const week1Defenses = S2025.managers
      .flatMap((m) => getTeamView(S2025, m, 1).groups.flatMap((g) => g.rows))
      .filter((r) => r.slot === "DEF" && r.acq.kind === "draft");
    expect(week1Defenses.length).toBeGreaterThan(0);
    for (const r of week1Defenses) expect(r.acq.label).toMatch(/^Draft · Rd \d+$/);
  });

  it("sums the season's FAAB from add rows", () => {
    const v = getTeamView(S2025, "Eric Rios", null);
    const expected = S2025.txns.filter((t) => t.mgr === "Eric Rios" && t.type === "add").reduce((a, t) => a + t.faab, 0);
    expect(v.final!.faab).toBe(expected);
    expect(v.final!.adds).toBe(S2025.txns.filter((t) => t.mgr === "Eric Rios" && t.type === "add").length);
  });
});

describe("trades", () => {
  it("2025-60: Anthony gets Saquon and McConkey, Matt gets Puka, and one side wins", () => {
    const t = getAllTrades().find((x) => x.id === "2025-60")!;
    const anthony = t.sides.find((s) => s.mgr === "Anthony Bove")!;
    const matt = t.sides.find((s) => s.mgr === "Matt Borba")!;
    expect(anthony.gets.map((g) => g.player).sort()).toEqual(["Ladd McConkey", "Saquon Barkley"]);
    expect(matt.gets.map((g) => g.player)).toEqual(["Puka Nacua"]);
    expect(anthony.from).toEqual(["Matt Borba"]);
    expect(t.week).toBe(4);
    expect(t.sides.filter((s) => s.won)).toHaveLength(1);
  });

  it("scores a side by its received players' starting points from the trade week on", () => {
    const t = getAllTrades().find((x) => x.id === "2025-60")!;
    const matt = t.sides.find((s) => s.mgr === "Matt Borba")!;
    let pts = 0;
    let starts = 0;
    for (const [w, rows] of S2025.by.get("Matt Borba")!) {
      if (w < 4) continue;
      for (const r of rows) if (r.player === "Puka Nacua" && r.started) { pts += r.points ?? 0; starts++; }
    }
    expect(matt.gets[0]).toMatchObject({ pts, starts });
    expect(matt.total).toBe(pts);
  });

  it("lists every season's trades newest first with unique ids", () => {
    const trades = getAllTrades();
    expect(new Set(trades.map((t) => t.id)).size).toBe(trades.length);
    expect(trades[0].season).toBe(Math.max(...trades.map((t) => t.season)));
    expect(trades.at(-1)!.season).toBe(2012);
  });
});
