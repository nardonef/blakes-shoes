import Image from "next/image";
import { getManagerLegacies, type ManagerLegacy } from "@/lib/legacy-data";
import { chartColors } from "@/lib/stats-data";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

// Rank `value` among `values` — rank 1 is "best" per `higherIsBetter`.
function rankOf(values: number[], value: number, higherIsBetter: boolean): number {
  const sorted = [...values].sort((a, b) => (higherIsBetter ? b - a : a - b));
  return sorted.indexOf(value) + 1;
}

function buildScoutingReport(legacy: ManagerLegacy, all: ManagerLegacy[]) {
  const n = all.length;
  const winPctRank = rankOf(all.map((l) => l.winPct), legacy.winPct, true);
  const ppgRank = rankOf(all.map((l) => l.avgPointsPerGame), legacy.avgPointsPerGame, true);
  const champRank = rankOf(all.map((l) => l.championships), legacy.championships, true);
  const consistencyRankLowIsBest = rankOf(all.map((l) => l.consistency), legacy.consistency, false);
  const clutchRank = rankOf(all.map((l) => l.clutchRating), legacy.clutchRating, true);

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (winPctRank <= 3) {
    strengths.push(
      `Wins at a top-tier clip: ${(legacy.winPct * 100).toFixed(1)}% all-time (${winPctRank === 1 ? "best" : ordinal(winPctRank)} among current owners).`
    );
  } else if (winPctRank >= n - 2) {
    weaknesses.push(
      `All-time win rate of ${(legacy.winPct * 100).toFixed(1)}% ranks ${ordinal(winPctRank)} of ${n} among current owners.`
    );
  }

  if (ppgRank <= 3) {
    strengths.push(
      `Consistently high scorer: ${legacy.avgPointsPerGame.toFixed(1)} points per game for his career (${ppgRank === 1 ? "highest" : ordinal(ppgRank)} of ${n}).`
    );
  } else if (ppgRank >= n - 2) {
    weaknesses.push(
      `Career scoring average of ${legacy.avgPointsPerGame.toFixed(1)} PPG is ${ordinal(ppgRank)} of ${n} among current owners.`
    );
  }

  if (legacy.championships > 0 && champRank <= 3) {
    strengths.push(
      `${legacy.championships}-time champion (${legacy.championshipYears.join(", ")}) — knows how to close a season out.`
    );
  }

  if (consistencyRankLowIsBest <= 3) {
    strengths.push(
      `Steady week to week — a ${legacy.consistency.toFixed(1)}-point scoring standard deviation, among the lowest (least volatile) in the league.`
    );
  } else if (consistencyRankLowIsBest >= n - 2) {
    weaknesses.push(
      `Boom-or-bust scorer — a ${legacy.consistency.toFixed(1)}-point standard deviation makes him one of the least predictable teams week to week.`
    );
  }

  if (legacy.playoffGames >= 3) {
    if (legacy.clutchRating > 3 && clutchRank <= 3) {
      strengths.push(
        `Elevates his game in the playoffs: ${legacy.playoffPPG.toFixed(1)} PPG in the postseason vs. ${legacy.regularPPG.toFixed(1)} in the regular season (+${legacy.clutchRating.toFixed(1)}).`
      );
    } else if (legacy.clutchRating < -3) {
      weaknesses.push(
        `Fades under playoff pressure: ${legacy.playoffPPG.toFixed(1)} PPG in the postseason, down from ${legacy.regularPPG.toFixed(1)} in the regular season (${legacy.clutchRating.toFixed(1)}).`
      );
    }
  }

  if (legacy.championships === 0 && legacy.playoffGames >= 5) {
    weaknesses.push(
      `${legacy.playoffGames} career playoff games and no title to show for it${legacy.runnerUps > 0 ? ` — ${legacy.runnerUps === 1 ? "including a runner-up finish" : `including ${legacy.runnerUps} runner-up finishes`}` : ""}.`
    );
  }
  if (legacy.runnerUps >= 2) {
    weaknesses.push(
      `A ${legacy.runnerUps}-time runner-up (${legacy.runnerUpYears.map((r) => r.year).join(", ")}) — gets to the final, hasn't sealed it enough.`
    );
  }

  if (strengths.length === 0) {
    strengths.push(
      `A ${legacy.wins}-${legacy.losses}${legacy.ties ? `-${legacy.ties}` : ""} all-time record across ${legacy.seasonsPlayed} seasons.`
    );
  }
  if (weaknesses.length === 0) {
    weaknesses.push(
      `No glaring statistical weakness — a middle-of-the-pack profile across scoring, wins, and consistency.`
    );
  }

  return { strengths: strengths.slice(0, 3), weaknesses: weaknesses.slice(0, 3) };
}

