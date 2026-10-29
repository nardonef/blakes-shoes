import { acquisition, getSeasonModel, managerLabel, type AcqKind } from "@/lib/rosters-data";
import { champions } from "@/lib/stats-data";

// "How champions were built": where each title team's starting points came from. Server-only.

export const SOURCES: { kind: AcqKind; label: string }[] = [
  { kind: "draft", label: "Draft" },
  { kind: "waiver", label: "Waiver" },
  { kind: "fa", label: "Free agent" },
  { kind: "trade", label: "Trade" },
];

export interface ChampionBuild {
  season: number;
  manager: string;
  team: string;
  /** Starting points over the whole title season, playoffs included. */
  total: number;
  points: Record<AcqKind, number>;
  /** The champion's best non-draft addition by starting points. */
  topAdd: { player: string; kind: AcqKind; points: number } | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function getChampionBuilds(): ChampionBuild[] {
  const out: ChampionBuild[] = [];
  for (const c of champions) {
    const S = getSeasonModel(c.season_year);
    const manager = managerLabel(c.champion_manager, c.champion_team_name);
    const weeks = S?.by.get(manager);
    if (!S || !weeks) continue;
    const points: Record<AcqKind, number> = { draft: 0, waiver: 0, fa: 0, trade: 0 };
    const byPlayer = new Map<string, { kind: AcqKind; points: number }>();
    for (const [w, rows] of weeks) {
      for (const r of rows) {
        if (!r.started) continue;
        const kind = acquisition(S, manager, r.player, w).kind;
        points[kind] += r.points ?? 0;
        if (kind !== "draft") {
          const p = byPlayer.get(r.player) ?? { kind, points: 0 };
          p.points += r.points ?? 0;
          byPlayer.set(r.player, p);
        }
      }
    }
    const top = [...byPlayer].sort((a, b) => b[1].points - a[1].points)[0];
    out.push({
      season: c.season_year,
      manager,
      team: c.champion_team_name,
      total: round1(Object.values(points).reduce((a, b) => a + b, 0)),
      points: { draft: round1(points.draft), waiver: round1(points.waiver), fa: round1(points.fa), trade: round1(points.trade) },
      topAdd: top ? { player: top[0], kind: top[1].kind, points: round1(top[1].points) } : null,
    });
  }
  return out.sort((a, b) => b.season - a.season);
}
