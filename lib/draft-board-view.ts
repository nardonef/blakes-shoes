// Client-safe draft board types and helpers (no data imports). The model itself is built on the
// server by lib/draft-board.ts. Rules follow the design handoff, HANDOFF-4-draft.md.

export const GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"];

export type OutcomeKind = "kept" | "traded" | "dropped" | "unknown";

export interface BoardPick {
  season: number;
  round: number;
  pick: number;
  /** Pick within the round (1..n) and the board column it lands in (snake order). */
  pir: number;
  slot: number;
  label: string;
  manager: string;
  unknownMgr: boolean;
  team: string;
  player: string;
  pos: string;
  posFull: string;
  kind: OutcomeKind;
  short: string;
  /** Detail after the outcome word, e.g. "to Anthony Bove (wk 4)" or "(wk 6)". */
  detail: string;
  pts: number;
  starts: number;
  weeks: number;
  /** Rank among the season's drafted QB/RB/WR/TE by points above a typical starter; null for K/DEF. */
  finish: number | null;
  value: number | null;
  steal: boolean;
  bust: boolean;
}

export interface DraftTotal {
  manager: string;
  team: string;
  pts: number;
  rank: number;
  grade: string;
}

export interface PositionRun {
  pos: string;
  from: number;
  to: number;
  len: number;
  round: number;
}

export interface DraftSeason {
  year: number;
  rounds: number;
  n: number;
  /** How many picks have a finish rank (drafted QBs, RBs, WRs and TEs). */
  rated: number;
  /** Managers in round-1 pick order: the board's columns. */
  slots: string[];
  totals: DraftTotal[];
  runs: PositionRun[];
  picks: BoardPick[];
}

export interface DraftModel {
  /** Newest first. */
  seasons: DraftSeason[];
  photos: Record<string, string>;
}

export function gradeFor(rank: number, n: number): string {
  return GRADES[Math.min(11, Math.floor(((rank - 1) * 12) / n))];
}

export function gradeColor(g: string): string {
  return g[0] === "A" ? "#2D5A3D" : g[0] === "B" ? "#151515" : g[0] === "C" ? "#8a5a14" : "#a3412f";
}

export function shortName(m: string): string {
  if (/\(unknown manager\)/.test(m)) return m.replace(/\s*\(unknown manager\)/, "");
  const p = m.split(" ");
  return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : m;
}

export function managerSlug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Maximal stretches of ≥4 consecutive overall picks at the same primary position. */
export function positionRuns(picks: BoardPick[]): PositionRun[] {
  const runs: PositionRun[] = [];
  for (let i = 0; i < picks.length; ) {
    let j = i;
    while (j + 1 < picks.length && picks[j + 1].pos && picks[j + 1].pos === picks[i].pos) j++;
    if (picks[i].pos && j - i + 1 >= 4) {
      runs.push({ pos: picks[i].pos, from: picks[i].pick, to: picks[j].pick, len: j - i + 1, round: picks[i].round });
    }
    i = j + 1;
  }
  return runs;
}

/** Top 6 runs: longest first, then earliest. */
export function topRuns(runs: PositionRun[]): PositionRun[] {
  return [...runs].sort((a, b) => b.len - a.len || a.from - b.from).slice(0, 6);
}

const valued = (seasons: DraftSeason[]) => seasons.flatMap((s) => s.picks).filter((p) => p.value != null);

export function topSteals(seasons: DraftSeason[]): BoardPick[] {
  return valued(seasons).sort((a, b) => b.value! - a.value! || a.finish! - b.finish!).slice(0, 10);
}

/** Rounds 1-5 only, worst value first (wider than the board's bust tag on purpose). */
export function topBusts(seasons: DraftSeason[]): BoardPick[] {
  return valued(seasons).filter((p) => p.round <= 5).sort((a, b) => a.value! - b.value!).slice(0, 10);
}

export interface ManagerDraftYear {
  year: number;
  slot: number;
  grade: string;
  pts: number;
  first: BoardPick | undefined;
  best: BoardPick | undefined;
}

export interface ManagerHistory {
  manager: string;
  years: ManagerDraftYear[];
  avgGrade: string;
  aRange: number;
  bestEver: BoardPick | undefined;
}

/** Known managers with at least two drafts, alphabetical. */
export function historyManagers(seasons: DraftSeason[]): string[] {
  const counts = new Map<string, number>();
  for (const s of seasons) {
    for (const m of s.slots) if (!/unknown manager/.test(m)) counts.set(m, (counts.get(m) ?? 0) + 1);
  }
  return [...counts].filter(([, c]) => c >= 2).map(([m]) => m).sort();
}

export function managerHistory(seasons: DraftSeason[], manager: string): ManagerHistory {
  let bestEver: BoardPick | undefined;
  let pctSum = 0;
  const years = seasons
    .filter((s) => s.slots.includes(manager))
    .map((s) => {
      const t = s.totals.find((x) => x.manager === manager)!;
      const mine = s.picks.filter((p) => p.manager === manager);
      const best = mine.filter((p) => p.value != null).sort((a, b) => b.value! - a.value!)[0];
      if (best && (!bestEver || best.value! > bestEver.value!)) bestEver = best;
      pctSum += (t.rank - 1) / s.n;
      return {
        year: s.year,
        slot: s.slots.indexOf(manager) + 1,
        grade: t.grade,
        pts: t.pts,
        first: mine.find((p) => p.round === 1),
        best,
      };
    });
  const avgGrade = years.length ? gradeFor(Math.round((pctSum / years.length) * 12) + 1, 12) : "—";
  return { manager, years, avgGrade, aRange: years.filter((y) => y.grade[0] === "A").length, bestEver };
}
