import leagueInfo from "@/data/league_info.json";
import { getDraftModel } from "@/lib/draft-board";
import { topBusts, topSteals, type BoardPick, type DraftTotal } from "@/lib/draft-board-view";
import { getWaiverReport, type WaiverPickup } from "@/lib/front-office-data";
import { weekLineup } from "@/lib/luck-lineups-data";
import { getRosterSeasons, getSeasonModel, type SeasonModel, type Trade } from "@/lib/rosters-data";
import { getLiveSeason } from "@/lib/season-status";

// The midseason report (/midseason): the live season so far, plus how teams with the same record at
// the same point have finished since 2012. Server-only.

const round1 = (n: number) => Math.round(n * 10) / 10;
const known = (m: string) => !m.endsWith("(unknown manager)");

export interface TeamRow {
  manager: string;
  team: string;
  rank: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  /** Record against every team every week, and real wins minus what that predicts. */
  allPlayWins: number;
  allPlayLosses: number;
  luck: number;
  streak: string;
  /** Since 2012, teams with this many wins after the same number of games: how they finished. */
  history: { teams: number; playoffs: number; titles: number };
  benchPoints: number;
  efficiency: number;
  couldaWon: number;
  faabLeft: number;
}

export interface GameNote {
  week: number;
  manager: string;
  opponent: string;
  points: number;
  opponentPoints: number;
}

export interface Midseason {
  season: number;
  week: number;
  regularWeeks: number;
  playoffTeams: number;
  teams: TeamRow[];
  /** Since 2012: by wins after `week` games, how many teams made the playoffs and won it all. */
  historyByWins: { wins: number; teams: number; playoffs: number; titles: number }[];
  topScore: GameNote;
  lowScore: GameNote;
  blowout: GameNote;
  closest: GameNote;
  pickups: WaiverPickup[];
  bids: { manager: string; player: string; faab: number; week: number; aboveAvg: number | null }[];
  trades: Trade[];
  draftGrades: DraftTotal[];
  steals: BoardPick[];
  busts: BoardPick[];
  storylines: string[];
}

function gamesFor(S: SeasonModel, mgr: string, through: number) {
  const out: { week: number; result: "W" | "L" | "T"; points: number; opponentPoints: number; opponent: string }[] = [];
  for (let w = 1; w <= through; w++) {
    const g = S.games.get(`${mgr}|${w}`);
    if (g) out.push({ week: w, ...g });
  }
  return out;
}

/** Every finished season's team records after `week` games, with how each team finished. */
function historyAt(week: number) {
  const finished = getRosterSeasons().filter((y) => y !== getLiveSeason()?.season);
  const rows: { wins: number; playoffs: boolean; title: boolean }[] = [];
  for (const y of finished) {
    const S = getSeasonModel(y)!;
    const n = Number(leagueInfo.find((l) => l.season_year === y)!.num_playoff_teams);
    for (const [mgr, st] of S.standings) {
      const g = gamesFor(S, mgr, week);
      if (g.length < week) continue;
      rows.push({
        wins: g.reduce((a, x) => a + (x.result === "W" ? 1 : x.result === "T" ? 0.5 : 0), 0),
        playoffs: st.final_rank <= n,
        title: st.final_rank === 1,
      });
    }
  }
  const byWins = new Map<number, { wins: number; teams: number; playoffs: number; titles: number }>();
  for (const r of rows) {
    const b = byWins.get(r.wins) ?? { wins: r.wins, teams: 0, playoffs: 0, titles: 0 };
    b.teams++;
    if (r.playoffs) b.playoffs++;
    if (r.title) b.titles++;
    byWins.set(r.wins, b);
  }
  return [...byWins.values()].sort((a, b) => b.wins - a.wins);
}

const ord = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

let cache: Midseason | null = null;

