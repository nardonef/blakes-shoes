"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  getSeasons,
  getSeasonStandings,
  getManagerStats,
  getSeasonScoringTrends,
  getScoreDistribution,
  getTopPerformances,
  getLowestPerformances,
  getVisibleH2HRecords,
  getChampionsChartData,
  getBlowouts,
  getClosestGames,
  getLuckIndex,
  getManagerConsistency,
  getPlayoffStats,
  chartColors,
} from "@/lib/stats-data";

function SectionHeading({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-4 flex-wrap">
        <h2
          className="text-[30px] md:text-[42px] text-[#151515]"
          style={{ fontFamily: "var(--font-bebas-neue)" }}
        >
          {children}
        </h2>
        <span className="flex-1 min-w-[20px] h-0.5 bg-[#151515]" />
      </div>
      {subtitle && (
        <p
          className="text-[10.5px] tracking-[.08em] text-[var(--muted-light)] uppercase mt-2"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

function SubHeading({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3.5">
        <h3
          className="text-[24px] md:text-[32px] text-[#151515]"
          style={{ fontFamily: "var(--font-bebas-neue)" }}
        >
          {children}
        </h3>
        <span className="flex-1 h-0.5 bg-[#151515]" />
      </div>
      {subtitle && (
        <p
          className="text-[10px] tracking-[.1em] text-[var(--muted-light)] uppercase mt-1.5"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

function RankedList({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: { rank: number; rankColor: string; primary: string; meta: string; value: string; valueColor: string }[];
}) {
  return (
    <section>
      <SubHeading subtitle={subtitle}>{title}</SubHeading>
      <div className="bg-white">
        {rows.map((row, i) => (
          <div
            key={i}
            className="flex items-center gap-3 py-[11px] px-3.5 border-b border-[var(--hairline)]"
          >
            <div
              className="text-[20px] w-[22px] leading-none shrink-0"
              style={{ fontFamily: "var(--font-bebas-neue)", color: row.rankColor }}
            >
              {row.rank}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-semibold text-[#151515] truncate">{row.primary}</div>
              <div
                className="text-[9.5px] text-[var(--muted-light)] truncate"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                {row.meta}
              </div>
            </div>
            <div
              className="text-[22px] leading-none shrink-0"
              style={{ fontFamily: "var(--font-bebas-neue)", color: row.valueColor }}
            >
              {row.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Custom Tooltip Component (still used by Scoring Trends, the one panel that
// keeps Recharts' <Tooltip>)
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="bg-white p-3 border border-[var(--hairline)]">
      <p className="font-semibold text-[#151515] mb-1">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === "number" ? entry.value.toFixed(1) : entry.value}
        </p>
      ))}
    </div>
  );
}

export default function StatsPage() {
  const seasons = getSeasons();
  const [selectedSeason, setSelectedSeason] = useState(seasons[0]);

  const championsData = getChampionsChartData();
  const managerStats = getManagerStats();
  const scoringTrends = getSeasonScoringTrends();
  const scoreDistribution = getScoreDistribution();
  const topPerformances = getTopPerformances(10);
  const lowestPerformances = getLowestPerformances(10);
  const h2hRecords = getVisibleH2HRecords();
  const seasonStandings = getSeasonStandings(selectedSeason);
  const blowouts = getBlowouts(10);
  const closestGames = getClosestGames(10);
  const luckIndex = getLuckIndex();
  const consistency = getManagerConsistency();
  const playoffStats = getPlayoffStats();

  // Summary stats
  const totalGames = scoringTrends.reduce((acc, s) => acc + s.totalGames, 0);
  const allTimeHighScore = Math.max(...scoringTrends.map((s) => s.highScore));
  const avgPointsPerGame =
    scoringTrends.reduce((acc, s) => acc + s.avgScore * s.totalGames, 0) / totalGames;

  const leaderboard = [...managerStats].sort((a, b) => b.totalWins - a.totalWins);

  const luckMaxAbs = Math.max(1, ...luckIndex.map((l) => Math.abs(l.luck)));
  const consistencyMax = Math.max(1, ...consistency.map((c) => c.stdDev));

  const champBars = [...championsData].reverse();
  const champMin = Math.min(...championsData.map((c) => c.points)) - 100;
  const champMax = Math.max(...championsData.map((c) => c.points)) + 50;
  const champRange = champMax - champMin;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header band + summary tiles */}
      <header className="bg-[#151515] text-[#f5f5f0] px-4 md:px-10 pt-8 md:pt-[52px]">
        <div className="max-w-[1160px] mx-auto">
          <div
            className="text-[11px] font-semibold tracking-[.26em] text-[var(--accent-light)] mb-2.5"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            THE RECORD BOOK
          </div>
          <h1
            className="text-[48px] md:text-[88px] leading-[.86] mb-6 md:mb-[34px]"
            style={{ fontFamily: "var(--font-bebas-neue)" }}
          >
            LEAGUE STATS
          </h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0.5 bg-[#3a3a38] translate-y-px">
            <div className="bg-[var(--panel)] p-4 md:p-[22px]">
              <div
                className="text-[9.5px] font-semibold tracking-[.18em] text-[var(--muted-dark)] mb-1.5"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                SEASONS
              </div>
              <div className="text-[34px] md:text-[48px] leading-none text-[var(--accent-light)]" style={{ fontFamily: "var(--font-bebas-neue)" }}>
                {seasons.length}
              </div>
            </div>
            <div className="bg-[var(--panel)] p-4 md:p-[22px]">
              <div
                className="text-[9.5px] font-semibold tracking-[.18em] text-[var(--muted-dark)] mb-1.5"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                TOTAL GAMES
              </div>
              <div className="text-[34px] md:text-[48px] leading-none text-[var(--accent-light)]" style={{ fontFamily: "var(--font-bebas-neue)" }}>
                {Math.round(totalGames)}
              </div>
            </div>
            <div className="bg-[var(--panel)] p-4 md:p-[22px]">
              <div
                className="text-[9.5px] font-semibold tracking-[.18em] text-[var(--muted-dark)] mb-1.5"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                ALL-TIME HIGH
              </div>
              <div className="text-[34px] md:text-[48px] leading-none text-[var(--accent-light)]" style={{ fontFamily: "var(--font-bebas-neue)" }}>
                {allTimeHighScore.toFixed(1)}
              </div>
              <div
                className="text-[9.5px] text-[var(--muted-light)] mt-1"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                SINGLE GAME
              </div>
            </div>
            <div className="bg-[var(--panel)] p-4 md:p-[22px]">
              <div
                className="text-[9.5px] font-semibold tracking-[.18em] text-[var(--muted-dark)] mb-1.5"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                AVG PPG
              </div>
              <div className="text-[34px] md:text-[48px] leading-none text-[var(--accent-light)]" style={{ fontFamily: "var(--font-bebas-neue)" }}>
                {avgPointsPerGame.toFixed(1)}
              </div>
              <div
                className="text-[9.5px] text-[var(--muted-light)] mt-1"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                LEAGUE WIDE
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1160px] mx-auto px-4 md:px-10 py-8 md:py-[52px] pb-14 md:pb-[88px] flex flex-col gap-9 md:gap-14">
        {/* Manager Leaderboard */}
        <section>
          <SectionHeading subtitle="All-time, current managers · sorted by wins">MANAGER LEADERBOARD</SectionHeading>
          <div
            className="grid grid-cols-[36px_minmax(0,1fr)_46px_46px_62px_62px_40px] bg-[#151515] text-[#f5f5f0] text-[9.5px] font-semibold tracking-[.1em]"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            <div className="py-[11px] pl-3">#</div>
            <div className="py-[11px] px-2">MANAGER</div>
            <div className="py-[11px] px-1 text-right">W</div>
            <div className="py-[11px] px-1 text-right">L</div>
            <div className="py-[11px] px-1 text-right">WIN%</div>
            <div className="py-[11px] px-1 text-right">PPG</div>
            <div className="py-[11px] pr-3 pl-1 text-right">TTL</div>
          </div>
          <div className="bg-white">
            {leaderboard.map((manager, index) => (
              <div
                key={manager.manager}
                className="grid grid-cols-[36px_minmax(0,1fr)_46px_46px_62px_62px_40px] border-b border-[var(--hairline)] items-center text-[13.5px]"
              >
                <div
                  className="py-[11px] pl-3 text-[20px] leading-none"
                  style={{
                    fontFamily: "var(--font-bebas-neue)",
                    color: index < 3 ? "var(--accent)" : "var(--dim)",
                  }}
                >
                  {index + 1}
                </div>
                <div className="py-[11px] px-2 font-semibold text-[#151515] truncate">{manager.manager}</div>
                <div className="py-[11px] px-1 text-right font-semibold text-[#151515]">{manager.totalWins}</div>
                <div className="py-[11px] px-1 text-right text-[var(--muted-light)]">{manager.totalLosses}</div>
                <div className="py-[11px] px-1 text-right font-semibold text-[var(--accent)]">
                  {(manager.winPercentage * 100).toFixed(1)}%
                </div>
                <div className="py-[11px] px-1 text-right text-[var(--body-text)]">{manager.avgPointsPerGame.toFixed(1)}</div>
                <div
                  className="py-[11px] pr-3 pl-1 text-right text-[19px] leading-none"
                  style={{
                    fontFamily: "var(--font-bebas-neue)",
                    color: manager.championships > 0 ? "var(--accent)" : "var(--dim)",
                  }}
                >
                  {manager.championships > 0 ? `×${manager.championships}` : "—"}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Top / Lowest Performances */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-9">
          <RankedList
            title="TOP PERFORMANCES"
            subtitle="Highest single-game scores"
            rows={topPerformances.map((p, i) => ({
              rank: i + 1,
              rankColor: i < 3 ? "var(--accent)" : "var(--dim)",
              primary: p.team,
              meta: `${p.season} · WK ${p.week} · VS ${p.opponent.toUpperCase()}`,
              value: p.score.toFixed(1),
              valueColor: "var(--accent)",
            }))}
          />
          <RankedList
            title="LOWEST PERFORMANCES"
            subtitle="Lowest single-game scores"
            rows={lowestPerformances.map((p, i) => ({
              rank: i + 1,
              rankColor: "var(--dim)",
              primary: p.team,
              meta: `${p.season} · WK ${p.week} · VS ${p.opponent.toUpperCase()}`,
              value: p.score.toFixed(1),
              valueColor: "var(--muted-dark)",
            }))}
          />
        </div>

        {/* Nail Biters / Blowouts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-9">
          <RankedList
            title="NAIL BITERS"
            subtitle="Closest finishes"
            rows={closestGames.map((g, i) => {
              const loser = g.winner === g.team1 ? g.team2 : g.team1;
              return {
                rank: i + 1,
                rankColor: i < 3 ? "var(--negative)" : "var(--dim)",
                primary: g.winner,
                meta: `${g.season} · WK ${g.week} · VS ${loser.toUpperCase()}`,
                value: `+${g.margin.toFixed(1)}`,
                valueColor: "var(--negative)",
              };
            })}
          />
          <RankedList
            title="BIGGEST BLOWOUTS"
            subtitle="Largest victory margins"
            rows={blowouts.map((g, i) => {
              const winner = g.team1Score > g.team2Score ? g.team1 : g.team2;
              const loser = g.team1Score > g.team2Score ? g.team2 : g.team1;
              return {
                rank: i + 1,
                rankColor: i < 3 ? "var(--accent)" : "var(--dim)",
                primary: winner,
                meta: `${g.season} · WK ${g.week} · VS ${loser.toUpperCase()}`,
                value: `+${g.margin.toFixed(1)}`,
                valueColor: "var(--accent)",
              };
            })}
          />
        </div>

        {/* Luck Index */}
        <section>
          <SubHeading subtitle="Actual wins minus expected wins from scoring">LUCK INDEX</SubHeading>
          <div className="bg-white p-5 md:p-7">
            <div className="flex flex-col gap-2.5">
              {luckIndex.map((l) => {
                const pct = (Math.abs(l.luck) / luckMaxAbs) * 50;
                const positive = l.luck >= 0;
                const color = positive ? "var(--accent)" : "var(--negative)";
                return (
                  <div key={l.manager} className="flex items-center gap-2.5">
                    <div
                      className="w-[60px] md:w-[86px] text-[10px] text-[var(--body-text)] text-right truncate shrink-0"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      {l.manager}
                    </div>
                    <div className="flex-1 relative h-[18px] bg-[var(--background)]">
                      <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--rule)]" />
                      <div
                        className="absolute top-0 h-[18px]"
                        style={{
                          left: positive ? "50%" : `${50 - pct}%`,
                          width: `${pct}%`,
                          background: color,
                        }}
                      />
                    </div>
                    <div
                      className="w-10 text-[10px] font-semibold"
                      style={{ fontFamily: "var(--font-geist-mono)", color }}
                    >
                      {positive ? "+" : ""}
                      {l.luck.toFixed(1)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              className="flex gap-5 mt-[18px] pt-3.5 border-t border-[var(--hairline)] text-[9.5px] tracking-[.1em] text-[var(--muted-light)] flex-wrap"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[var(--accent)]" />
                WON MORE THAN EXPECTED
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[var(--negative)]" />
                UNLUCKY WITH MATCHUPS
              </span>
            </div>
          </div>
        </section>

        {/* Scoring Consistency */}
        <section>
          <SubHeading subtitle="Standard deviation of weekly scores · lower is steadier">SCORING CONSISTENCY</SubHeading>
          <div className="bg-white p-5 md:p-7">
            <div className="flex flex-col gap-2.5">
              {consistency.map((c, i) => (
                <div key={c.manager} className="flex items-center gap-2.5">
                  <div
                    className="w-[60px] md:w-[86px] text-[10px] text-[var(--body-text)] text-right truncate shrink-0"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {c.manager}
                  </div>
                  <div className="flex-1 h-[18px] bg-[var(--background)]">
                    <div
                      className="h-[18px]"
                      style={{
                        width: `${(c.stdDev / consistencyMax) * 100}%`,
                        background: i < 3 ? "var(--accent)" : "#151515",
                      }}
                    />
                  </div>
                  <div className="w-10 text-[10px] text-[var(--body-text)]" style={{ fontFamily: "var(--font-geist-mono)" }}>
                    {c.stdDev.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
            <div
              className="flex gap-5 mt-[18px] pt-3.5 border-t border-[var(--hairline)] text-[9.5px] tracking-[.1em] text-[var(--muted-light)] flex-wrap"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[var(--accent)]" />
                MOST CONSISTENT (TOP 3)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#151515]" />
                BOOM OR BUST
              </span>
            </div>
          </div>
        </section>

        {/* Season Standings */}
        <section>
          <div className="flex items-center gap-4 mb-5 flex-wrap">
            <h2 className="text-[30px] md:text-[42px] text-[#151515]" style={{ fontFamily: "var(--font-bebas-neue)" }}>
              SEASON STANDINGS
            </h2>
            <span className="flex-1 min-w-[20px] h-0.5 bg-[#151515]" />
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(Number(e.target.value))}
              className="bg-[#151515] text-white border-none px-3.5 py-2.5 text-[11px] font-semibold tracking-[.12em] focus:outline-none"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              {seasons.map((season) => (
                <option key={season} value={season}>
                  {season}
                </option>
              ))}
            </select>
          </div>

          <div
            className="grid grid-cols-[36px_minmax(0,1fr)_56px_50px_68px] bg-[#151515] text-[#f5f5f0] text-[9.5px] font-semibold tracking-[.1em]"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            <div className="py-[11px] pl-3">#</div>
            <div className="py-[11px] px-2">TEAM</div>
            <div className="py-[11px] px-1 text-right">W-L</div>
            <div className="py-[11px] px-1 text-right">WIN%</div>
            <div className="py-[11px] pr-3 pl-1 text-right">PTS</div>
          </div>
          <div className="bg-white">
            {seasonStandings.map((team) => (
              <div
                key={team.team_key}
                className="grid grid-cols-[36px_minmax(0,1fr)_56px_50px_68px] border-b border-[var(--hairline)] items-center"
              >
                <div
                  className="py-[11px] pl-3 text-[20px] leading-none"
                  style={{
                    fontFamily: "var(--font-bebas-neue)",
                    color: team.final_rank <= 3 ? "var(--accent)" : "var(--dim)",
                  }}
                >
                  {team.final_rank}
                </div>
                <div className="py-[11px] px-2 min-w-0">
                  <div className="text-[13.5px] font-semibold text-[#151515] truncate">{team.team_name}</div>
                  <div
                    className="text-[9.5px] tracking-[.06em] text-[var(--muted-light)] truncate"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {team.manager_name.toUpperCase()}
                  </div>
                </div>
                <div
                  className="py-[11px] px-1 text-right text-[20px] leading-none text-[#151515]"
                  style={{ fontFamily: "var(--font-bebas-neue)" }}
                >
                  {team.wins}-{team.losses}
                </div>
                <div className="py-[11px] px-1 text-right text-[13px] font-semibold text-[var(--accent)]">
                  {(team.win_percentage * 100).toFixed(0)}%
                </div>
                <div className="py-[11px] pr-3 pl-1 text-right text-[13px] text-[var(--body-text)]">
                  {team.points_for.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Playoff Performance */}
        <section>
          <SectionHeading subtitle="Clutch = playoff PPG minus regular season PPG">PLAYOFF PERFORMANCE</SectionHeading>
          <div
            className="grid grid-cols-[36px_minmax(0,1fr)_56px_56px_56px_56px] bg-[#151515] text-[#f5f5f0] text-[9.5px] font-semibold tracking-[.1em]"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            <div className="py-[11px] pl-3">#</div>
            <div className="py-[11px] px-2">MANAGER</div>
            <div className="py-[11px] px-1 text-right">PO W-L</div>
            <div className="py-[11px] px-1 text-right">PO PPG</div>
            <div className="py-[11px] px-1 text-right">REG PPG</div>
            <div className="py-[11px] pr-3 pl-1 text-right">CLUTCH</div>
          </div>
          <div className="bg-white">
            {playoffStats.map((stats, index) => (
              <div
                key={stats.manager}
                className="grid grid-cols-[36px_minmax(0,1fr)_56px_56px_56px_56px] border-b border-[var(--hairline)] items-center text-[13px]"
              >
                <div
                  className="py-[11px] pl-3 text-[20px] leading-none"
                  style={{
                    fontFamily: "var(--font-bebas-neue)",
                    color: index < 3 ? "var(--accent)" : "var(--dim)",
                  }}
                >
                  {index + 1}
                </div>
                <div className="py-[11px] px-2 font-semibold text-[#151515] truncate">{stats.manager}</div>
                <div className="py-[11px] px-1 text-right font-semibold text-[#151515]">
                  {stats.playoffWins}-{stats.playoffLosses}
                </div>
                <div className="py-[11px] px-1 text-right text-[#151515]">{stats.playoffPPG.toFixed(1)}</div>
                <div className="py-[11px] px-1 text-right text-[var(--muted-light)]">{stats.regularPPG.toFixed(1)}</div>
                <div
                  className="py-[11px] pr-3 pl-1 text-right text-[20px] leading-none"
                  style={{
                    fontFamily: "var(--font-bebas-neue)",
                    color:
                      stats.clutchRating > 0
                        ? "var(--accent)"
                        : stats.clutchRating < 0
                        ? "var(--negative)"
                        : "var(--dim)",
                  }}
                >
                  {stats.clutchRating > 0 ? "+" : ""}
                  {stats.clutchRating.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Head to Head */}
        <section>
          <SectionHeading subtitle="All-time matchup records between managers">HEAD TO HEAD</SectionHeading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0.5 bg-[var(--rule)]">
            {h2hRecords.slice(0, 35).map((record, index) => {
              const m1Winning = record.manager1_wins > record.manager2_wins;
              const m2Winning = record.manager2_wins > record.manager1_wins;
              return (
                <div key={index} className="bg-white flex items-center gap-2.5 py-[11px] px-3.5">
                  <span
                    className="flex-1 text-sm font-semibold text-right truncate"
                    style={{ color: m1Winning ? "var(--accent)" : "var(--muted-dark)" }}
                  >
                    {record.manager1}
                  </span>
                  <span
                    className="text-[20px] leading-none text-[#151515] shrink-0"
                    style={{ fontFamily: "var(--font-bebas-neue)" }}
                  >
                    {record.manager1_wins}–{record.manager2_wins}
                  </span>
                  <span
                    className="flex-1 text-sm font-semibold truncate"
                    style={{ color: m2Winning ? "var(--accent)" : "var(--muted-dark)" }}
                  >
                    {record.manager2}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Championship Points */}
        <section>
          <SectionHeading subtitle="Points scored by each season's champion">CHAMPIONSHIP POINTS</SectionHeading>
          <div className="bg-white p-5 md:p-7">
            <div className="flex flex-col gap-2.5">
              {champBars.map((c) => (
                <div key={c.season} className="flex items-center gap-3">
                  <div
                    className="text-[22px] w-11 leading-none shrink-0"
                    style={{ fontFamily: "var(--font-bebas-neue)" }}
                  >
                    {c.season}
                  </div>
                  <div className="flex-1 h-[22px] bg-[var(--background)]">
                    <div
                      className="h-[22px] bg-[var(--accent)]"
                      style={{ width: `${((c.points - champMin) / champRange) * 100}%` }}
                    />
                  </div>
                  <div
                    className="w-[52px] text-right text-[10.5px] text-[var(--body-text)]"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {c.points.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Scoring Trends + Score Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-9">
          <section>
            <SubHeading subtitle="High, average, and low by season">SCORING TRENDS</SubHeading>
            <div className="bg-white p-4 md:p-6">
              <div className="h-[230px] md:h-[290px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={scoringTrends} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="season" tick={{ fontSize: 11, fill: "#9a9a96" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#9a9a96" }} domain={[50, "auto"]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="highScore"
                      name="High Score"
                      stroke={chartColors.primary}
                      fill={`${chartColors.primary}1a`}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="avgScore"
                      name="Average"
                      stroke={chartColors.secondary}
                      fill={`${chartColors.secondary}1a`}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="lowScore"
                      name="Low Score"
                      stroke={chartColors.tertiary}
                      fill={`${chartColors.tertiary}1a`}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div
                className="flex justify-center gap-[18px] mt-3 pt-3 border-t border-[var(--hairline)] text-[9.5px] tracking-[.1em] text-[var(--muted-light)] flex-wrap"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-[3px]" style={{ background: chartColors.primary }} />
                  HIGH
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-[3px]" style={{ background: chartColors.secondary }} />
                  AVERAGE
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-[3px]" style={{ background: chartColors.tertiary }} />
                  LOW
                </span>
              </div>
            </div>
          </section>

          <section>
            <SubHeading subtitle="How often teams score in each range">SCORE DISTRIBUTION</SubHeading>
            <div className="bg-white p-4 md:p-6">
              <div className="h-[230px] md:h-[290px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreDistribution} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#9a9a96" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#9a9a96" }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload[0]) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-[var(--hairline)]">
                            <p className="font-semibold text-[#151515]">{data.range} points</p>
                            <p className="text-sm text-[var(--muted-light)]">{data.count} games</p>
                            <p className="text-sm" style={{ color: chartColors.primary }}>
                              {data.percentage.toFixed(1)}% of all games
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="count" name="Games" radius={[2, 2, 0, 0]}>
                      {scoreDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.count === Math.max(...scoreDistribution.map((d) => d.count))
                              ? chartColors.primary
                              : chartColors.secondary
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div
          className="text-center text-[10px] tracking-[.14em] text-[var(--muted-dark)]"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          DATA FROM {seasons[seasons.length - 1]}–{seasons[0]} SEASONS
        </div>
      </main>
    </div>
  );
}
