import type { Champion, H2HRecord, Matchup, Standing } from "@/types/stats";
import type { BracketMatch, SeasonPayload } from "./types";

interface Team {
  rosterId: number;
  userId: string | null;
  manager: string;
  teamName: string;
}

const round = (n: number, places: number) => Number(n.toFixed(places));
const pair = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

function buildTeams(p: SeasonPayload, canon: Map<string, string>): Map<number, Team> {
  const users = new Map(p.users.map((u) => [u.user_id, u]));
  const teams = new Map<number, Team>();
  for (const r of p.rosters) {
    const user = r.owner_id ? users.get(r.owner_id) : undefined;
    const manager =
      (r.owner_id && canon.get(r.owner_id)) || user?.display_name || `Unknown (roster ${r.roster_id})`;
    teams.set(r.roster_id, {
      rosterId: r.roster_id,
      userId: r.owner_id,
      manager,
      teamName: user?.metadata?.team_name || manager,
    });
  }
  return teams;
}

/** place a bracket game decides: winner gets p, loser p+1 (p=1 final, p=3 third-place game...) */
function bracketPlacements(bracket: BracketMatch[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const m of bracket) {
    if (m.p != null && m.w != null && m.l != null) {
      out.set(m.w, m.p);
      out.set(m.l, m.p + 1);
    }
  }
  return out;
}

export function buildSeason(p: SeasonPayload, canon: Map<string, string> = new Map()) {
  const year = Number(p.league.season);
  const teams = buildTeams(p, canon);
  const team = (id: number) => teams.get(id)!;
  const rosterById = new Map(p.rosters.map((r) => [r.roster_id, r]));
  const pf = (id: number) => {
    const s = rosterById.get(id)!.settings;
    return s.fpts + (s.fpts_decimal ?? 0) / 100;
  };

  const byRecord = [...p.rosters].sort(
    (a, b) => b.settings.wins - a.settings.wins || pf(b.roster_id) - pf(a.roster_id),
  );
  const seed = new Map(byRecord.map((r, i) => [r.roster_id, i + 1]));

  const placed = bracketPlacements(p.winnersBracket);
  const inBracket = new Set<number>();
  for (const m of p.winnersBracket) {
    for (const id of [m.w, m.l, m.t1, m.t2]) if (typeof id === "number") inBracket.add(id);
  }
  const finalRank = new Map(placed);
  let next = Math.max(0, ...placed.values()) + 1;
  for (const r of byRecord) if (!finalRank.has(r.roster_id)) finalRank.set(r.roster_id, next++);

  const standings: Standing[] = p.rosters.map((r) => {
    const s = r.settings;
    const games = s.wins + s.losses + s.ties;
    const streak = /^(\d+)([WL])$/.exec(r.metadata?.streak ?? "");
    return {
      season_year: year,
      team_id: String(r.roster_id),
      team_key: `${p.league.league_id}.t.${r.roster_id}`,
      team_name: team(r.roster_id).teamName,
      manager_name: team(r.roster_id).manager,
      final_rank: finalRank.get(r.roster_id)!,
      playoff_seed: inBracket.has(r.roster_id) ? String(seed.get(r.roster_id)) : "",
      wins: s.wins,
      losses: s.losses,
      ties: s.ties,
      win_percentage: games ? round(s.wins / games, 3) : 0,
      points_for: round(pf(r.roster_id), 2),
      points_against: round((s.fpts_against ?? 0) + (s.fpts_against_decimal ?? 0) / 100, 2),
      streak_type: streak ? (streak[2] === "W" ? "win" : "loss") : "",
      streak_value: streak ? streak[1] : "",
    };
  });

  const final = p.winnersBracket.find((m) => m.p === 1 && m.w != null && m.l != null);
  const third = p.winnersBracket.find((m) => m.p === 3 && m.w != null);
  let champion: Champion | null = null;
  if (p.league.status === "complete" && final) {
    const c = team(final.w!);
    const ru = team(final.l!);
    const th = third ? team(third.w!) : null;
    const cs = rosterById.get(final.w!)!.settings;
    champion = {
      season_year: year,
      champion_team_name: c.teamName,
      champion_manager: c.manager,
      champion_wins: cs.wins,
      champion_losses: cs.losses,
      champion_points_for: round(pf(final.w!), 2),
      runner_up_team_name: ru.teamName,
      runner_up_manager: ru.manager,
      third_place_team_name: th?.teamName ?? "",
      third_place_manager: th?.manager ?? "",
    };
  }

  const bracketPairs = new Set(
    p.winnersBracket.filter((m) => m.w != null && m.l != null).map((m) => pair(m.w!, m.l!)),
  );
  const playoffStart = p.league.settings.playoff_week_start || Infinity;
  const matchups: Matchup[] = [];
  for (const week of Object.keys(p.matchupsByWeek).map(Number).sort((a, b) => a - b)) {
    const groups = new Map<number, typeof p.matchupsByWeek[number]>();
    for (const e of p.matchupsByWeek[week]) {
      if (e.matchup_id == null) continue;
      groups.set(e.matchup_id, [...(groups.get(e.matchup_id) ?? []), e]);
    }
    for (const g of groups.values()) {
      if (g.length !== 2 || (g[0].points === 0 && g[1].points === 0)) continue;
      const [a, b] = g[0].roster_id < g[1].roster_id ? g : [g[1], g[0]];
      const type =
        week < playoffStart
          ? "regular"
          : bracketPairs.has(pair(a.roster_id, b.roster_id))
            ? "playoff"
            : "consolation";
      const winner = a.points > b.points ? a : b.points > a.points ? b : null;
      matchups.push({
        season_year: year,
        week,
        matchup_type: type,
        team1_name: team(a.roster_id).teamName,
        team1_manager: team(a.roster_id).manager,
        team1_score: a.points,
        team2_name: team(b.roster_id).teamName,
        team2_manager: team(b.roster_id).manager,
        team2_score: b.points,
        winner: winner ? team(winner.roster_id).teamName : "",
        is_tied: winner === null,
      });
    }
  }

  return { champion, standings, matchups };
}