export function getMidseason(): Midseason | null {
  if (cache) return cache;
  const live = getLiveSeason();
  if (!live) return null;
  const { season, throughWeek: week } = live;
  const S = getSeasonModel(season)!;
  const li = leagueInfo.find((l) => l.season_year === season)!;
  const regularWeeks = Number(li.playoff_start_week) - 1;
  const playoffTeams = Number(li.num_playoff_teams);
  const historyByWins = historyAt(week);
  // All-play: each week's score against every other team's that week.
  const weekScores = new Map<number, number[]>();
  for (const [mgr] of S.standings) {
    for (const x of gamesFor(S, mgr, week)) weekScores.set(x.week, [...(weekScores.get(x.week) ?? []), x.points]);
  }
  const waiver = getWaiverReport();
  const pickupValue = new Map(waiver.pickups.filter((p) => p.season === season).map((p) => [`${p.manager}|${p.player}`, p.aboveAvg]));

  const spent = new Map<string, number>();
  for (const t of S.txns) if (t.type === "add" && t.faab) spent.set(t.mgr, (spent.get(t.mgr) ?? 0) + t.faab);

  const teams: TeamRow[] = [...S.standings]
    .map(([manager, st]) => {
      const g = gamesFor(S, manager, week);
      const wins = g.filter((x) => x.result === "W").length;
      let streak = "";
      if (g.length) {
        const last = g[g.length - 1].result;
        let n = 0;
        for (let i = g.length - 1; i >= 0 && g[i].result === last; i--) n++;
        streak = `${last}${n}`;
      }
      let bench = 0;
      let actual = 0;
      let best = 0;
      let couldaWon = 0;
      for (const x of g) {
        const l = weekLineup(S, manager, x.week);
        if (!l) continue;
        actual += l.actual;
        best += l.best;
        bench += l.best - l.actual;
        if (x.result === "L" && l.best > x.opponentPoints) couldaWon++;
      }
      let apW = 0;
      let apL = 0;
      for (const x of g) {
        for (const p of weekScores.get(x.week) ?? []) {
          if (p < x.points) apW++;
          else if (p > x.points) apL++;
        }
      }
      const expectedWins = apW + apL ? (apW / (apW + apL)) * g.length : 0;
      const h = historyByWins.find((b) => b.wins === wins) ?? { teams: 0, playoffs: 0, titles: 0 };
      return {
        manager,
        team: st.team,
        rank: st.final_rank,
        wins,
        losses: g.filter((x) => x.result === "L").length,
        ties: g.filter((x) => x.result === "T").length,
        pointsFor: round1(g.reduce((a, x) => a + x.points, 0)),
        pointsAgainst: round1(g.reduce((a, x) => a + x.opponentPoints, 0)),
        allPlayWins: apW,
        allPlayLosses: apL,
        luck: round1(wins - expectedWins),
        streak,
        history: { teams: h.teams, playoffs: h.playoffs, titles: h.titles },
        benchPoints: round1(bench),
        efficiency: best ? actual / best : 0,
        couldaWon,
        faabLeft: 100 - (spent.get(manager) ?? 0),
      };
    })
    .sort((a, b) => a.rank - b.rank);

  const notes: GameNote[] = [];
  for (const t of teams) {
    for (const x of gamesFor(S, t.manager, week)) {
      notes.push({ week: x.week, manager: t.manager, opponent: x.opponent, points: x.points, opponentPoints: x.opponentPoints });
    }
  }
  const wonGames = notes.filter((n) => n.points > n.opponentPoints);
  const topScore = notes.reduce((a, b) => (b.points > a.points ? b : a));
  const lowScore = notes.reduce((a, b) => (b.points < a.points ? b : a));
  const blowout = wonGames.reduce((a, b) => (b.points - b.opponentPoints > a.points - a.opponentPoints ? b : a));
  const closest = wonGames.reduce((a, b) => (b.points - b.opponentPoints < a.points - a.opponentPoints ? b : a));

  const pickups = waiver.pickups.filter((p) => p.season === season && known(p.manager)).slice(0, 5);
  const bids = S.txns
    .filter((t) => t.type === "add" && t.faab > 0 && t.week <= week)
    .sort((a, b) => b.faab - a.faab)
    .slice(0, 6)
    .map((t) => ({ manager: t.mgr, player: t.player, faab: t.faab, week: t.week, aboveAvg: pickupValue.get(`${t.mgr}|${t.player}`) ?? null }));

  const draft = getDraftModel().seasons.find((s) => s.year === season);
  const draftGrades = draft ? [...draft.totals].sort((a, b) => a.rank - b.rank) : [];

  cache = {
    season,
    week,
    regularWeeks,
    playoffTeams,
    teams,
    historyByWins,
    topScore,
    lowScore,
    blowout,
    closest,
    pickups,
    bids,
    trades: S.trades,
    draftGrades,
    steals: draft ? topSteals([draft]).slice(0, 5) : [],
    busts: draft ? topBusts([draft]).slice(0, 5) : [],
    storylines: [],
  };
  cache.storylines = storylines(cache);
  return cache;
}

