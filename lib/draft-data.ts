import draftHistory from "@/data/draft_history.json";
import transactionsRaw from "@/data/transactions.json";
import lineupsRaw from "@/data/weekly_lineups.json";

// data/draft_history.json has every pick but no player names: only a Yahoo player_key
// ("461.p.40055"). Its number is the player_id the scraped lineups/transactions record,
// except team defenses, which Yahoo numbers 100000 + its NFL team id and the scrape stores
// without an id. Names below match how the scraped data names each defense.
const DEFENSE_BY_ID: Record<number, string> = {
  100001: "Falcons", 100002: "Bills", 100003: "Bears", 100004: "Bengals", 100005: "Browns",
  100006: "Cowboys", 100007: "Broncos", 100008: "Lions", 100009: "Packers", 100010: "Titans",
  100011: "Colts", 100012: "Chiefs", 100013: "Raiders", 100014: "Rams", 100015: "Dolphins",
  100016: "Vikings", 100017: "Patriots", 100018: "Saints", 100019: "Giants", 100020: "Jets",
  100021: "Eagles", 100022: "Cardinals", 100023: "Steelers", 100024: "Chargers", 100025: "49ers",
  100026: "Seahawks", 100027: "Buccaneers", 100028: "Commanders", 100029: "Panthers",
  100030: "Jaguars", 100033: "Ravens", 100034: "Texans",
};

const NON_POSITION_SLOTS = new Set(["W/R/T", "W/R", "BN", "IR", ""]);

export interface DraftPick {
  season: number;
  round: number;
  pick: number;
  teamKey: string;
  team: string;
  /** Yahoo username as recorded in draft_history (resolve with the usual alias helpers). */
  manager: string;
  player: string;
  /** Empty when the player never moved or started at a real position. */
  position: string;
  resolved: boolean;
}

let cache: DraftPick[] | null = null;

export function getDraftPicks(): DraftPick[] {
  if (cache) return cache;

  const nameById = new Map<string, string>();
  const position = new Map<string, string>();
  for (const r of lineupsRaw) {
    if (r.player_id) nameById.set(`${r.season}|${r.player_id}`, r.player);
    if (!NON_POSITION_SLOTS.has(r.slot)) position.set(`${r.season}|${r.player}`, r.slot);
  }
  for (const t of transactionsRaw) {
    if (t.player_id) nameById.set(`${t.season}|${t.player_id}`, t.player);
    position.set(`${t.season}|${t.player}`, t.position); // listed position beats a lineup slot
  }

  cache = draftHistory.map((d) => {
    const id = Number((d.player_key ?? "").split(".p.")[1]);
    const defense = DEFENSE_BY_ID[id];
    // A season pulled from the live draft-results page already has names; older seasons only have keys.
    const name = d.player_name || defense || nameById.get(`${d.season_year}|${id}`);
    return {
      season: d.season_year,
      round: d.round,
      pick: d.pick_number,
      teamKey: d.team_key,
      team: d.team_name,
      manager: d.manager_name,
      player: name ?? (id ? `Unknown player (Yahoo id ${id})` : "Unknown player"),
      position: d.player_position || (defense ? "DEF" : name ? (position.get(`${d.season_year}|${name}`) ?? "") : ""),
      resolved: name != null,
    };
  });
  return cache;
}
