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

export interface PastHalf {
  year: number;
  manager: string;
  wins: number;
  pointsFor: number;
  finalRank: number;
  playoffs: boolean;
  /** Full regular-season record. */
  regWins: number;
  regLosses: number;
}

export interface Midseason {
  season: number;
  week: number;
  regularWeeks: number;
  playoffTeams: number;
  teams: TeamRow[];
  /** Since 2012: by wins after `week` games, how many teams made the playoffs and won it all. */
  historyByWins: { wins: number; teams: number; playoffs: number; titles: number }[];
  /** Every finished season's team after the same number of games, with how it finished. */
  pastHalves: PastHalf[];
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
function pastHalvesAt(week: number): PastHalf[] {
  const finished = getRosterSeasons().filter((y) => y !== getLiveSeason()?.season);
  const rows: PastHalf[] = [];
  for (const y of finished) {
    const S = getSeasonModel(y)!;
    const n = Number(leagueInfo.find((l) => l.season_year === y)!.num_playoff_teams);
    for (const [mgr, st] of S.standings) {
      const g = gamesFor(S, mgr, week);
      if (g.length < week) continue;
      const reg = gamesFor(S, mgr, S.playoffStart - 1);
      rows.push({
        year: y,
        manager: mgr,
        wins: g.reduce((a, x) => a + (x.result === "W" ? 1 : x.result === "T" ? 0.5 : 0), 0),
        pointsFor: round1(g.reduce((a, x) => a + x.points, 0)),
        finalRank: st.final_rank,
        playoffs: st.final_rank <= n,
        regWins: reg.filter((x) => x.result === "W").length,
        regLosses: reg.filter((x) => x.result === "L").length,
      });
    }
  }
  return rows;
}

function historyByRecord(rows: PastHalf[]) {
  const byWins = new Map<number, { wins: number; teams: number; playoffs: number; titles: number }>();
  for (const r of rows) {
    const b = byWins.get(r.wins) ?? { wins: r.wins, teams: 0, playoffs: 0, titles: 0 };
    b.teams++;
    if (r.playoffs) b.playoffs++;
    if (r.finalRank === 1) b.titles++;
    byWins.set(r.wins, b);
  }
  return [...byWins.values()].sort((a, b) => b.wins - a.wins);
}

/** A manager's record over their last `n` regular-season games, reaching back into last season. */
function recentRecord(manager: string, season: number, week: number, n: number) {
  const prev = getSeasonModel(season - 1);
  const games = [
    ...(prev ? gamesFor(prev, manager, prev.playoffStart - 1) : []),
    ...gamesFor(getSeasonModel(season)!, manager, week),
  ].slice(-n);
  return { games: games.length, wins: games.filter((g) => g.result === "W").length, losses: games.filter((g) => g.result === "L").length };
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
  const pastHalves = pastHalvesAt(week);
  const historyByWins = historyByRecord(pastHalves);
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
    pastHalves,
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
  const rec = (w: number) => `${w}-${m.week - w}`;
  const same = m.pastHalves.filter((x) => x.wins === leader.wins).sort((a, b) => a.year - b.year);
  if (same.length && same.length <= 5) {
    // Name them: "Peter Klensch (2016, 2017) and Ryan Curran (2014)".
    const who = [...new Set(same.map((x) => x.manager))].map(
      (mgr) => `${mgr} (${same.filter((x) => x.manager === mgr).map((x) => x.year).join(", ")})`,
    );
    const times = same.filter((x) => x.manager === leader.manager).length + 1;
    const again = times > 1 ? ` for the ${["", "", "second", "third", "fourth"][times] ?? ord(times)} time` : "";
    const regs = same.map((x) => `${x.regWins}-${x.regLosses}`);
    const allSame = regs.every((r) => r === regs[0]);
    out.push(
      `${leader.manager} is ${rec(leader.wins)} at the halfway mark${again}. Before this year, only ${who.join(" and ")} started ${rec(leader.wins)}. ${
        h.playoffs === h.teams ? "All made the playoffs" : `${h.playoffs} of ${h.teams} made the playoffs`
      }${allSame ? `, all finished ${regs[0]}` : ""}, and ${h.titles ? `${h.titles} won the title` : "none won the title"}.`,
    );
  } else if (h.teams) {
    out.push(
      `${leader.manager} is ${rec(leader.wins)} at the halfway mark. Since 2012, ${h.teams} teams started ${rec(leader.wins)}: ${h.playoffs} made the playoffs and ${h.titles} won the title.`,
    );
  }
  // How the leader's scoring compares with every half since 2012.
  const allPf = [...m.pastHalves.map((x) => ({ who: x.manager, year: x.year, pf: x.pointsFor })), ...m.teams.map((t) => ({ who: t.manager, year: m.season, pf: t.pointsFor }))].sort(
    (a, b) => b.pf - a.pf,
  );
  const leaderPfRank = allPf.findIndex((x) => x.who === leader.manager && x.year === m.season) + 1;
  if (leaderPfRank > 10) {
    const best = allPf[0];
    out.push(
      `${leader.manager}'s ${Math.round(leader.pointsFor)} points rank only ${ord(leaderPfRank)} of ${allPf.length} halves since 2012. The most ever: ${best.who}'s ${Math.round(best.pf)} in ${best.year}.`,
    );
  }
  // Champions at the halfway mark.
  const champs = m.pastHalves.filter((x) => x.finalRank === 1);
  if (champs.length) {
    const counts = new Map<number, number>();
    for (const c of champs) counts.set(c.wins, (counts.get(c.wins) ?? 0) + 1);
    const [common, commonN] = [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
    const worst = Math.min(...champs.map((c) => c.wins));
    const worstChamps = champs.filter((c) => c.wins === worst).sort((a, b) => a.year - b.year);
    const nowCommon = m.teams.filter((t) => t.wins === common).map((t) => t.manager);
    const atLeader = counts.get(leader.wins) ?? 0;
    out.push(
      `${commonN} of ${champs.length} champions were ${rec(common)} at the halfway mark${atLeader ? "" : `, none ${rec(leader.wins)}`}. The worst halfway record to win it all: ${rec(worst)} (${worstChamps.map((c) => `${c.manager} ${c.year}`).join(", ")}).${
        nowCommon.length ? ` At ${rec(common)} now: ${nowCommon.join(", ")}.` : ""
      }`,
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
  // Cold spells that started last season.
  const slump = m.teams
    .map((t) => ({ t, r: recentRecord(t.manager, m.season, m.week, m.regularWeeks) }))
    .filter((x) => x.r.games === m.regularWeeks)
    .sort((a, b) => a.r.wins - b.r.wins)[0];
  if (slump && slump.r.wins <= 2) {
    out.push(`${slump.t.manager} is ${slump.r.wins}-${slump.r.losses} over the last ${slump.r.games} regular-season games, going back to last season.`);
  }
  // Best finish ever from a bad halfway record, for teams sitting there now.
  for (const wins of [...new Set(m.teams.filter((x) => x.wins <= 2).map((x) => x.wins))].sort((a, b) => b - a)) {
    const from = m.pastHalves.filter((x) => x.wins === wins && x.playoffs).sort((a, b) => a.finalRank - b.finalRank || b.year - a.year)[0];
    if (!from) continue;
    const now = m.teams.filter((x) => x.wins === wins).map((x) => x.manager);
    const finish = from.finalRank === 1 ? "won the title" : from.finalRank === 2 ? "reached the championship game" : `made the playoffs (finished ${ord(from.finalRank)})`;
    out.push(`Hope from ${rec(wins)}: ${from.manager} was ${rec(wins)} in ${from.year}, finished ${from.regWins}-${from.regLosses} and ${finish}. At ${rec(wins)} now: ${now.join(", ")}.`);
  }
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
