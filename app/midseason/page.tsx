import Link from "next/link";
import { notFound } from "next/navigation";
import CountUp from "@/components/CountUp";
import { getMidseason, type GameNote, type TeamRow } from "@/lib/midseason-data";
import { gradeColor } from "@/lib/draft-board-view";
import { playerHref } from "@/lib/player-slug";
import { tradeHref } from "@/lib/trade-href";

export const metadata = {
  title: "Midseason Report | Blake's Shoes",
  description: "The halfway point of the season: storylines, standings, luck, lineups, the waiver wire, trades and the draft.",
};

const MONO = { fontFamily: "var(--font-geist-mono)" };
const BEBAS = { fontFamily: "var(--font-bebas-neue)" };
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const rec = (t: { wins: number; losses: number; ties: number }) => `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ""}`;
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}`;

function Heading({ children, kicker, note }: { children: React.ReactNode; kicker: string; note?: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-[10.5px] font-semibold tracking-[.18em] text-[var(--accent)] mb-1" style={MONO}>
        {kicker}
      </div>
      <div className="flex items-center gap-4">
        <h2 className="text-[30px] md:text-[42px] leading-none text-[#151515]" style={BEBAS}>
          {children}
        </h2>
        <span className="flex-1 min-w-[20px] h-0.5 bg-[#151515]" />
      </div>
      {note && <p className="text-sm text-[var(--body-text)] leading-[1.55] max-w-[68ch] mt-2">{note}</p>}
    </div>
  );
}

function GameCard({ label, g, value, tone }: { label: string; g: GameNote; value: string; tone?: "good" | "bad" }) {
  return (
    <div data-reveal="" className="bg-white p-4 md:p-5 flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold tracking-[.12em] text-[var(--muted-light)]" style={MONO}>
        {label}
      </span>
      <span
        className="text-[40px] leading-none"
        style={{ ...BEBAS, color: tone === "bad" ? "var(--negative)" : tone === "good" ? "var(--accent)" : "#151515" }}
      >
        <CountUp text={value} />
      </span>
      <span className="text-[15px] font-semibold text-[#151515]">{g.manager}</span>
      <span className="text-[12.5px] text-[var(--body-text)]">
        Week {g.week}: {g.points.toFixed(2)}–{g.opponentPoints.toFixed(2)} vs {g.opponent}
      </span>
    </div>
  );
}

export default function MidseasonPage() {
  const m = getMidseason();
  if (!m) notFound();
  const teams = m.teams;
  const lineups = [...teams].sort((a, b) => b.efficiency - a.efficiency);
  const faab = [...teams].sort((a, b) => b.faabLeft - a.faabLeft);
  const standingOf = new Map(teams.map((t) => [t.manager, t]));
  const cols = "grid-cols-[22px_minmax(0,1fr)_40px_52px] md:grid-cols-[36px_minmax(0,1fr)_64px_80px_80px_92px_70px_60px_120px]";

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header className="bg-[#151515] text-[#f5f5f0] px-4 md:px-10 py-8 md:py-[52px]">
        <div className="max-w-[1160px] mx-auto">
          <div className="text-[11px] font-semibold tracking-[.26em] text-[var(--accent-light)] mb-2.5" style={MONO}>
            PODCAST SPECIAL · {m.season} · THROUGH WEEK {m.week} OF {m.regularWeeks}
          </div>
          <h1 className="text-[52px] md:text-[96px] leading-[.86] mb-4" style={BEBAS}>
            MIDSEASON REPORT
          </h1>
          <p className="text-base text-[#b0b0aa] leading-[1.6] max-w-[62ch]">
            Halfway home. The storylines, who&apos;s for real, who&apos;s lucky, who keeps benching the wrong guys, and what
            history says happens next.
          </p>
        </div>
      </header>

      <main className="max-w-[1160px] mx-auto px-4 md:px-10 py-8 md:py-12 pb-16 md:pb-24 flex flex-col gap-12 md:gap-16">
        {/* Storylines */}
        <section>
          <Heading kicker="FOR THE PODCAST" note="Talking points, straight from the numbers below.">
            THE STORYLINES
          </Heading>
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {m.storylines.map((s, i) => (
              <li key={i} data-reveal="" style={{ "--i": i % 4 } as React.CSSProperties} className="bg-white p-4 md:p-5 flex gap-4">
                <span className="text-[34px] leading-none text-[var(--accent)] w-8 shrink-0" style={BEBAS}>
                  {i + 1}
                </span>
                <span className="text-[14.5px] leading-[1.5] text-[#151515]">{s}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Standings */}
        <section>
          <Heading
            kicker={`TOP ${m.playoffTeams} MAKE THE PLAYOFFS`}
            note={
              <>
                <strong>All-play</strong> is the record against every team every week; <strong>luck</strong> is real wins
                minus what all-play predicts. <strong>History</strong>: since 2012, how many teams with the same record after{" "}
                {m.week} games made the playoffs.
              </>
            }
          >
            THE STANDINGS
          </Heading>
          <div
            className={`grid ${cols} bg-[#151515] text-[#f5f5f0] text-[8px] md:text-[9.5px] font-semibold tracking-[.06em] md:tracking-[.1em]`}
            style={MONO}
          >
            <div className="py-[11px] pl-1.5 md:pl-3">#</div>
            <div className="py-[11px] px-1 md:px-2">TEAM</div>
            <div className="py-[11px] px-0.5 md:px-1 text-right">W-L</div>
            <div className="hidden md:block py-[11px] px-1 text-right">PF</div>
            <div className="hidden md:block py-[11px] px-1 text-right">PA</div>
            <div className="hidden md:block py-[11px] px-1 text-right">ALL-PLAY</div>
            <div className="hidden md:block py-[11px] px-1 text-right">LUCK</div>
            <div className="hidden md:block py-[11px] px-1 text-right">STREAK</div>
            <div className="py-[11px] pr-1.5 pl-0.5 md:pr-3 md:pl-1 text-right">HISTORY</div>
          </div>
          <div className="bg-white">
            {teams.map((t) => (
              <div
                key={t.manager}
                className={`grid ${cols} items-center text-[11px] md:text-[13.5px] border-b ${
                  t.rank === m.playoffTeams ? "border-b-2 border-[var(--accent)]" : "border-[var(--hairline)]"
                }`}
              >
                <div className="py-[11px] pl-1.5 md:pl-3 text-[15px] md:text-[20px] leading-none" style={{ ...BEBAS, color: t.rank <= m.playoffTeams ? "var(--accent)" : "var(--dim)" }}>
                  {t.rank}
                </div>
                <div className="py-[11px] px-1 md:px-2 min-w-0">
                  <div className="font-semibold text-[#151515] truncate">{t.manager}</div>
                  <div className="text-[9.5px] md:text-[10px] tracking-[.06em] text-[var(--muted-light)] truncate" style={MONO}>
                    {t.team.toUpperCase()}
                    <span className="md:hidden">
                      {" "}
                      · {Math.round(t.pointsFor)} PF · {t.streak}
                    </span>
                  </div>
                </div>
                <div className="py-[11px] px-0.5 md:px-1 text-right font-semibold text-[#151515] tabular-nums">{rec(t)}</div>
                <div className="hidden md:block py-[11px] px-1 text-right tabular-nums text-[var(--body-text)]">{t.pointsFor.toFixed(1)}</div>
                <div className="hidden md:block py-[11px] px-1 text-right tabular-nums text-[var(--body-text)]">{t.pointsAgainst.toFixed(1)}</div>
                <div className="hidden md:block py-[11px] px-1 text-right tabular-nums text-[var(--body-text)]">
                  {t.allPlayWins}-{t.allPlayLosses}
                </div>
                <div
                  className="hidden md:block py-[11px] px-1 text-right tabular-nums font-semibold"
                  style={{ color: t.luck > 0.4 ? "var(--accent)" : t.luck < -0.4 ? "var(--negative)" : "var(--muted-light)" }}
                >
                  {signed(t.luck)}
                </div>
                <div className="hidden md:block py-[11px] px-1 text-right tabular-nums text-[var(--body-text)]">{t.streak}</div>
                <div className="py-[11px] pr-1.5 pl-0.5 md:pr-3 md:pl-1 text-right tabular-nums">
                  <span className="font-semibold text-[#151515]">{pct(t.history.playoffs, t.history.teams)}%</span>
                  <span className="hidden md:inline text-[var(--muted-light)]">
                    {" "}
                    ({t.history.playoffs}/{t.history.teams})
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-[var(--muted-light)] mt-2.5">The green line is the playoff cut.</p>
        </section>

        {/* History */}
        <section>
          <Heading kicker="SINCE 2012" note={`Every team's record after ${m.week} games, and how it finished. The bar is the share that made the playoffs.`}>
            WHAT HISTORY SAYS
          </Heading>
          <div className="bg-white p-5 md:p-7 flex flex-col gap-3">
            {m.historyByWins.map((h) => {
              const now = teams.filter((t) => t.wins === h.wins).map((t) => t.manager);
              return (
                <div key={h.wins} className="grid grid-cols-[44px_minmax(0,1fr)] md:grid-cols-[56px_minmax(0,1fr)_minmax(0,0.9fr)] gap-x-3 gap-y-1 items-center">
                  <span className="text-[22px] leading-none text-[#151515]" style={BEBAS}>
                    {h.wins}-{m.week - h.wins}
                  </span>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex-1 h-[18px] bg-[var(--background)]">
                      <div data-bar="" className="h-full bg-[var(--accent)] origin-left" style={{ width: `${pct(h.playoffs, h.teams)}%` }} />
                    </div>
                    <span className="text-[12px] tabular-nums text-[#151515] w-[124px] md:w-[220px] shrink-0 md:whitespace-nowrap">
                      <strong>{pct(h.playoffs, h.teams)}%</strong> playoffs · {h.titles} title{h.titles === 1 ? "" : "s"}
                      <span className="text-[var(--muted-light)]"> · {h.teams} teams</span>
                    </span>
                  </div>
                  <span className="col-start-2 md:col-start-auto text-[12px] text-[var(--body-text)] truncate">
                    {now.length ? <>Now: {now.join(", ")}</> : <span className="text-[var(--muted-light)]">Nobody this year</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Games */}
        <section>
          <Heading kicker={`WEEKS 1-${m.week}`}>THE GAMES</Heading>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-4">
            <GameCard label="HIGH SCORE" g={m.topScore} value={m.topScore.points.toFixed(2)} tone="good" />
            <GameCard label="LOW SCORE" g={m.lowScore} value={m.lowScore.points.toFixed(2)} tone="bad" />
            <GameCard label="BIGGEST BLOWOUT" g={m.blowout} value={`+${(m.blowout.points - m.blowout.opponentPoints).toFixed(1)}`} />
            <GameCard label="NAIL-BITER" g={m.closest} value={(m.closest.points - m.closest.opponentPoints).toFixed(2)} />
          </div>
        </section>

        {/* Lineups */}
        <section>
          <Heading
            kicker="START 'EM, SIT 'EM"
            note="Efficiency is the share of each team's best possible lineup it actually started. Coulda won: losses the best lineup would have won."
          >
            THE LINEUP REPORT
          </Heading>
          <div className="bg-white">
            {lineups.map((t, i) => (
              <div key={t.manager} className="grid grid-cols-[22px_minmax(0,1fr)_56px_64px_44px] md:grid-cols-[36px_minmax(0,1fr)_90px_120px_100px] gap-2 items-center px-3 py-2.5 border-b border-[var(--hairline)] text-[12px] md:text-[13.5px]">
                <span className="text-[18px] leading-none" style={{ ...BEBAS, color: i < 3 ? "var(--accent)" : i >= lineups.length - 3 ? "var(--negative)" : "var(--dim)" }}>
                  {i + 1}
                </span>
                <span className="font-semibold text-[#151515] truncate">{t.manager}</span>
                <span className="text-right tabular-nums font-semibold text-[#151515]">{(t.efficiency * 100).toFixed(1)}%</span>
                <span className="text-right tabular-nums text-[var(--body-text)]">
                  {Math.round(t.benchPoints)} <span className="text-[var(--muted-light)]">bench</span>
                </span>
                <span className="text-right tabular-nums" style={{ color: t.couldaWon ? "var(--negative)" : "var(--muted-light)" }}>
                  {t.couldaWon} <span className="hidden md:inline">coulda won</span>
                  <span className="md:hidden">CW</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Waiver wire */}
        <section>
          <Heading kicker="THE WIRE" note="Pickups scored by points above a typical starter at the position, in the weeks they started.">
            WAIVERS &amp; FAAB
          </Heading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white">
              <div className="px-4 py-3 border-b border-[var(--hairline)] text-[10px] font-semibold tracking-[.12em] text-[var(--muted-light)]" style={MONO}>
                BEST PICKUPS
              </div>
              {m.pickups.map((p) => (
                <div key={`${p.manager}|${p.player}`} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--hairline)]">
                  <span className="flex-1 min-w-0">
                    <Link href={playerHref(p.player)} className="text-[14px] font-semibold text-[#151515] hover:underline">
                      {p.player}
                    </Link>{" "}
                    <span className="text-[10px] text-[var(--muted-light)]" style={MONO}>
                      {p.pos}
                    </span>
                    <span className="block text-[11.5px] text-[var(--body-text)]">
                      {p.manager} · week {p.week} · {p.how}
                    </span>
                  </span>
                  <span className="text-[20px] leading-none text-[var(--accent)]" style={BEBAS}>
                    +{p.aboveAvg.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
            <div className="bg-white">
              <div className="px-4 py-3 border-b border-[var(--hairline)] text-[10px] font-semibold tracking-[.12em] text-[var(--muted-light)]" style={MONO}>
                BIGGEST BIDS
              </div>
              {m.bids.map((b) => (
                <div key={`${b.manager}|${b.player}`} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--hairline)]">
                  <span className="text-[20px] leading-none text-[#151515] w-12 shrink-0" style={BEBAS}>
                    ${b.faab}
                  </span>
                  <span className="flex-1 min-w-0">
                    <Link href={playerHref(b.player)} className="text-[14px] font-semibold text-[#151515] hover:underline">
                      {b.player}
                    </Link>
                    <span className="block text-[11.5px] text-[var(--body-text)]">
                      {b.manager} · week {b.week}
                    </span>
                  </span>
                  <span className="text-[12px] tabular-nums text-right" style={{ color: b.aboveAvg ? "var(--accent)" : "var(--negative)" }}>
                    {b.aboveAvg ? `+${b.aboveAvg.toFixed(1)}` : "not yet"}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white mt-5 p-5 md:p-6">
            <div className="text-[10px] font-semibold tracking-[.12em] text-[var(--muted-light)] mb-3" style={MONO}>
              FAAB LEFT OF $100
            </div>
            <div className="flex flex-col gap-2">
              {faab.map((t) => (
                <div key={t.manager} className="grid grid-cols-[96px_minmax(0,1fr)_40px] md:grid-cols-[140px_minmax(0,1fr)_48px] gap-2.5 items-center">
                  <span className="text-[11px] text-[var(--body-text)] truncate" style={MONO}>
                    {t.manager}
                  </span>
                  <div className="h-[14px] bg-[var(--background)]">
                    <div data-bar="" className="h-full bg-[#151515] origin-left" style={{ width: `${t.faabLeft}%` }} />
                  </div>
                  <span className="text-[12px] font-semibold tabular-nums text-right text-[#151515]">${t.faabLeft}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trades */}
        <section>
          <Heading kicker={`${m.trades.length} SO FAR`} note="Points are what each side's new players have scored in their new team's starting lineup since the trade. Recent trades have barely started.">
            THE TRADES
          </Heading>
          <div className="flex flex-col gap-3">
            {m.trades.map((t) => {
              const sides = [...t.sides].sort((a, b) => b.total - a.total);
              return (
                <Link key={t.id} href={tradeHref(t.id)} data-reveal="" className="lift bg-white block">
                  <div className="px-4 py-2 border-b border-[var(--hairline)] text-[10px] font-semibold tracking-[.12em] text-[var(--muted-light)]" style={MONO}>
                    WEEK {t.week} · {m.week - t.week + 1} WEEK{m.week - t.week === 0 ? "" : "S"} OF DATA
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    {sides.map((s, i) => (
                      <div key={s.mgr} className={`px-4 py-3 ${i === 0 ? "" : "border-t md:border-t-0 md:border-l border-[var(--hairline)]"}`}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-[14px] font-semibold text-[#151515]">{s.mgr}</span>
                          <span className="text-[20px] leading-none tabular-nums" style={{ ...BEBAS, color: i === 0 && s.total > sides[1].total ? "var(--accent)" : "#151515" }}>
                            {s.total.toFixed(1)}
                          </span>
                        </div>
                        <div className="text-[12px] text-[var(--body-text)]">Got {s.gets.map((g) => g.player).filter(Boolean).join(", ")}</div>
                      </div>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Draft */}
        <section>
          <Heading
            kicker="DRAFT CHECK-IN"
            note="Grades rank each team by what its own draft picks have scored for it. Steals and busts compare where each player was taken with where they rank so far among drafted QBs, RBs, WRs and TEs."
          >
            HOW THE DRAFT IS AGING
          </Heading>
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5">
            <div className="bg-white">
              {m.draftGrades.map((g) => {
                const t = standingOf.get(g.manager);
                return (
                  <div key={g.manager} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--hairline)]">
                    <span className="text-[24px] leading-none w-10" style={{ ...BEBAS, color: gradeColor(g.grade) }}>
                      {g.grade}
                    </span>
                    <span className="flex-1 min-w-0 text-[14px] font-semibold text-[#151515] truncate">{g.manager}</span>
                    {t && (
                      <span className="text-[12px] tabular-nums text-[var(--body-text)]">
                        {rec(t as TeamRow)} · {t.rank}
                        {t.rank === 1 ? "st" : t.rank === 2 ? "nd" : t.rank === 3 ? "rd" : "th"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col gap-5">
              {[
                { title: "STEALS", rows: m.steals, color: "var(--accent)" },
                { title: "BUSTS", rows: m.busts, color: "var(--negative)" },
              ].map((l) => (
                <div key={l.title} className="bg-white">
                  <div className="px-4 py-3 border-b border-[var(--hairline)] text-[10px] font-semibold tracking-[.12em]" style={{ ...MONO, color: l.color }}>
                    {l.title}
                  </div>
                  {l.rows.map((p) => (
                    <div key={p.pick} className="flex items-center gap-3 px-4 py-2 border-b border-[var(--hairline)]">
                      <span className="flex-1 min-w-0">
                        <Link href={playerHref(p.player)} className="text-[14px] font-semibold text-[#151515] hover:underline">
                          {p.player}
                        </Link>{" "}
                        <span className="text-[10px] text-[var(--muted-light)]" style={MONO}>
                          {p.posFull}
                        </span>
                        <span className="block text-[11.5px] text-[var(--body-text)]">
                          {p.manager} · pick {p.label} · finishing {p.finish}
                        </span>
                      </span>
                      <span className="text-[20px] leading-none tabular-nums" style={{ ...BEBAS, color: l.color }}>
                        {p.value! > 0 ? "+" : "−"}
                        {Math.abs(p.value!)}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
