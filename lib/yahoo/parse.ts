import { parseHTML } from "linkedom";

// Parsers for Yahoo Fantasy page fragments saved by scripts/yahoo-scrape.browser.js.
// Teams are identified by their per-season Yahoo team number (the N in team_key
// "<game>.l.<league>.t.N"); managers and team names come from data/standings.json.

export interface TransactionRow {
  season: number;
  txn: number; // position within the page, so a trade's rows share it
  date: string; // "YYYY-MM-DD HH:MM", Yahoo's display time
  type: "add" | "drop" | "trade";
  team_id: number; // team the player went to (add, trade) or left (drop)
  player: string;
  player_id: string | null; // null for team defenses
  nfl_team: string;
  position: string;
  detail: string; // "Free Agent", "$42 Waiver", "To Waivers", "Traded to", ...
  faab: number | null;
}

export interface LineupRow {
  season: number;
  week: number;
  team_id: number;
  slot: string; // QB, WR, W/R, BN, IR, ...
  player: string;
  player_id: string | null;
  points: number | null; // null when Yahoo shows "–" (did not play)
  projected: number | null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function doc(html: string) {
  return parseHTML(`<!doctype html><html><body>${html}</body></html>`).document;
}

const text = (el: Element | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

function teamNumber(href: string | null | undefined): number | null {
  const m = (href ?? "").match(/\/f1\/\d+\/(\d+)$/);
  return m ? Number(m[1]) : null;
}

function playerId(a: Element | null): string | null {
  const m = (a?.getAttribute("href") ?? "").match(/\/players\/(\d+)/);
  return m ? m[1] : null;
}

/** "Dec 16, 11:53 am" in the given season -> "2012-12-16 11:53"; Jan-Jul belong to the next calendar year. */
export function parseYahooDate(s: string, season: number): string {
  const m = s.trim().match(/^([A-Z][a-z]{2}) (\d{1,2}), (\d{1,2}):(\d{2}) ([ap]m)$/);
  if (!m) throw new Error(`Unrecognised Yahoo date: ${s}`);
  const month = MONTHS.indexOf(m[1]);
  const year = month < 7 ? season + 1 : season;
  const hour = (Number(m[3]) % 12) + (m[5] === "pm" ? 12 : 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month + 1)}-${pad(Number(m[2]))} ${pad(hour)}:${m[4]}`;
}

function splitPosition(s: string): { nfl_team: string; position: string } {
  const [nfl_team = "", position = ""] = s.split(" - ").map((x) => x.trim());
  return { nfl_team, position };
}

export function parseTransactions(html: string, season: number): TransactionRow[] {
  const rows: TransactionRow[] = [];
  let txn = -1;
  for (const tr of doc(html).querySelectorAll("tbody tr")) {
    const iconCell = tr.querySelector("td.Grid-u-1-12");
    if (iconCell) txn++;
    const side = tr.querySelector("td.Ta-end");
    const team_id = teamNumber(side?.querySelector("a")?.getAttribute("href"));
    const date = parseYahooDate(text(side?.querySelector(".F-timestamp")), season);
    if (team_id == null) throw new Error(`Transaction row without a team in ${season}`);

    const isTrade = !!tr.querySelector(".F-trade") || text(tr).includes("Traded to");
    if (isTrade) {
      for (const p of tr.querySelectorAll("td.No-pstart p")) {
        const a = p.querySelector("a");
        rows.push({
          season, txn, date, type: "trade", team_id,
          player: text(a), player_id: playerId(a),
          ...splitPosition(text(p.querySelector(".F-position"))),
          detail: "Traded to", faab: null,
        });
      }
      continue;
    }

    const icons = [...(iconCell?.querySelectorAll("[title]") ?? [])].map((s) => s.getAttribute("title"));
    tr.querySelectorAll("td.No-pstart .Pbot-xs").forEach((line, i) => {
      const a = line.querySelector("a");
      const detail = text(line.querySelector("h6"));
      const faab = detail.match(/^\$(\d+)/);
      rows.push({
        season, txn, date,
        type: icons[i] === "Dropped Player" ? "drop" : "add",
        team_id,
        player: text(a), player_id: playerId(a),
        ...splitPosition(text(line.querySelector(".F-position"))),
        detail, faab: faab ? Number(faab[1]) : null,
      });
    });
  }
  return rows;
}

const num = (s: string) => (/^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null);

export function parseMatchup(html: string, season: number, week: number): LineupRow[] {
  const d = doc(html);
  const ids = [...d.querySelectorAll("#matchup-header .Fz-xxl a")].map((a) => teamNumber(a.getAttribute("href")));
  const [left, right] = ids;
  if (left == null) throw new Error(`Matchup ${season} w${week} has no team in its header`);

  const rows: LineupRow[] = [];
  for (const tr of d.querySelectorAll("#statTable1 tbody tr, #statTable2 tbody tr")) {
    const c = tr.children;
    const slot = text(c[5]);
    if (!slot || slot === "TOTAL") continue;
    const sides: [number | null | undefined, Element, Element, Element][] = [
      [left, c[1], c[3], c[2]],
      [right, c[9], c[7], c[8]],
    ];
    for (const [team_id, playerCell, pts, proj] of sides) {
      const a = playerCell?.querySelector("a.name") ?? null;
      if (team_id == null || !a) continue; // empty slot, or bye with no opponent
      rows.push({
        season, week, team_id, slot,
        player: a.getAttribute("title") || text(a),
        player_id: playerId(a),
        points: num(text(pts)),
        projected: num(text(proj)),
      });
    }
  }
  return rows;
}

// Fragments for a season in progress (standings, draft results, matchup scores), so a live season
// can fill the same data files the 2012-2025 history came in.

export interface MatchupSide {
  team_id: number;
  team: string;
  /** Yahoo nickname as shown on the page, e.g. "Peter" or "efuego93". */
  manager: string;
  score: number;
}

export function parseMatchupHeader(html: string): { left: MatchupSide; right: MatchupSide | null } {
  const d = doc(html);
  const sides = [...d.querySelectorAll("#matchup-header .Grid-u-1-3.Ptop-med")].map((side) => {
    const a = side.querySelector(".Fz-xxl a");
    return { team_id: teamNumber(a?.getAttribute("href")), team: text(a), manager: text(side.querySelector(".user-id")) };
  });
  const scores = [...d.querySelectorAll("#matchup-header table td.Fz-xxl")].map((td) => num(text(td)));
  const side = (i: number): MatchupSide | null =>
    sides[i]?.team_id != null && scores[i] != null
      ? { team_id: sides[i].team_id!, team: sides[i].team, manager: sides[i].manager, score: scores[i]! }
      : null;
  const left = side(0);
  if (!left) throw new Error("Matchup header without a team and score");
  return { left, right: side(1) };
}

export interface StandingRow {
  team_id: number;
  team: string;
  rank: number;
  wins: number;
  losses: number;
  ties: number;
  points_for: number;
  points_against: number;
  /** e.g. "W-7" */
  streak: string;
}

export function parseStandings(html: string): StandingRow[] {
  return [...doc(html).querySelectorAll("tbody tr")].map((tr) => {
    const c = tr.children;
    const team = [...c[1].querySelectorAll("a")].find((a) => text(a)) ?? null;
    const [wins, losses, ties] = text(c[2]).split("-").map(Number);
    const id = teamNumber(team?.getAttribute("href"));
    if (id == null) throw new Error(`Standings row without a team link: ${text(tr)}`);
    return {
      team_id: id,
      team: text(team),
      rank: Number(text(c[0])),
      wins, losses, ties,
      points_for: Number(text(c[3])),
      points_against: Number(text(c[4])),
      streak: text(c[5]),
    };
  });
}

export interface DraftRow {
  round: number;
  /** 1-based position within the round. */
  pick_in_round: number;
  player: string;
  player_id: string | null;
  nfl_team: string;
  position: string;
  /** Drafting team's name (the page gives no team id). */
  team: string;
}

export function parseDraftResults(html: string): DraftRow[] {
  const rows: DraftRow[] = [];
  for (const table of doc(html).querySelectorAll("table")) {
    const round = Number(text(table.querySelector("thead")).match(/Round (\d+)/)?.[1]);
    if (!round) continue;
    for (const tr of table.querySelectorAll("tbody tr")) {
      const a = tr.querySelector("td.player a");
      const meta = text(tr.querySelector("td.player .Block")).match(/^\((.+?) - (.+)\)$/);
      const last = tr.querySelector("td.last");
      rows.push({
        round,
        pick_in_round: Number(text(tr.querySelector("td.first")).replace(".", "")),
        player: text(a),
        player_id: playerId(a),
        nfl_team: meta?.[1] ?? "",
        position: meta?.[2] ?? "",
        team: last?.getAttribute("title") || text(last),
      });
    }
  }
  return rows;
}
