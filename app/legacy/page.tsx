import Image from "next/image";
import {
  getManagerLegacies,
  getBanners,
  getHeadToHeadMatrix,
  getLeagueTopLineStats,
  slug,
  type ManagerLegacy,
} from "@/lib/legacy-data";

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

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function BannerStat({
  label,
  name,
  detail,
  highlight,
}: {
  label: string;
  name: string;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div
        className="text-[9px] tracking-[.14em] text-[var(--muted-dark)] mb-1"
        style={{ fontFamily: "var(--font-geist-mono)" }}
      >
        {label}
      </div>
      <div
        className={`text-sm font-semibold truncate ${highlight ? "text-[var(--accent)]" : "text-[#151515]"}`}
      >
        {name}
      </div>
      <div className="text-[11px] text-[var(--muted-light)] truncate">{detail}</div>
    </div>
  );
}

export default function LegacyPage() {
  const legacies = getManagerLegacies().sort((a, b) => b.winPct - a.winPct);
  const topLine = getLeagueTopLineStats();
  const banners = getBanners();
  const { owners: h2hOwners, matrix: h2hMatrix } = getHeadToHeadMatrix();

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header className="bg-[#151515] text-[#f5f5f0] px-4 md:px-10 py-8 md:py-[52px]">
        <div className="max-w-[1160px] mx-auto">
          <div
            className="text-[11px] font-semibold tracking-[.26em] text-[var(--accent-light)] mb-2.5"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            SCOUTING REPORTS
          </div>
          <h1
            className="text-[48px] md:text-[88px] leading-[.86] mb-4"
            style={{ fontFamily: "var(--font-bebas-neue)" }}
          >
            LEAGUE LEGACY
          </h1>
          <p className="text-base text-[#b0b0aa] leading-[1.6] max-w-[62ch]">
            Every manager currently in Blake&apos;s Shoes, graded on every game the league has
            played since 2012. Ranked by all-time win percentage.
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-4 mt-6 pt-6 border-t border-[#2a2a28]">
            {[
              { label: "SEASONS RUN", value: String(topLine.seasonsRun) },
              { label: "DIFFERENT CHAMPIONS", value: String(topLine.differentChampions) },
              {
                label: "TITLES BY TOP SCORER",
                value: `${topLine.titlesByTopScorer} of ${topLine.totalChampionships}`,
              },
            ].map((stat) => (
              <div key={stat.label}>
                <div
                  className="text-[26px] md:text-[34px] leading-none text-[var(--accent-light)]"
                  style={{ fontFamily: "var(--font-bebas-neue)" }}
                >
                  {stat.value}
                </div>
                <div
                  className="text-[9px] tracking-[.14em] text-[#b0b0aa] mt-1"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-[1160px] mx-auto px-4 md:px-10 py-7 md:py-11 pb-14 md:pb-[88px] flex flex-col gap-0.5 bg-[var(--rule)]">
        {/* Banners */}
        <section className="bg-white p-[18px] md:p-8">
          <div className="mb-5">
            <div className="flex items-center gap-4 flex-wrap">
              <h2
                className="text-[26px] md:text-[38px] leading-none text-[#151515]"
                style={{ fontFamily: "var(--font-bebas-neue)" }}
              >
                BANNERS
              </h2>
              <span className="flex-1 min-w-[20px] h-0.5 bg-[#151515]" />
            </div>
            <p className="text-sm text-[var(--body-text)] leading-[1.55] max-w-[68ch] mt-2">
              Every champion, runner-up, third-place finish and regular-season points leader
              since 2012.
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            {banners.map((b) => (
              <div key={b.year} className="border border-[var(--hairline)] p-3.5 md:p-4">
                <div className="flex items-baseline gap-3 flex-wrap mb-3">
                  <div
                    className="text-[22px] leading-none text-[var(--accent)]"
                    style={{ fontFamily: "var(--font-bebas-neue)" }}
                  >
                    {b.year}
                  </div>
                  {b.numTeams && (
                    <div
                      className="text-[10px] tracking-[.1em] text-[var(--muted-dark)]"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      {b.numTeams} TM
                      {b.numPlayoffTeams ? ` · ${b.numPlayoffTeams} MAKE PLAYOFFS` : ""}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                  <BannerStat
                    label="CHAMPION"
                    name={b.champion.name}
                    detail={`${b.champion.team} (${b.champion.wins}-${b.champion.losses})`}
                    highlight
                  />
                  <BannerStat label="RUNNER-UP" name={b.runnerUp.name} detail={b.runnerUp.team} />
                  <BannerStat label="THIRD" name={b.thirdPlace.name} detail={b.thirdPlace.team} />
                  {b.topScorer && (
                    <BannerStat
                      label="TOP SCORER"
                      name={b.topScorer.name}
                      detail={`${b.topScorer.points.toFixed(1)} pts`}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Head to head */}
        <section className="bg-white p-[18px] md:p-8">
          <div className="mb-5">
            <div className="flex items-center gap-4 flex-wrap">
              <h2
                className="text-[26px] md:text-[38px] leading-none text-[#151515]"
                style={{ fontFamily: "var(--font-bebas-neue)" }}
              >
                HEAD TO HEAD
              </h2>
              <span className="flex-1 min-w-[20px] h-0.5 bg-[#151515]" />
            </div>
            <p className="text-sm text-[var(--body-text)] leading-[1.55] max-w-[68ch] mt-2">
              All-time record among current owners, regular season and playoffs combined. Read
              across: the row manager&apos;s wins&ndash;losses against the column manager. Scroll
              to see the full grid.
            </p>
          </div>
          <div className="flex">
            {/* Fixed name column — not part of the horizontally-scrolling table,
                so nothing can render behind it or peek out from underneath. */}
            <table
              className="border-separate border-spacing-0 text-[11px] whitespace-nowrap shrink-0"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              <thead>
                <tr>
                  <th className="p-2 text-left" />
                </tr>
              </thead>
              <tbody>
                {h2hOwners.map((rowOwner) => (
                  <tr key={rowOwner.name}>
                    <th className="p-2 pr-3 text-left font-semibold text-[#151515] border-t border-[var(--hairline)]">
                      {rowOwner.name}
                    </th>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="overflow-x-auto">
              <table
                className="border-separate border-spacing-0 text-[11px] whitespace-nowrap"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                <thead>
                  <tr>
                    {h2hOwners.map((o) => (
                      <th
                        key={o.name}
                        className="p-2 text-center font-semibold text-[var(--muted-dark)]"
                        title={o.name}
                      >
                        {initials(o.name)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {h2hOwners.map((rowOwner, i) => (
                    <tr key={rowOwner.name}>
                      {h2hOwners.map((colOwner, j) => {
                        const cell = h2hMatrix[i][j];
                        if (i === j || !cell || cell.games === 0) {
                          return (
                            <td
                              key={colOwner.name}
                              className="p-2 text-center text-[var(--dim)] border-t border-[var(--hairline)]"
                            >
                              {i === j ? "–" : "0-0"}
                            </td>
                          );
                        }
                        const winning = cell.wins > cell.losses;
                        const losing = cell.losses > cell.wins;
                        return (
                          <td
                            key={colOwner.name}
                            className="p-2 text-center border-t border-[var(--hairline)]"
                            style={{
                              color: winning
                                ? "var(--accent)"
                                : losing
                                  ? "var(--muted-dark)"
                                  : "var(--body-text)",
                            }}
                          >
                            {cell.wins}-{cell.losses}
                            {cell.ties ? `-${cell.ties}` : ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {legacies.map((legacy, index) => {
          const { strengths, weaknesses } = buildScoutingReport(legacy, legacies);
          const finishLabel =
            legacy.runnerUps > 0 || legacy.thirds > 0
              ? [
                  legacy.runnerUps > 0 ? `${legacy.runnerUps}× RUNNER-UP` : null,
                  legacy.thirds > 0 ? `${legacy.thirds}× THIRD` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : null;
          const showOwns = Boolean(legacy.bestRival && legacy.bestRival.winPct >= 0.55);
          const showStruggles = Boolean(
            legacy.worstRival &&
              legacy.worstRival.winPct <= 0.45 &&
              legacy.worstRival.opponentName !== legacy.bestRival?.opponentName
          );

          return (
            <section
              key={legacy.owner.name}
              id={slug(legacy.owner.name)}
              className="bg-white scroll-mt-[70px]"
            >
              {/* Card header */}
              <div className="flex flex-wrap items-center gap-3.5 md:gap-5 p-[18px] md:p-6 bg-[#151515] text-[#f5f5f0]">
                <div
                  className="text-[26px] md:text-[34px] leading-none text-[var(--accent-light)] w-[42px] shrink-0"
                  style={{ fontFamily: "var(--font-bebas-neue)" }}
                >
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="w-[60px] h-[60px] md:w-[76px] md:h-[76px] rounded-full overflow-hidden bg-[#3a3a38] shrink-0 relative">
                  <Image
                    src={legacy.owner.image}
                    alt={legacy.owner.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 basis-[200px] min-w-0">
                  <h2
                    className="text-[26px] md:text-[34px] leading-[1.02]"
                    style={{ fontFamily: "var(--font-bebas-neue)" }}
                  >
                    {legacy.owner.name}
                  </h2>
                  <div
                    className="text-[10px] tracking-[.14em] text-[var(--muted-dark)]"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {legacy.owner.team.toUpperCase()} · {legacy.firstSeason}–{legacy.lastSeason}
                  </div>
                </div>
                <div className="flex gap-3.5 md:gap-[26px] flex-wrap items-end">
                  <div>
                    <div
                      className="text-[9px] tracking-[.14em] text-[var(--muted-dark)]"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      ALL-TIME
                    </div>
                    <div className="text-[22px] md:text-[28px] leading-none" style={{ fontFamily: "var(--font-bebas-neue)" }}>
                      {legacy.wins}-{legacy.losses}
                      {legacy.ties ? `-${legacy.ties}` : ""}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-[9px] tracking-[.14em] text-[var(--muted-dark)]"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      WIN %
                    </div>
                    <div
                      className="text-[22px] md:text-[28px] leading-none text-[var(--accent-light)]"
                      style={{ fontFamily: "var(--font-bebas-neue)" }}
                    >
                      {(legacy.winPct * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-[9px] tracking-[.14em] text-[var(--muted-dark)]"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      PPG
                    </div>
                    <div className="text-[22px] md:text-[28px] leading-none" style={{ fontFamily: "var(--font-bebas-neue)" }}>
                      {legacy.avgPointsPerGame.toFixed(1)}
                    </div>
                  </div>
                  {legacy.championships > 0 && (
                    <div className="bg-[var(--accent)] px-2.5 py-1.5">
                      <div
                        className="text-[9px] tracking-[.14em] text-[var(--accent-pale)]"
                        style={{ fontFamily: "var(--font-geist-mono)" }}
                      >
                        TITLES
                      </div>
                      <div className="text-[20px] md:text-[26px] leading-none" style={{ fontFamily: "var(--font-bebas-neue)" }}>
                        ×{legacy.championships}
                      </div>
                    </div>
                  )}
                  {finishLabel && (
                    <div
                      className="text-[10px] tracking-[.1em] text-[#b0b0aa] pb-[3px]"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      {finishLabel}
                    </div>
                  )}
                </div>
              </div>

              {/* Card body */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-9 p-[22px] md:p-8">
                <div>
                  <div
                    className="text-[10px] font-semibold tracking-[.2em] text-[var(--accent)] border-b-2 border-[var(--accent)] pb-2 mb-3.5"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    DOES WELL
                  </div>
                  <div className="flex flex-col gap-2.5 mb-[22px]">
                    {strengths.map((s, i) => (
                      <div key={i} className="flex gap-2.5 text-sm text-[var(--body-text)] leading-[1.5]">
                        <span className="text-[var(--accent)] font-bold">+</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>

                  <div
                    className="text-[10px] font-semibold tracking-[.2em] text-[var(--muted-dark)] border-b-2 border-[var(--rule)] pb-2 mb-3.5"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    DOESN&apos;T DO WELL
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {weaknesses.map((w, i) => (
                      <div key={i} className="flex gap-2.5 text-sm text-[var(--body-text)] leading-[1.5]">
                        <span className="text-[var(--muted-dark)] font-bold">−</span>
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-[18px]">
                  <div>
                    <div
                      className="text-[9.5px] font-semibold tracking-[.18em] text-[var(--muted-dark)] mb-1.5"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      LUCK
                    </div>
                    <p className="text-sm text-[var(--body-text)] leading-[1.55]">{luckBlurb(legacy)}</p>
                  </div>
                  <div>
                    <div
                      className="text-[9.5px] font-semibold tracking-[.18em] text-[var(--muted-dark)] mb-1.5"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      BEST MOMENT
                    </div>
                    <p className="text-sm text-[var(--body-text)] leading-[1.55]">{bestMomentBlurb(legacy)}</p>
                  </div>
                  <div>
                    <div
                      className="text-[9.5px] font-semibold tracking-[.18em] text-[var(--muted-dark)] mb-1.5"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      WORST MOMENT
                    </div>
                    <p className="text-sm text-[var(--body-text)] leading-[1.55]">{worstMomentBlurb(legacy)}</p>
                  </div>
                </div>
              </div>

              {/* Rivalries — only called out when genuinely lopsided */}
              {(showOwns || showStruggles) && (
                <div className="flex flex-wrap gap-0.5 bg-[var(--rule)] border-t border-[var(--rule)]">
                  {showOwns && (
                    <div className="flex-1 basis-60 bg-[var(--background)] py-3.5 px-5 md:px-8">
                      <span
                        className="text-[9.5px] font-semibold tracking-[.18em] text-[var(--accent)] mr-2.5"
                        style={{ fontFamily: "var(--font-geist-mono)" }}
                      >
                        OWNS
                      </span>
                      <span className="text-sm font-semibold text-[#151515]">
                        {legacy.bestRival!.opponentName} ({legacy.bestRival!.wins}-{legacy.bestRival!.losses}
                        {legacy.bestRival!.ties ? `-${legacy.bestRival!.ties}` : ""})
                      </span>
                    </div>
                  )}
                  {showStruggles && (
                    <div className="flex-1 basis-60 bg-[var(--background)] py-3.5 px-5 md:px-8">
                      <span
                        className="text-[9.5px] font-semibold tracking-[.18em] text-[var(--muted-dark)] mr-2.5"
                        style={{ fontFamily: "var(--font-geist-mono)" }}
                      >
                        STRUGGLES VS
                      </span>
                      <span className="text-sm font-semibold text-[#151515]">
                        {legacy.worstRival!.opponentName} ({legacy.worstRival!.wins}-{legacy.worstRival!.losses}
                        {legacy.worstRival!.ties ? `-${legacy.worstRival!.ties}` : ""})
                      </span>
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </main>
    </div>
  );
}
