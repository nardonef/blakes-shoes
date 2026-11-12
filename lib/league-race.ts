// Pure helpers for the all-time wins race on the home page. No data imports, so the client
// component can use them; the dataset itself is built server-side in lib/league-race-data.ts.

export type RaceManager = {
  name: string;
  short: string; // "Ryan C."
  image: string;
  cumWins: number[]; // cumulative wins at the end of each season in LeagueRace.seasons
  titleYears: number[];
};

export type RaceChampion = { season: number; manager: string; team: string };

export type LeagueRace = {
  seasons: number[];
  liveSeason: number | null; // season still being played, if any
  managers: RaceManager[];
  champions: RaceChampion[];
};

// Ease within each season so the bars move, then settle as the season's results "land".
const smoothstep = (x: number) => x * x * (3 - 2 * x);

/** Cumulative wins at time t, where t runs from 0 (end of first season) to seasons.length - 1. */
export function valueAt(cumWins: number[], t: number): number {
  const last = cumWins.length - 1;
  if (t <= 0) return cumWins[0];
  if (t >= last) return cumWins[last];
  const i = Math.floor(t);
  return cumWins[i] + (cumWins[i + 1] - cumWins[i]) * smoothstep(t - i);
}

export type RaceRow = { manager: RaceManager; value: number; rank: number; titles: number };

/** Every manager's value, rank (0 = leader) and titles won so far at time t, sorted by rank. */
export function standingsAt(race: LeagueRace, t: number): RaceRow[] {
  const year = race.seasons[Math.min(Math.max(Math.round(t), 0), race.seasons.length - 1)];
  return race.managers
    .map((manager) => ({
      manager,
      value: valueAt(manager.cumWins, t),
      rank: 0,
      titles: manager.titleYears.filter((y) => y <= year).length,
    }))
    .sort((a, b) => b.value - a.value || a.manager.name.localeCompare(b.manager.name))
    .map((row, rank) => ({ ...row, rank }));
}

/**
 * Each manager's vertical position (0 = top row) at time t, eased from their rank at the end of one
 * season to their rank at the end of the next. Bars cross once per season instead of jittering
 * through every momentary swap; at whole t this equals standingsAt's rank.
 */
export function positionsAt(race: LeagueRace, t: number): Map<string, number> {
  const last = race.seasons.length - 1;
  const rankAt = (i: number) => new Map(standingsAt(race, i).map((r) => [r.manager.name, r.rank]));
  const lo = Math.min(Math.max(Math.floor(t), 0), last);
  const hi = Math.min(lo + 1, last);
  const k = smoothstep(Math.min(Math.max(t - lo, 0), 1));
  const a = rankAt(lo);
  const b = rankAt(hi);
  return new Map(race.managers.map((m) => [m.name, a.get(m.name)! + (b.get(m.name)! - a.get(m.name)!) * k]));
}

/** The all-time wins leader at the end of each season. */
export function leadersBySeason(race: LeagueRace): string[] {
  return race.seasons.map((_, i) => standingsAt(race, i)[0].manager.name);
}

/** How many times the all-time wins lead changed hands, season over season. */
export function leadChanges(race: LeagueRace): number {
  const leaders = leadersBySeason(race);
  return leaders.slice(1).filter((name, i) => name !== leaders[i]).length;
}

/** The season-end where second place was nearest to the leader (earliest wins a tie). */
export function closestCall(race: LeagueRace): { index: number; season: number; leader: string; chaser: string; gap: number } {
  let best = { index: 0, season: race.seasons[0], leader: "", chaser: "", gap: Infinity };
  race.seasons.forEach((season, i) => {
    const [first, second] = standingsAt(race, i);
    const gap = first.value - second.value;
    if (gap < best.gap) best = { index: i, season, leader: first.manager.short, chaser: second.manager.short, gap };
  });
  return best;
}

/** The race's one-line headline, written from the data so it stays true as seasons are added. */
export function raceHeadline(race: LeagueRace): string {
  const changes = leadChanges(race);
  const first = race.seasons[0];
  if (changes > 0) return `The all-time lead has changed hands ${changes} ${changes === 1 ? "time" : "times"} since ${first}.`;
  const c = closestCall(race);
  if (c.gap === 0) return `${c.leader} has led or shared the all-time lead every season since ${first}. Only ${c.chaser} has caught him, tying it up in ${c.season}.`;
  return `${c.leader} has led the all-time race every season since ${first}. Closest call: ${c.chaser}, ${c.gap} back in ${c.season}.`;
}

/** One line of story per season: the champion, or that the season is still being played. */
export function seasonCaption(race: LeagueRace, season: number): string {
  if (season === race.liveSeason) return `${season} · Season in progress`;
  const champ = race.champions.find((c) => c.season === season);
  return champ ? `${season} · ${champ.manager} wins it all with ${champ.team}` : String(season);
}

/** "Ryan Curran" -> "Ryan C." */
export function shortName(name: string): string {
  const [first, ...rest] = name.split(" ");
  const last = rest.at(-1);
  return last ? `${first} ${last[0]}.` : first;
}
