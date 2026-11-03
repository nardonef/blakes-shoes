import { CURRENT_OWNERS } from "@/lib/legacy-data";
import { getRosterSeasons, getSeasonModel } from "@/lib/rosters-data";

// Each current manager's "guys": the players who started, scored and sat on their roster the most
// across every season they managed (playoffs included, kickers and defenses count).

export interface Guy {
  player: string;
  pos: string;
  starts: number;
  /** Points scored in this manager's starting lineup. */
  points: number;
  /** Weeks on the roster, bench and IR included. */
  weeks: number;
  seasons: number;
}

export type GuyCategory = "starts" | "points" | "weeks";

export interface MyGuys {
  manager: string;
  image: string;
  /** Top 3 for each category, best first. */
  top: Record<GuyCategory, Guy[]>;
}

const ORDER: Record<GuyCategory, (keyof Guy)[]> = {
  starts: ["starts", "points", "weeks"],
  points: ["points", "starts", "weeks"],
  weeks: ["weeks", "starts", "points"],
};

function topBy(guys: Guy[], category: GuyCategory): Guy[] {
  const keys = ORDER[category];
  return [...guys]
    .sort((a, b) => {
      for (const k of keys) if (a[k] !== b[k]) return (b[k] as number) - (a[k] as number);
      return a.player.localeCompare(b.player);
    })
    .slice(0, 3);
}

export function getMyGuys(): MyGuys[] {
  const byManager = new Map<string, Map<string, Guy & { years: Set<number> }>>();
  for (const year of getRosterSeasons()) {
    const S = getSeasonModel(year)!;
    for (const [mgr, weeks] of S.by) {
      const players = byManager.get(mgr) ?? new Map<string, Guy & { years: Set<number> }>();
      byManager.set(mgr, players);
      for (const rows of weeks.values()) {
        for (const r of rows) {
          const g = players.get(r.player) ?? { player: r.player, pos: "", starts: 0, points: 0, weeks: 0, seasons: 0, years: new Set<number>() };
          players.set(r.player, g);
          g.pos = S.info.get(r.player)?.pos ?? g.pos;
          g.weeks++;
          g.years.add(year);
          if (r.started) {
            g.starts++;
            g.points += r.points ?? 0;
          }
        }
      }
    }
  }

  return CURRENT_OWNERS.map((o) => {
    const guys: Guy[] = [...(byManager.get(o.name)?.values() ?? [])].map(({ years, ...g }) => ({
      ...g,
      points: Math.round(g.points * 10) / 10,
      seasons: years.size,
    }));
    return {
      manager: o.name,
      image: o.image,
      top: { starts: topBy(guys, "starts"), points: topBy(guys, "points"), weeks: topBy(guys, "weeks") },
    };
  });
}
