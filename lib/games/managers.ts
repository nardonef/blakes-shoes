// Server-only: the current season's managers, by full name, for the /games picker and score validation.

import standings from "@/data/standings.json";
import { personForAccount } from "@/lib/managers";

export function leagueManagers(): string[] {
  const rows = standings as { season_year: number | string; manager_name: string }[];
  const latest = Math.max(...rows.map((r) => Number(r.season_year)));
  return rows
    .filter((r) => Number(r.season_year) === latest)
    .map((r) => personForAccount(r.manager_name))
    .sort((a, b) => a.localeCompare(b));
}
