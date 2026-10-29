import { getDraftPicks } from "@/lib/draft-data";
import { weeklyStarterMedians } from "@/lib/front-office-data";
import { CURRENT_OWNERS } from "@/lib/legacy-data";
import { getSeasonModel, managerLabel } from "@/lib/rosters-data";
import { standings } from "@/lib/stats-data";
import {
  gradeFor,
  positionRuns,
  type BoardPick,
  type DraftModel,
  type DraftSeason,
  type OutcomeKind,
} from "@/lib/draft-board-view";

// Server-only: builds the /draft model from draft picks, lineups and transactions.

const round1 = (n: number) => Math.round(n * 10) / 10;
const RATED = new Set(["QB", "RB", "WR", "TE"]);

function buildSeason(year: number): DraftSeason | null {
  const S = getSeasonModel(year);
  const draft = getDraftPicks().filter((p) => p.season === year);
  if (!S || !draft.length) return null;

  const label = new Map(
    standings.filter((s) => s.season_year === year).map((s) => [s.team_key, { mgr: managerLabel(s.manager_name, s.team_name), team: s.team_name }]),
  );

  // Every player's season, for whoever started him, as points above that week's typical (median)
  // starter at his position. Ranking on raw points let QBs, kickers and defenses dominate the steals.
  const base = weeklyStarterMedians(S);
  const allTeams = new Map<string, number>();
  for (const weeks of S.by.values()) {
    for (const [w, rows] of weeks) {
      for (const r of rows) {
        if (!r.started) continue;
        const above = (r.points ?? 0) - (base.get(`${w}|${S.info.get(r.player)?.pos ?? ""}`) ?? 0);
        allTeams.set(r.player, (allTeams.get(r.player) ?? 0) + above);
      }
    }
  }

  const raw = draft.map((d) => {
    const who = label.get(d.teamKey) ?? { mgr: d.manager, team: d.team };
    const weeksMap = S.by.get(who.mgr);
    let pts = 0;
    let starts = 0;
    let weeks = 0;
    let last = 0;
    for (const [w, rows] of weeksMap ?? []) {
      const r = rows.find((x) => x.player === d.player);
      if (!r) continue;
      weeks++;
      last = Math.max(last, w);
      if (r.started) { pts += r.points ?? 0; starts++; }
    }
    const lastWeekOfTeam = Math.max(0, ...(weeksMap?.keys() ?? []));
    const gone = S.txns
      .filter((t) => t.player === d.player && ((t.type === "drop" && t.mgr === who.mgr) || (t.type === "trade" && t.mgr !== who.mgr)))
      .sort((a, b) => a.date.localeCompare(b.date))[0];

    let kind: OutcomeKind;
    let short: string;
    let detail = "";
    if (!d.resolved) {
      kind = "unknown"; short = "—";
    } else if (weeks === 0) {
      kind = gone?.type === "trade" ? "traded" : "dropped";
      short = kind === "traded" ? "TRADED PRE-WK1" : "CUT PRE-WK1";
      detail = "before week 1";
    } else if (last === lastWeekOfTeam) {
      kind = "kept"; short = "KEPT";
    } else if (gone?.type === "trade") {
      kind = "traded"; short = `TRADED WK ${gone.week}`; detail = `to ${gone.mgr} (wk ${gone.week})`;
    } else {
      const wk = gone?.week ?? last + 1;
      kind = "dropped"; short = `CUT WK ${wk}`; detail = `(wk ${wk})`;
    }

    const posFull = d.position.split(",").join("/");
    return {
      season: year, round: d.round, pick: d.pick, manager: who.mgr, unknownMgr: /\(unknown manager\)/.test(who.mgr),
      team: who.team, player: d.player, pos: d.position.split(",")[0], posFull,
      kind, short, detail, pts: round1(pts), starts, weeks,
      // Never started for anyone: ranks below every player who did.
      resolved: d.resolved, allTeamPts: allTeams.get(d.player) ?? -Infinity,
    };
  }).sort((a, b) => a.pick - b.pick);

  // Finish rank among this season's drafted QBs, RBs, WRs and TEs. Kickers and defenses always go in
  // the last rounds, so pick-minus-finish would make nearly every one look like a steal; they're unrated.
  const finish = new Map<number, number>();
  [...raw]
    .filter((p) => p.resolved && RATED.has(p.pos))
    .sort((a, b) => b.allTeamPts - a.allTeamPts || a.pick - b.pick)
    .forEach((p, i) => finish.set(p.pick, i + 1));
  const rated = finish.size;

  const rounds = Math.max(...raw.map((p) => p.round));
  const n = raw.filter((p) => p.round === 1).length;
  const picks: BoardPick[] = raw.map((p) => {
    const pir = p.pick - (p.round - 1) * n;
    const f = finish.get(p.pick) ?? null;
    const value = f == null ? null : p.pick - f;
    return {
      season: p.season, round: p.round, pick: p.pick, manager: p.manager, unknownMgr: p.unknownMgr,
      team: p.team, player: p.player, pos: p.pos, posFull: p.posFull, kind: p.kind, short: p.short,
      detail: p.detail, pts: p.pts, starts: p.starts, weeks: p.weeks,
      pir,
      slot: p.round % 2 ? pir : n + 1 - pir,
      label: `${p.round}.${String(pir).padStart(2, "0")}`,
      finish: f,
      value,
      steal: value != null && value >= 60 && f! <= 60,
      bust: p.round <= 4 && f != null && f >= 100,
    };
  });

  const slots = picks.filter((p) => p.round === 1).map((p) => p.manager);
  const totals = slots.map((m) => ({
    manager: m,
    team: picks.find((p) => p.manager === m)!.team,
    pts: round1(picks.filter((p) => p.manager === m).reduce((a, p) => a + p.pts, 0)),
    rank: 0,
    grade: "",
  }));
  [...totals].sort((a, b) => b.pts - a.pts).forEach((t, i) => { t.rank = i + 1; t.grade = gradeFor(i + 1, n); });

  return { year, rounds, n, rated, slots, totals, runs: positionRuns(picks), picks };
}

let cache: DraftModel | null = null;

export function getDraftModel(): DraftModel {
  if (cache) return cache;
  const years = [...new Set(getDraftPicks().map((p) => p.season))].sort((a, b) => b - a);
  cache = {
    seasons: years.map(buildSeason).filter((s): s is DraftSeason => s != null),
    photos: Object.fromEntries(CURRENT_OWNERS.map((o) => [o.name, o.image])),
  };
  return cache;
}
