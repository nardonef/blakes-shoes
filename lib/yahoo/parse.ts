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
