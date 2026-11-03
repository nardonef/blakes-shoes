import leagueInfo from "@/data/league_info.json";
import { weekLineup } from "@/lib/luck-lineups-data";
import { getRosterSeasons, getSeasonModel, managerLabel, type SeasonModel } from "@/lib/rosters-data";
import { champions } from "@/lib/stats-data";

// "Perfect-lineup" seasons: every team scores its best possible lineup every week (both sides of
// every game), then the real schedule and playoff bracket are replayed. Brackets follow the league's
// settings: no reseeding, 8 teams in 2012-13, 6 teams (top two seeds on bye) since.

export interface SimTeam {
  manager: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  seed: number;
}

export interface SimSeason {
  season: number;
  teams: SimTeam[];
  champion: string;
}

export interface PerfectSeason {
  season: number;
  real: SimSeason;
  perfect: SimSeason;
}

type Score = (S: SeasonModel, manager: string, week: number) => number;

const actualScore: Score = (S, m, w) => S.games.get(`${m}|${w}`)?.points ?? 0;
const perfectScore: Score = (S, m, w) => weekLineup(S, m, w)?.best ?? actualScore(S, m, w);

/** Pairs of managers who played each other in a week. */
function pairings(S: SeasonModel, week: number): [string, string][] {
  const out: [string, string][] = [];
  for (const [key, g] of S.games) {
    const sep = key.lastIndexOf("|");
    const m = key.slice(0, sep);
    if (Number(key.slice(sep + 1)) === week && m < g.opponent) out.push([m, g.opponent]);
  }
  return out;
}

/** Winner of a playoff game; a tie goes to the higher seed. */
function playoffWinner(S: SeasonModel, score: Score, week: number, a: SimTeam, b: SimTeam): SimTeam {
  const pa = score(S, a.manager, week);
  const pb = score(S, b.manager, week);
  if (pa === pb) return a.seed < b.seed ? a : b;
  return pa > pb ? a : b;
}

export function simulateSeason(year: number, score: Score): SimSeason {
  const S = getSeasonModel(year)!;
  const teams = new Map<string, SimTeam>();
  const team = (m: string) => {
    const t = teams.get(m) ?? { manager: m, wins: 0, losses: 0, ties: 0, pointsFor: 0, seed: 0 };
    teams.set(m, t);
    return t;
  };
  for (let w = 1; w < S.playoffStart; w++) {
    for (const [a, b] of pairings(S, w)) {
      const [ta, tb] = [team(a), team(b)];
      const [pa, pb] = [score(S, a, w), score(S, b, w)];
      ta.pointsFor += pa;
      tb.pointsFor += pb;
      if (pa === pb) { ta.ties++; tb.ties++; }
      else if (pa > pb) { ta.wins++; tb.losses++; }
      else { tb.wins++; ta.losses++; }
    }
  }
  const seeded = [...teams.values()].sort(
    (a, b) => b.wins + b.ties / 2 - (a.wins + a.ties / 2) || b.pointsFor - a.pointsFor,
  );
  seeded.forEach((t, i) => { t.seed = i + 1; t.pointsFor = Math.round(t.pointsFor * 100) / 100; });

  const n = Number(leagueInfo.find((l) => l.season_year === year)!.num_playoff_teams);
  const s = (i: number) => seeded[i - 1];
  const win = (week: number, a: SimTeam, b: SimTeam) => playoffWinner(S, score, week, a, b);
  const w1 = S.playoffStart;
  let champion: SimTeam;
  if (n === 8) {
    const top = win(w1 + 1, win(w1, s(1), s(8)), win(w1, s(4), s(5)));
    const bottom = win(w1 + 1, win(w1, s(2), s(7)), win(w1, s(3), s(6)));
    champion = win(w1 + 2, top, bottom);
  } else {
    const top = win(w1 + 1, s(1), win(w1, s(4), s(5)));
    const bottom = win(w1 + 1, s(2), win(w1, s(3), s(6)));
    champion = win(w1 + 2, top, bottom);
  }
  return { season: year, teams: seeded, champion: champion.manager };
}

/** Finished seasons only: a season in progress has no bracket to replay. */
export function getPerfectSeasons(): PerfectSeason[] {
  const finished = new Set(champions.map((c) => c.season_year));
  return getRosterSeasons()
    .filter((y) => finished.has(y))
    .map((y) => ({ season: y, real: simulateSeason(y, actualScore), perfect: simulateSeason(y, perfectScore) }));
}

/** The champion as recorded in champions.json, labeled like the season model's managers. */
export function recordedChampion(year: number): string | undefined {
  const c = champions.find((x) => x.season_year === year);
  return c && managerLabel(c.champion_manager, c.champion_team_name);
}
