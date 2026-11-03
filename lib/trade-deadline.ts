import leagueInfo from "@/data/league_info.json";

// The current season's trade deadline, from the league's Yahoo settings (trade_end_date). Trades are
// allowed through that date, so the deadline is the end of the day in US Eastern time.

/** Epoch ms of 11:59:59 PM Eastern on an ISO date (handles daylight saving). */
export function endOfDayEastern(date: string): number {
  const asUtc = Date.parse(`${date}T23:59:59Z`);
  const offset = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "shortOffset" })
    .formatToParts(new Date(asUtc))
    .find((p) => p.type === "timeZoneName")!.value; // e.g. "GMT-5"
  const hours = Number(offset.replace("GMT", "") || 0);
  return asUtc - hours * 3600e3;
}

export function getTradeDeadline(): { date: string; at: number } {
  const latest = leagueInfo.reduce((a, b) => (b.season_year > a.season_year ? b : a));
  return { date: latest.trade_end_date, at: endOfDayEastern(latest.trade_end_date) };
}

/** "NOV 14, 2026" */
export function deadlineLabel(date: string): string {
  return new Date(`${date}T12:00:00Z`)
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .toUpperCase();
}