/** Talking points for the hosts, written from the numbers. */
function storylines(m: Midseason): string[] {
  const out: string[] = [];
  const leader = m.teams[0];
  const h = leader.history;
  if (h.teams) {
    out.push(
      `${leader.manager} is ${leader.wins}-${leader.losses} at the halfway mark. Since 2012, ${h.teams} team${h.teams === 1 ? "" : "s"} started ${leader.wins}-${m.week - leader.wins}: ${h.playoffs} made the playoffs and ${h.titles} won the title.`,
    );
  }
  const line = m.teams[m.playoffTeams - 1];
  const bubble = m.teams.filter((t) => t.wins === line.wins);
  if (bubble.length > 1) {
    out.push(
      `${bubble.length} teams are ${line.wins}-${m.week - line.wins} around the playoff line (${ord(m.playoffTeams)} place): ${bubble.map((t) => t.manager).join(", ")}.`,
    );
  }
  const unlucky = [...m.teams].sort((a, b) => a.luck - b.luck)[0];
  const lucky = [...m.teams].sort((a, b) => b.luck - a.luck)[0];
  out.push(
    `Luckiest so far: ${lucky.manager}, ${lucky.luck.toFixed(1)} wins better than the weekly scores deserve. Unluckiest: ${unlucky.manager}, ${Math.abs(unlucky.luck).toFixed(1)} wins short.`,
  );
  // Records that don't match the scoring, in either direction.
  const pfRank = [...m.teams].sort((a, b) => b.pointsFor - a.pointsFor);
  const gap = (t: TeamRow) => pfRank.indexOf(t) + 1 - t.rank; // > 0: record better than the points
  const over = [...m.teams].sort((a, b) => gap(b) - gap(a))[0];
  const under = [...m.teams].sort((a, b) => gap(a) - gap(b))[0];
  if (gap(over) >= 3) {
    out.push(`${over.manager} is ${over.wins}-${over.losses} (${ord(over.rank)}) despite the ${ord(pfRank.indexOf(over) + 1)}-most points.`);
  }
  if (gap(under) <= -2) {
    out.push(`${under.manager} has the ${ord(pfRank.indexOf(under) + 1)}-most points but sits ${ord(under.rank)} at ${under.wins}-${under.losses}.`);
  }
  const bench = [...m.teams].sort((a, b) => b.benchPoints - a.benchPoints)[0];
  out.push(`${bench.manager} has left ${Math.round(bench.benchPoints)} points on the bench, the most in the league${bench.couldaWon ? `, and a better lineup would have won ${bench.couldaWon} of those losses` : ""}.`);
  out.push(`Week ${m.topScore.week} belonged to ${m.topScore.manager}: ${m.topScore.points.toFixed(2)}, the season high so far.`);
  if (m.pickups[0]) {
    const p = m.pickups[0];
    out.push(`Pickup of the year so far: ${p.player} for ${p.manager} (week ${p.week}${p.faab ? `, $${p.faab}` : ""}).`);
  }
  if (m.steals[0]) out.push(`Draft steal: ${m.steals[0].player}, taken ${m.steals[0].label} by ${m.steals[0].manager}.`);
  const toughest = [...m.teams].sort((a, b) => b.pointsAgainst - a.pointsAgainst)[0];
  out.push(`Toughest schedule: ${toughest.manager} has faced ${Math.round(toughest.pointsAgainst)} points, the most in the league.`);
  const streakLen = (t: TeamRow) => Number(t.streak.slice(1)) || 0;
  const hot = m.teams.filter((t) => t.streak.startsWith("W")).sort((a, b) => streakLen(b) - streakLen(a))[0];
  const cold = m.teams.filter((t) => t.streak.startsWith("L")).sort((a, b) => streakLen(b) - streakLen(a))[0];
  if (hot && cold) out.push(`Hottest: ${hot.manager}, ${streakLen(hot)} straight wins. Coldest: ${cold.manager}, ${streakLen(cold)} straight losses.`);
  const grade = new Map(m.draftGrades.map((g) => [g.manager, g.grade]));
  const worstDraft = m.draftGrades[m.draftGrades.length - 1];
  const worstDraftTeam = worstDraft && m.teams.find((t) => t.manager === worstDraft.manager);
  if (worstDraftTeam && worstDraftTeam.rank <= m.playoffTeams) {
    out.push(`${worstDraftTeam.manager} has the league's worst draft grade (${grade.get(worstDraftTeam.manager)}) and is still in a playoff spot at ${worstDraftTeam.wins}-${worstDraftTeam.losses}.`);
  }
  const broke = [...m.teams].sort((a, b) => a.faabLeft - b.faabLeft)[0];
  out.push(`${broke.manager} has $${broke.faabLeft} of FAAB left for the stretch run.`);
  return out;
}
