import transactionsRaw from "@/data/transactions.json";
import lineupsRaw from "@/data/weekly_lineups.json";
import { getDraftPicks } from "@/lib/draft-data";
import { playerSlug } from "@/lib/player-slug";
import { acquisition, getRosterSeasons, getSeasonModel, managerLabel, type AcqKind } from "@/lib/rosters-data";
import { standings } from "@/lib/stats-data";

// Player pages (/players/<slug>): one player's whole history in the league. Server-only.
// Players are identified by Yahoo player id where the data has one (defenses have none and use
// their name), so two different players with the same name stay separate.

export { playerSlug };

export interface Stint {
  season: number;
  manager: string;
  team: string;
  acquired: { kind: AcqKind; label: string; week: number | null };
  firstWeek: number;
  lastWeek: number;
  weeks: number;
  starts: number;
  points: number;
}

export interface PlayerHistory {
  key: string;
  name: string;
  position: string;
  nflTeam: string;
  seasons: number[];
  managers: string[];
  stints: Stint[];
  draft: { season: number; round: number; pick: number; manager: string }[];
  trades: { id: string; season: number; week: number; from: string; to: string }[];
  totalStarts: number;
  totalPoints: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
let index: Map<string, PlayerHistory[]> | null = null;

function build(): Map<string, PlayerHistory[]> {
  // (season, name) -> identity key
  const keyOf = new Map<string, string>();
  for (const r of [...lineupsRaw, ...transactionsRaw]) {
    keyOf.set(`${r.season}|${r.player}`, r.player_id ? `id:${r.player_id}` : `name:${r.player}`);
  }
  const identity = (season: number, name: string) => keyOf.get(`${season}|${name}`) ?? `name:${name}`;

  const players = new Map<string, PlayerHistory>();
  const get = (key: string, name: string) => {
    let p = players.get(key);
    if (!p) {
      p = { key, name, position: "", nflTeam: "", seasons: [], managers: [], stints: [], draft: [], trades: [], totalStarts: 0, totalPoints: 0 };
      players.set(key, p);
    }
    return p;
  };

  for (const year of [...getRosterSeasons()].sort((a, b) => a - b)) {
    const S = getSeasonModel(year)!;
    for (const [manager, weeks] of S.by) {
      const byPlayer = new Map<string, { first: number; last: number; weeks: number; starts: number; points: number; team: string }>();
      for (const [w, rows] of weeks) {
        for (const r of rows) {
          const s = byPlayer.get(r.player) ?? { first: w, last: w, weeks: 0, starts: 0, points: 0, team: r.team };
          s.first = Math.min(s.first, w);
          s.last = Math.max(s.last, w);
          s.weeks++;
          if (r.started) { s.starts++; s.points += r.points ?? 0; }
          byPlayer.set(r.player, s);
        }
      }
      for (const [name, s] of byPlayer) {
        const p = get(identity(year, name), name);
        const info = S.info.get(name);
        if (info?.pos) p.position = info.pos.split(",")[0];
        if (info?.nfl) p.nflTeam = info.nfl.toUpperCase();
        p.stints.push({
          season: year, manager, team: s.team,
          acquired: acquisition(S, manager, name, s.first),
          firstWeek: s.first, lastWeek: s.last, weeks: s.weeks, starts: s.starts, points: round1(s.points),
        });
      }
    }
    for (const t of S.trades) {
      for (const side of t.sides) {
        for (const g of side.gets) {
          get(identity(year, g.player), g.player).trades.push({
            id: t.id, season: year, week: t.week, from: side.from.join(" & "), to: side.mgr,
          });
        }
      }
    }
  }

  const label = new Map(standings.map((s) => [s.team_key, managerLabel(s.manager_name, s.team_name)]));
  for (const d of getDraftPicks()) {
    if (!d.resolved) continue;
    const p = get(identity(d.season, d.player), d.player);
    p.draft.push({ season: d.season, round: d.round, pick: d.pick, manager: label.get(d.teamKey) ?? d.manager });
    if (!p.position && d.position) p.position = d.position.split(",")[0];
  }

  const bySlug = new Map<string, PlayerHistory[]>();
  for (const p of players.values()) {
    p.stints.sort((a, b) => a.season - b.season || a.firstWeek - b.firstWeek);
    p.seasons = [...new Set(p.stints.map((s) => s.season))];
    p.managers = [...new Set(p.stints.map((s) => s.manager))];
    p.totalStarts = p.stints.reduce((a, s) => a + s.starts, 0);
    p.totalPoints = round1(p.stints.reduce((a, s) => a + s.points, 0));
    p.draft.sort((a, b) => a.season - b.season);
    const slug = playerSlug(p.name);
    bySlug.set(slug, [...(bySlug.get(slug) ?? []), p]);
  }
  // Same name, different players: most-played first.
  for (const list of bySlug.values()) list.sort((a, b) => b.totalPoints - a.totalPoints);
  return bySlug;
}

/** Every player sharing this slug's name (usually one). */
export function getPlayers(slug: string): PlayerHistory[] {
  index ??= build();
  return index.get(slug) ?? [];
}