export function buildH2H(matchups: Matchup[]): H2HRecord[] {
  const records = new Map<string, H2HRecord>();
  for (const m of matchups) {
    if (m.matchup_type === "consolation") continue;
    const [m1, m2] = [m.team1_manager, m.team2_manager].sort();
    const key = `${m1}\u0000${m2}`;
    const rec = records.get(key) ?? { manager1: m1, manager2: m2, total_matchups: 0, manager1_wins: 0, manager2_wins: 0, ties: 0 };
    rec.total_matchups++;
    if (m.is_tied) rec.ties++;
    else {
      const winnerManager = m.winner === m.team1_name ? m.team1_manager : m.team2_manager;
      if (winnerManager === m1) rec.manager1_wins++;
      else rec.manager2_wins++;
    }
    records.set(key, rec);
  }
  return [...records.values()];
}

/** seasons oldest-first; the newest display name wins for a user who renamed */
export function buildHistory(seasons: SeasonPayload[]) {
  const canon = new Map<string, string>();
  const renamed = new Set<string>();
  for (const s of seasons) {
    for (const u of s.users) {
      const prev = canon.get(u.user_id);
      if (prev !== undefined && prev !== u.display_name) renamed.add(u.user_id);
      canon.set(u.user_id, u.display_name);
    }
  }

  const built = seasons.map((s) => buildSeason(s, canon));
  const matchups = built.flatMap((b) => b.matchups);
  return {
    champions: built.flatMap((b) => (b.champion ? [b.champion] : [])),
    standings: built.flatMap((b) => b.standings),
    matchups,
    h2h: buildH2H(matchups),
    renamedUsers: renamed.size,
  };
}