function luckBlurb(legacy: ManagerLegacy): string {
  const l = legacy.luck;
  if (Math.abs(l) < 1) {
    return `Right about where he should be: ${legacy.regularWins} regular-season wins against ${legacy.expectedWins.toFixed(1)} expected from his scoring — no real luck story either way.`;
  }
  if (l >= 1) {
    return `Has caught breaks: ${legacy.regularWins} regular-season wins vs. ${legacy.expectedWins.toFixed(1)} expected from his scoring output — about ${l.toFixed(1)} wins better than his points alone would predict.`;
  }
  return `Snakebitten: only ${legacy.regularWins} regular-season wins despite scoring that projects to ${legacy.expectedWins.toFixed(1)} — about ${Math.abs(l).toFixed(1)} wins worse than deserved.`;
}

function bestMomentBlurb(legacy: ManagerLegacy): string {
  const parts: string[] = [];
  if (legacy.championships > 0) {
    parts.push(
      `${legacy.championships > 1 ? "Multiple titles" : "League champion"} (${legacy.championshipYears.join(", ")}).`
    );
  } else if (legacy.bestSeason) {
    parts.push(
      `Best finish: ${ordinal(legacy.bestSeason.finalRank)} place in ${legacy.bestSeason.year} (${legacy.bestSeason.wins}-${legacy.bestSeason.losses}).`
    );
  }
  if (legacy.bestGame) {
    parts.push(
      `Career-high ${legacy.bestGame.score.toFixed(1)} points in Week ${legacy.bestGame.week}, ${legacy.bestGame.season} vs. ${legacy.bestGame.opponent}.`
    );
  }
  if (legacy.biggestWin) {
    parts.push(
      `Biggest blowout win: ${legacy.biggestWin.margin.toFixed(1)}-point margin over ${legacy.biggestWin.opponent} (${legacy.biggestWin.season}, Week ${legacy.biggestWin.week}).`
    );
  }
  return parts.join(" ");
}

function worstMomentBlurb(legacy: ManagerLegacy): string {
  const parts: string[] = [];
  if (legacy.runnerUps > 0) {
    const r = legacy.runnerUpYears[legacy.runnerUpYears.length - 1];
    parts.push(
      `Lost the title game in ${r.year} to ${r.lostTo}${legacy.runnerUps > 1 ? ` (also finished runner-up in ${legacy.runnerUpYears.filter((y) => y.year !== r.year).map((y) => y.year).join(", ")})` : ""}.`
    );
  } else if (legacy.worstSeason) {
    parts.push(
      `Worst finish: ${ordinal(legacy.worstSeason.finalRank)} place in ${legacy.worstSeason.year} (${legacy.worstSeason.wins}-${legacy.worstSeason.losses}).`
    );
  }
  if (legacy.worstGame) {
    parts.push(
      `Career-low ${legacy.worstGame.score.toFixed(1)} points in Week ${legacy.worstGame.week}, ${legacy.worstGame.season} vs. ${legacy.worstGame.opponent}.`
    );
  }
  if (legacy.biggestLoss) {
    parts.push(
      `Worst blowout loss: fell by ${Math.abs(legacy.biggestLoss.margin).toFixed(1)} to ${legacy.biggestLoss.opponent} (${legacy.biggestLoss.season}, Week ${legacy.biggestLoss.week}).`
    );
  }
  return parts.join(" ");
}

