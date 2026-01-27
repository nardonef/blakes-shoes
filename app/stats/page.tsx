"use client";

import Link from "next/link";
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
  Legend,
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

// Chart Card Component
function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl p-6 md:p-8 shadow-md hover:shadow-lg transition-shadow">
      <h3
        className="text-2xl md:text-3xl font-bold mb-2"
        style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
      >
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-6">
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string | number;
  subtext?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-md text-center">
      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
        {label}
      </div>
      <div
        className="text-3xl md:text-4xl font-bold"
        style={{ fontFamily: "var(--font-display)", color: chartColors.primary }}
      >
        {value}
      </div>
      {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
    </div>
  );
}

// Custom Tooltip Component
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
    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
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
    scoringTrends.reduce((acc, s) => acc + s.avgScore * s.totalGames, 0) /
    totalGames;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <main className="max-w-6xl mx-auto px-4 md:px-16 py-8 md:py-16">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-8 transition-colors"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Home
        </Link>

        {/* Page Title */}
        <h1
          className="text-5xl md:text-7xl font-bold mb-8 text-center"
          style={{ fontFamily: "var(--font-display)" }}
        >
          LEAGUE STATS
        </h1>

        {/* Summary Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <StatCard label="Seasons" value={seasons.length} />
          <StatCard label="Total Games" value={Math.round(totalGames)} />
          <StatCard
            label="All-Time High"
            value={allTimeHighScore.toFixed(1)}
            subtext="Single game score"
          />
          <StatCard
            label="Avg PPG"
            value={avgPointsPerGame.toFixed(1)}
            subtext="Points per game"
          />
        </section>

        {/* Manager Leaderboard */}
        <section className="mb-12">
          <ChartCard
            title="MANAGER LEADERBOARD"
            subtitle="All-time stats for 2024 managers"
          >
            <div className="overflow-x-auto -mx-6 md:-mx-8 px-6 md:px-8">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase">
                      Manager
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase">
                      W
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase">
                      L
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase">
                      Win %
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase">
                      Avg PPG
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase">
                      Titles
                    </th>
                  </tr>
                </thead>
                <tbody>
                {[...managerStats]
                    .slice()
                    .sort((a, b) => b.totalWins - a.totalWins).map((manager, index) => (
                    <tr
                      key={manager.manager}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-bold w-6"
                            style={{
                              fontFamily: "var(--font-display)",
                              color: index < 3 ? chartColors.primary : chartColors.tertiary,
                            }}
                          >
                            {index + 1}
                          </span>
                          <span className="font-medium text-gray-800">
                            {manager.manager}
                          </span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 font-semibold text-gray-800">
                        {manager.totalWins}
                      </td>
                      <td className="text-center py-3 px-2 text-gray-600">
                        {manager.totalLosses}
                      </td>
                      <td className="text-center py-3 px-2">
                        <span
                          className="font-semibold"
                          style={{ color: chartColors.primary }}
                        >
                          {(manager.winPercentage * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-center py-3 px-2 text-gray-800">
                        {manager.avgPointsPerGame.toFixed(1)}
                      </td>
                      <td className="text-center py-3 px-2">
                        {manager.championships > 0 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-yellow-100 text-yellow-700 rounded-full font-bold text-sm">
                            {manager.championships}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </section>


        {/* Top and Lowest Performances */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Top Performances */}
          <ChartCard title="TOP PERFORMANCES" subtitle="Highest single-game scores">
            <div className="space-y-3">
              {topPerformances.map((perf, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 pb-3 border-b border-gray-100 last:border-0"
                >
                  <div
                    className="text-2xl font-bold w-8"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: index < 3 ? chartColors.primary : chartColors.tertiary,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 truncate">
                      {perf.team}
                    </div>
                    <div className="text-xs text-gray-500">
                      {perf.season} Week {perf.week} vs {perf.opponent}
                    </div>
                  </div>
                  <div
                    className="text-xl font-bold"
                    style={{ fontFamily: "var(--font-display)", color: chartColors.primary }}
                  >
                    {perf.score.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* Lowest Performances */}
          <ChartCard title="LOWEST PERFORMANCES" subtitle="Lowest single-game scores">
            <div className="space-y-3">
              {lowestPerformances.map((perf, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 pb-3 border-b border-gray-100 last:border-0"
                >
                  <div
                    className="text-2xl font-bold w-8"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: chartColors.tertiary,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 truncate">
                      {perf.team}
                    </div>
                    <div className="text-xs text-gray-500">
                      {perf.season} Week {perf.week} vs {perf.opponent}
                    </div>
                  </div>
                  <div
                    className="text-xl font-bold"
                    style={{ fontFamily: "var(--font-display)", color: chartColors.tertiary }}
                  >
                    {perf.score.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* Blowouts & Closest Games */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">

          {/* Closest Games */}
          <ChartCard title="NAIL BITERS" subtitle="Closest finishes">
            <div className="space-y-3">
              {closestGames.map((game, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 pb-3 border-b border-gray-100 last:border-0"
                >
                  <div
                    className="text-2xl font-bold w-8"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: index < 3 ? "#dc2626" : chartColors.tertiary,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 truncate text-sm">
                      {game.winner}
                    </div>
                    <div className="text-xs text-gray-500">
                      vs {game.winner === game.team1 ? game.team2 : game.team1}
                    </div>
                    <div className="text-xs text-gray-400">
                      {game.season} Wk {game.week}
                      {game.matchupType === "playoff" && (
                        <span className="ml-1 text-yellow-600">(non-regular season)</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-lg font-bold"
                      style={{ fontFamily: "var(--font-display)", color: "#dc2626" }}
                    >
                      +{game.margin.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {Math.max(game.team1Score, game.team2Score).toFixed(1)}-
                      {Math.min(game.team1Score, game.team2Score).toFixed(1)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* Blowouts */}
          <ChartCard title="BIGGEST BLOWOUTS" subtitle="Largest victory margins">
            <div className="space-y-3">
              {blowouts.map((game, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 pb-3 border-b border-gray-100 last:border-0"
                >
                  <div
                    className="text-2xl font-bold w-8"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: index < 3 ? chartColors.primary : chartColors.tertiary,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 truncate text-sm">
                      {game.team1Score > game.team2Score ? game.team1 : game.team2}
                    </div>
                    <div className="text-xs text-gray-500">
                      vs {game.team1Score > game.team2Score ? game.team2 : game.team1}
                    </div>
                    <div className="text-xs text-gray-400">
                      {game.season} Wk {game.week}
                      {game.matchupType === "playoff" && (
                        <span className="ml-1 text-yellow-600">(non-regular season)</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-lg font-bold"
                      style={{ fontFamily: "var(--font-display)", color: chartColors.primary }}
                    >
                      +{game.margin.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {Math.max(game.team1Score, game.team2Score).toFixed(1)}-
                      {Math.min(game.team1Score, game.team2Score).toFixed(1)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* Luck Index */}
        <section className="mb-12">
          <ChartCard
            title="LUCK INDEX"
            subtitle="Actual wins vs expected wins based on scoring"
          >
            <div style={{ height: Math.max(320, luckIndex.length * 32) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={luckIndex.map((l) => ({
                    ...l,
                    fill: l.luck >= 0 ? "#22c55e" : "#dc2626",
                  }))}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                  barSize={20}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical />
                  <XAxis
                    type="number"
                    domain={[(dataMin: number) => Math.floor(dataMin) - 1, (dataMax: number) => Math.ceil(dataMax) + 1]}
                    tick={{ fontSize: 11 }}
                    allowDecimals={false}
                    tickFormatter={(v) => (v > 0 ? `+${Math.round(v)}` : Math.round(v).toString())}
                  />
                  <YAxis
                    type="category"
                    dataKey="manager"
                    tick={{ fontSize: 11 }}
                    width={80}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload[0]) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                          <p className="font-bold text-gray-800">{data.manager}</p>
                          <p className="text-sm text-gray-600">
                            Actual Wins: {data.actualWins}
                          </p>
                          <p className="text-sm text-gray-600">
                            Expected Wins: {data.expectedWins}
                          </p>
                          <p
                            className="text-sm font-semibold"
                            style={{ color: data.luck >= 0 ? "#22c55e" : "#dc2626" }}
                          >
                            Luck: {data.luck >= 0 ? "+" : ""}
                            {data.luck.toFixed(1)} wins
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {data.gamesPlayed} games played
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="luck" radius={[0, 4, 4, 0]}>
                    {luckIndex.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.luck >= 0 ? "#22c55e" : "#dc2626"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-gray-500 mt-4 text-center">
              Positive = won more than expected based on scoring | Negative = unlucky with matchups
            </p>
          </ChartCard>
        </section>

        {/* Scoring Consistency */}
        <section className="mb-12">
          <ChartCard
            title="SCORING CONSISTENCY"
            subtitle="Standard deviation of weekly scores (lower = more consistent)"
          >
            <div style={{ height: Math.max(320, consistency.length * 32) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={consistency}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                  barSize={20}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    domain={[0, (dataMax: number) => Math.ceil(dataMax) + 2]}
                    allowDecimals={false}
                    tickFormatter={(v) => Math.round(v).toString()}
                  />
                  <YAxis
                    type="category"
                    dataKey="manager"
                    tick={{ fontSize: 11 }}
                    width={80}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload[0]) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                          <p className="font-bold text-gray-800">{data.manager}</p>
                          <p className="text-sm text-gray-600">
                            Avg Score: {data.avgScore.toFixed(1)}
                          </p>
                          <p className="text-sm" style={{ color: chartColors.primary }}>
                            Std Dev: ±{data.stdDev.toFixed(1)} pts
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {data.gamesPlayed} games played
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="stdDev" name="Std Dev" radius={[0, 4, 4, 0]}>
                    {consistency.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index < 3 ? chartColors.primary : chartColors.secondary}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-8 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ background: chartColors.primary }}
                />
                <span className="text-gray-600">Most Consistent (Top 3)</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ background: chartColors.secondary }}
                />
                <span className="text-gray-600">Boom or Bust</span>
              </div>
            </div>
          </ChartCard>
        </section>

        {/* Season Standings */}
        <section className="mb-12">
          <ChartCard title="SEASON STANDINGS">
            {/* Season Selector */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mr-3">
                Select Season:
              </label>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(Number(e.target.value))}
                className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {seasons.map((season) => (
                  <option key={season} value={season}>
                    {season}
                  </option>
                ))}
              </select>
            </div>

            {/* Standings Chart - Hidden on mobile, table is better */}
            <div className="hidden md:block h-96 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={seasonStandings.map((s) => ({
                    team: s.team_name.length > 12 ? s.team_name.substring(0, 12) + "..." : s.team_name,
                    fullTeam: s.team_name,
                    wins: s.wins,
                    losses: s.losses,
                    pointsFor: s.points_for,
                    rank: s.final_rank,
                  }))}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                  barSize={20}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickCount={5} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="team"
                    tick={{ fontSize: 11 }}
                    width={100}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload[0]) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                          <p className="font-bold text-gray-800">{data.fullTeam}</p>
                          <p className="text-sm text-gray-600">Rank: #{data.rank}</p>
                          <p className="text-sm text-green-600">Wins: {data.wins}</p>
                          <p className="text-sm text-gray-500">Losses: {data.losses}</p>
                          <p className="text-sm" style={{ color: chartColors.primary }}>
                            Points: {data.pointsFor.toFixed(1)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  <Bar dataKey="wins" name="Wins" fill="#22c55e" stackId="record" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="losses" name="Losses" fill={chartColors.tertiary} stackId="record" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Standings Table */}
            <div className="-mx-6 md:-mx-8 px-6 md:px-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-1 md:px-2 text-xs font-semibold text-gray-600 uppercase w-8">
                      #
                    </th>
                    <th className="text-left py-3 px-1 md:px-2 text-xs font-semibold text-gray-600 uppercase">
                      Team
                    </th>
                    <th className="text-center py-3 px-1 md:px-2 text-xs font-semibold text-gray-600 uppercase">
                      W-L
                    </th>
                    <th className="text-center py-3 px-1 md:px-2 text-xs font-semibold text-gray-600 uppercase hidden sm:table-cell">
                      Win %
                    </th>
                    <th className="text-right py-3 px-1 md:px-2 text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">
                      Pts
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {seasonStandings.map((team) => (
                    <tr
                      key={team.team_key}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-1 md:px-2">
                        <span
                          className="font-bold text-sm"
                          style={{
                            fontFamily: "var(--font-display)",
                            color: team.final_rank <= 3 ? chartColors.primary : chartColors.tertiary,
                          }}
                        >
                          {team.final_rank}
                        </span>
                      </td>
                      <td className="py-3 px-1 md:px-2">
                        <div className="font-medium text-gray-800 text-sm">{team.team_name}</div>
                        <div className="text-xs text-gray-500">{team.manager_name}</div>
                      </td>
                      <td className="text-center py-3 px-1 md:px-2 font-semibold text-gray-800 text-sm">
                        {team.wins}-{team.losses}
                      </td>
                      <td className="text-center py-3 px-1 md:px-2 hidden sm:table-cell">
                        <span className="text-sm" style={{ color: chartColors.primary }}>
                          {(team.win_percentage * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="text-right py-3 px-2 text-gray-800 hidden md:table-cell">
                        {team.points_for.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </section>


        {/* Playoff Performance */}
        <section className="mb-12">
          <ChartCard
            title="PLAYOFF PERFORMANCE"
            subtitle="Regular season vs playoff stats comparison"
          >
            <div className="overflow-x-auto -mx-6 md:-mx-8 px-6 md:px-8">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase">
                      Manager
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase">
                      Playoff W-L
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase">
                      Playoff PPG
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase">
                      Reg PPG
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase">
                      Clutch +/-
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {playoffStats.map((stats, index) => (
                    <tr
                      key={stats.manager}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-bold w-6"
                            style={{
                              fontFamily: "var(--font-display)",
                              color: index < 3 ? chartColors.primary : chartColors.tertiary,
                            }}
                          >
                            {index + 1}
                          </span>
                          <span className="font-medium text-gray-800">
                            {stats.manager}
                          </span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 font-semibold text-gray-800">
                        {stats.playoffWins}-{stats.playoffLosses}
                      </td>
                      <td className="text-center py-3 px-2 text-gray-800">
                        {stats.playoffPPG.toFixed(1)}
                      </td>
                      <td className="text-center py-3 px-2 text-gray-600">
                        {stats.regularPPG.toFixed(1)}
                      </td>
                      <td className="text-center py-3 px-2">
                        <span
                          className="font-semibold"
                          style={{
                            color:
                              stats.clutchRating > 0
                                ? "#22c55e"
                                : stats.clutchRating < 0
                                ? "#dc2626"
                                : chartColors.tertiary,
                          }}
                        >
                          {stats.clutchRating > 0 ? "+" : ""}
                          {stats.clutchRating.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-4 text-center">
              Clutch Rating = Playoff PPG - Regular Season PPG | Positive = performs better in playoffs
            </p>
          </ChartCard>
        </section>

        {/* Head to Head Records */}
        <section className="mb-12">
          <ChartCard
            title="HEAD TO HEAD RECORDS"
            subtitle="All-time matchup records between managers"
          >
            <div className="overflow-x-auto -mx-6 md:-mx-8 px-6 md:px-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase">
                      Matchup
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase">
                      Record
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {h2hRecords.slice(0, 35).map((record, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-2">
                        <span className="font-medium text-gray-800">
                          {record.manager1}
                        </span>
                        <span className="text-gray-400 mx-2">vs</span>
                        <span className="font-medium text-gray-800">
                          {record.manager2}
                        </span>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span
                          className="font-semibold"
                          style={{
                            color:
                              record.manager1_wins > record.manager2_wins
                                ? "#22c55e"
                                : record.manager1_wins < record.manager2_wins
                                ? chartColors.primary
                                : chartColors.tertiary,
                          }}
                        >
                          {record.manager1_wins}
                        </span>
                        <span className="text-gray-400 mx-1">-</span>
                        <span
                          className="font-semibold"
                          style={{
                            color:
                              record.manager2_wins > record.manager1_wins
                                ? "#22c55e"
                                : record.manager2_wins < record.manager1_wins
                                ? chartColors.primary
                                : chartColors.tertiary,
                          }}
                        >
                          {record.manager2_wins}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </section>


        {/* Champions Chart */}
        <section className="mb-12">
          <ChartCard
            title="CHAMPIONSHIP POINTS"
            subtitle="Points scored by each season's champion"
          >
            <div style={{ height: Math.max(300, championsData.length * 40) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={championsData}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 50, bottom: 10 }}
                  barSize={24}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={false} />
                  <XAxis
                    type="number"
                    domain={["dataMin - 100", "dataMax + 50"]}
                    tick={{ fontSize: 11 }}
                    tickCount={4}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="season"
                    tick={{ fontSize: 13, fontWeight: 600 }}
                    tickFormatter={(value) => `${value}`}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload[0]) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                          <p className="font-bold text-gray-800">{data.season} Champion</p>
                          <p className="text-sm text-gray-600">{data.team}</p>
                          <p className="text-sm text-gray-600">Manager: {data.manager}</p>
                          <p className="text-sm font-semibold" style={{ color: chartColors.primary }}>
                            {data.points.toFixed(1)} pts ({data.record})
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="points" radius={[0, 6, 6, 0]}>
                    {championsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors.primary} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </section>


        {/* Scoring Trends */}
        <section className="mb-12">
          <ChartCard
            title="SCORING TRENDS"
            subtitle="Average, high, and low scores by season"
          >
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={scoringTrends}
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="season" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[50, "auto"]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="highScore"
                    name="High Score"
                    stroke={chartColors.primary}
                    fill={`${chartColors.primary}20`}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="avgScore"
                    name="Average"
                    stroke={chartColors.secondary}
                    fill={`${chartColors.secondary}20`}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="lowScore"
                    name="Low Score"
                    stroke={chartColors.tertiary}
                    fill={`${chartColors.tertiary}20`}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </section>

        {/* Score Distribution */}
        <section className="mb-12">
          <ChartCard
            title="SCORE DISTRIBUTION"
            subtitle="How often teams score in each range"
          >
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={scoreDistribution}
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload[0]) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                          <p className="font-bold text-gray-800">{data.range} points</p>
                          <p className="text-sm text-gray-600">{data.count} games</p>
                          <p className="text-sm" style={{ color: chartColors.primary }}>
                            {data.percentage.toFixed(1)}% of all games
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" name="Games" radius={[4, 4, 0, 0]}>
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
          </ChartCard>
        </section>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>Data from {seasons[seasons.length - 1]} - {seasons[0]} seasons</p>
        </div>
      </main>
    </div>
  );
}
