// Server-only: builds the home page's all-time wins race from the legacy data.
// Only the small LeagueRace summary is passed to the client component.
import { getManagerLegacies, type ManagerLegacy } from "@/lib/legacy-data";
import { champions } from "@/lib/stats-data";
import { shortName, type LeagueRace, type RaceChampion } from "@/lib/league-race";

export function buildLeagueRace(legacies: ManagerLegacy[], champs: RaceChampion[]): LeagueRace {
  const years = new Set(legacies.flatMap((l) => l.seasons.map((s) => s.year)));
  const seasons = [...years].sort((a, b) => a - b);
  const crowned = new Set(champs.map((c) => c.season));
  const unfinished = seasons.filter((y) => !crowned.has(y));
  const liveSeason = unfinished.length && unfinished.at(-1) === seasons.at(-1) ? seasons.at(-1)! : null;

  const managers = legacies.map((l) => {
    let total = 0;
    const cumWins = seasons.map((year) => {
      total += l.seasons.find((s) => s.year === year)?.wins ?? 0;
      return total;
    });
    return {
      name: l.owner.name,
      short: shortName(l.owner.name),
      image: l.owner.image,
      cumWins,
      titleYears: [...l.championshipYears].sort((a, b) => a - b),
    };
  });

  return { seasons, liveSeason, managers, champions: champs.filter((c) => years.has(c.season)) };
}

export function getLeagueRace(): LeagueRace {
  return buildLeagueRace(
    getManagerLegacies(),
    champions.map((c) => ({ season: c.season_year, manager: c.champion_manager, team: c.champion_team_name })),
  );
}