export default function LegacyPage() {
  const legacies = getManagerLegacies().sort((a, b) => b.winPct - a.winPct);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <main className="max-w-6xl mx-auto px-4 md:px-16 py-8 md:py-16">
        {/* Page Title */}
        <h1
          className="text-5xl md:text-7xl font-bold mb-3 text-center"
          style={{ fontFamily: "var(--font-display)" }}
        >
          LEAGUE LEGACY
        </h1>
        <p className="text-sm text-gray-500 text-center mb-12 max-w-2xl mx-auto">
          A scouting report on every manager currently in Blake&apos;s Shoes, built from every
          game the league has played since 2012.
        </p>

        <div className="space-y-8">
          {legacies.map((legacy) => {
            const { strengths, weaknesses } = buildScoutingReport(legacy, legacies);
            return (
              <section
                key={legacy.owner.name}
                className="bg-white rounded-xl p-6 md:p-8 shadow-md"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gray-300 overflow-hidden relative shadow-sm flex-shrink-0">
                    <Image
                      src={legacy.owner.image}
                      alt={legacy.owner.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2
                      className="text-2xl md:text-3xl font-bold"
                      style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
                    >
                      {legacy.owner.name}
                    </h2>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                      {legacy.owner.team} · {legacy.firstSeason}–{legacy.lastSeason}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
                      <span>
                        <span className="font-semibold">{legacy.wins}-{legacy.losses}
                          {legacy.ties ? `-${legacy.ties}` : ""}</span> ({(legacy.winPct * 100).toFixed(1)}%)
                      </span>
                      <span>
                        <span className="font-semibold">{legacy.avgPointsPerGame.toFixed(1)}</span> PPG
                      </span>
                      {legacy.championships > 0 && (
                        <span className="inline-flex items-center gap-1 font-semibold" style={{ color: chartColors.primary }}>
                          🏆 {legacy.championships}× Champion
                        </span>
                      )}
                      {legacy.runnerUps > 0 && (
                        <span className="text-gray-500">{legacy.runnerUps}× Runner-up</span>
                      )}
                      {legacy.thirds > 0 && (
                        <span className="text-gray-500">{legacy.thirds}× 3rd Place</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Does Well
                    </h3>
                    <ul className="space-y-1.5 mb-4">
                      {strengths.map((s, i) => (
                        <li key={i} className="text-sm text-gray-700 flex gap-2">
                          <span style={{ color: chartColors.primary }}>+</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>

                    <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Doesn&apos;t Do Well
                    </h3>
                    <ul className="space-y-1.5">
                      {weaknesses.map((w, i) => (
                        <li key={i} className="text-sm text-gray-700 flex gap-2">
                          <span className="text-gray-400">−</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Luck
                    </h3>
                    <p className="text-sm text-gray-700 mb-4">{luckBlurb(legacy)}</p>

                    <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Best Moment
                    </h3>
                    <p className="text-sm text-gray-700 mb-4">{bestMomentBlurb(legacy)}</p>

                    <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Worst Moment
                    </h3>
                    <p className="text-sm text-gray-700">{worstMomentBlurb(legacy)}</p>
                  </div>
                </div>

                {/* Rivalries — only called out when genuinely lopsided */}
                {((legacy.bestRival && legacy.bestRival.winPct >= 0.55) ||
                  (legacy.worstRival && legacy.worstRival.winPct <= 0.45)) && (
                  <div className="mt-6 pt-6 border-t border-gray-100 flex flex-wrap gap-6 text-sm">
                    {legacy.bestRival && legacy.bestRival.winPct >= 0.55 && (
                      <div>
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide mr-2">
                          Owns
                        </span>
                        <span className="text-gray-700">
                          {legacy.bestRival.opponentName} ({legacy.bestRival.wins}-{legacy.bestRival.losses}
                          {legacy.bestRival.ties ? `-${legacy.bestRival.ties}` : ""})
                        </span>
                      </div>
                    )}
                    {legacy.worstRival &&
                      legacy.worstRival.winPct <= 0.45 &&
                      legacy.worstRival.opponentName !== legacy.bestRival?.opponentName && (
                        <div>
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide mr-2">
                            Struggles vs.
                          </span>
                          <span className="text-gray-700">
                            {legacy.worstRival.opponentName} ({legacy.worstRival.wins}-{legacy.worstRival.losses}
                            {legacy.worstRival.ties ? `-${legacy.worstRival.ties}` : ""})
                          </span>
                        </div>
                      )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
