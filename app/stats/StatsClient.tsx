"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import CountUp from "@/components/CountUp";
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
import type { CoreStats } from "@/lib/stats-data";
import { chartColors } from "@/lib/chart-colors";
import type { FrontOffice, WaiverReport } from "@/lib/front-office-data";
import type { LuckAndLineups } from "@/lib/luck-lineups-data";
import type { PerfectSeason } from "@/lib/perfect-lineup-data";
import type { MarginGame } from "@/types/stats";

type TabId = "highlights" | "rankings" | "records" | "seasons" | "office" | "luck";

const TABS: { id: TabId; title: string; description: string }[] = [
  {
    id: "highlights",
    title: "HIGHLIGHTS",
    description: "The league's best, worst and wildest numbers, all in one place.",
  },
  {
    id: "rankings",
    title: "ALL-TIME RANKINGS",
    description: "Who has the best record, and who the numbers say got there the hard way.",
  },
  {
    id: "records",
    title: "RECORDS & RIVALRIES",
    description: "The biggest single games ever played, and how everyone fares against everyone.",
  },
  {
    id: "seasons",
    title: "SEASON BY SEASON",
    description: "Final standings for any year, and how scoring has drifted over time.",
  },
  {
    id: "office",
    title: "FRONT OFFICE",
    description: "Every roster move: trades, waiver pickups and FAAB.",
  },
  {
    id: "luck",
    title: "LUCK & LINEUPS",
    description: "Schedule luck, lineup calls, and who'd have won with perfect lineups.",
  },
];

function SectionHeading({
  children,
  subtitle,
  description,
}: {
  children: React.ReactNode;
  subtitle?: string;
  description?: React.ReactNode;
}) {
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
      {description && (
        <p className="text-sm text-[var(--body-text)] leading-[1.55] max-w-[68ch] mt-2">
          {description}
        </p>
      )}
    </div>
  );
}

function SubHeading({
  children,
  subtitle,
  description,
}: {
  children: React.ReactNode;
  subtitle?: string;
  description?: React.ReactNode;
}) {
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
      {description && (
        <p className="text-sm text-[var(--body-text)] leading-[1.55] max-w-[68ch] mt-1.5">
          {description}
        </p>
      )}
    </div>
  );
}

function RankedList({
  title,
  subtitle,
  description,
  rows,
}: {
  title: string;
  subtitle: string;
  description?: React.ReactNode;
  rows: { rank: number; rankColor: string; primary: string; meta: string; value: string; valueColor: string }[];
}) {
  return (
    <section>
      <SubHeading subtitle={subtitle} description={description}>
        {title}
      </SubHeading>
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

interface Highlight {
  label: string;
  value: string;
  tone?: "good" | "bad";
  who: string;
  detail: string;
  tab: TabId;
}

function Highlights({ cards, onOpen }: { cards: Highlight[]; onOpen: (tab: TabId) => void }) {
  const mono = { fontFamily: "var(--font-geist-mono)" };
  const tabTitle = (id: TabId) => TABS.find((t) => t.id === id)!.title;
  return (
    <section>
      <SectionHeading description="One headline from every corner of the stats. Tap a card for the full table.">
        HIGHLIGHTS
      </SectionHeading>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-4">
        {cards.map((c, i) => (
          <button
            key={c.label}
            type="button"
            onClick={() => onOpen(c.tab)}
            data-reveal=""
            style={{ "--i": i } as React.CSSProperties}
            className="lift bg-white text-left p-4 md:p-5 flex flex-col gap-1.5 border-b-2 border-transparent hover:border-[var(--accent)]"
          >
            <span className="text-[10px] font-semibold tracking-[.12em] text-[var(--muted-light)]" style={mono}>
              {c.label}
            </span>
            <span
              className="text-[40px] leading-none"
              style={{
                fontFamily: "var(--font-bebas-neue)",
                color: c.tone === "bad" ? "var(--negative)" : c.tone === "good" ? "var(--accent)" : "#151515",
              }}
            >
              <CountUp text={c.value} />
            </span>
            <span className="text-[15px] font-semibold text-[#151515]">{c.who}</span>
            <span className="text-[12.5px] text-[var(--body-text)] leading-[1.45]">{c.detail}</span>
            <span className="mt-auto pt-2 text-[10px] font-semibold tracking-[.12em] text-[var(--accent)]" style={mono}>
              {tabTitle(c.tab)} →
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function WaiverSections({ data }: { data: WaiverReport }) {
  const [season, setSeason] = useState("all");
  const [manager, setManager] = useState("all");
  const mono = { fontFamily: "var(--font-geist-mono)" };
  const seasons = [...new Set(data.pickups.map((p) => p.season))].sort((a, b) => b - a);
  const managers = [...new Set(data.pickups.map((p) => p.manager))].sort();
  const pickups = data.pickups
    .filter((p) => (season === "all" || p.season === Number(season)) && (manager === "all" || p.manager === manager))
    .slice(0, 10);
  const select = "bg-[#151515] text-white border-none px-3.5 py-2.5 text-[11px] font-semibold tracking-[.12em] focus:outline-none";
  const cols =
    "grid-cols-[22px_minmax(0,1fr)_52px_64px] md:grid-cols-[36px_200px_76px_96px_56px_84px_minmax(0,1fr)]";

  return (
    <>
      <section>
        <SectionHeading
          description={
            <>
              Every add since 2012, scored by what he did in the adding team&apos;s lineup: each week he started is
              measured against the median starter at his position league-wide, so a big RB week counts as much as a
              big QB week.
            </>
          }
        >
          BEST PICKUPS
        </SectionHeading>
        <div className="flex gap-2 flex-wrap mb-4">
          <select value={season} onChange={(e) => setSeason(e.target.value)} className={select} style={mono} aria-label="Season">
            <option value="all">ALL SEASONS</option>
            {seasons.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select value={manager} onChange={(e) => setManager(e.target.value)} className={select} style={mono} aria-label="Manager">
            <option value="all">ALL MANAGERS</option>
            {managers.map((m) => (
              <option key={m} value={m}>
                {m.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        {pickups.length ? (
          <RankedList
            title="TOP 10"
            subtitle="Points above a typical starter at his position"
            rows={pickups.map((p, i) => ({
              rank: i + 1,
              rankColor: i < 3 ? "var(--accent)" : "var(--dim)",
              primary: `${p.player} · ${p.pos}`,
              meta: `${p.manager} · ${p.season} WK ${p.week} · ${p.how} · ${p.points.toFixed(1)} PTS IN ${p.starts} STARTS`.toUpperCase(),
              value: `+${p.aboveAvg.toFixed(1)}`,
              valueColor: "var(--accent)",
            }))}
          />
        ) : (
          <p className="text-sm text-[var(--muted-light)]">No pickup beat a typical starter for that season and manager.</p>
        )}
      </section>

      <section>
        <SectionHeading
          description={
            <>
              FAAB bidding started in {data.faabSince}; every team gets $100 a season. <strong>Pts per $</strong> is
              starting points from FAAB buys (from the week the bid cleared) per dollar spent. Managers who&apos;ve spent
              at least $50. The current season counts what&apos;s been spent so far.
            </>
          }
        >
          FAAB SPENDING
        </SectionHeading>
        <div
          className={`grid ${cols} bg-[#151515] text-[#f5f5f0] text-[8px] md:text-[9.5px] font-semibold tracking-[.06em] md:tracking-[.1em]`}
          style={mono}
        >
          <div className="py-[11px] pl-1.5 md:pl-3">#</div>
          <div className="py-[11px] px-1 md:px-2">MANAGER</div>
          <div className="py-[11px] px-0.5 md:px-1 text-right">PTS / $</div>
          <div className="py-[11px] pr-1.5 pl-0.5 md:px-1 text-right">$ / SEASON</div>
          <div className="hidden md:block py-[11px] px-1 text-right">BIDS</div>
          <div className="hidden md:block py-[11px] px-1 text-right">AVG BID</div>
          <div className="hidden md:block py-[11px] pl-5 pr-3">BIGGEST BID</div>
        </div>
        <div className="bg-white">
          {data.spending.map((h, i) => (
            <div key={h.manager} className={`grid ${cols} border-b border-[var(--hairline)] items-center text-[11px] md:text-[13.5px]`}>
              <div
                className="py-[11px] pl-1.5 md:pl-3 text-[15px] md:text-[20px] leading-none"
                style={{ fontFamily: "var(--font-bebas-neue)", color: i < 3 ? "var(--accent)" : "var(--dim)" }}
              >
                {i + 1}
              </div>
              <div className="py-[11px] px-1 md:px-2 min-w-0">
                <div className="font-semibold text-[#151515] truncate">{h.manager}</div>
                <div className="md:hidden text-[9.5px] text-[var(--muted-light)] truncate" style={mono}>
                  {h.bids} BIDS · BIGGEST ${h.biggest.faab} {h.biggest.player.toUpperCase()}
                </div>
              </div>
              <div className="py-[11px] px-0.5 md:px-1 text-right font-semibold text-[var(--accent)] tabular-nums">
                {h.perDollar.toFixed(1)}
              </div>
              <div className="py-[11px] pr-1.5 pl-0.5 md:px-1 text-right tabular-nums text-[var(--body-text)]">${Math.round(h.perSeason)}</div>
              <div className="hidden md:block py-[11px] px-1 text-right tabular-nums text-[var(--body-text)]">{h.bids}</div>
              <div className="hidden md:block py-[11px] px-1 text-right tabular-nums text-[var(--body-text)]">${h.avgBid.toFixed(1)}</div>
              <div className="hidden md:block py-[11px] pl-5 pr-3 truncate text-[var(--body-text)]">
                <span className="font-semibold text-[#151515] tabular-nums">${h.biggest.faab}</span> {h.biggest.player}{" "}
                <span className="text-[var(--muted-light)] tabular-nums">{h.biggest.season}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-9">
        <RankedList
          title="BEST BIDS"
          subtitle="FAAB buys, by points above a typical starter"
          rows={data.bestBids.map((p, i) => ({
            rank: i + 1,
            rankColor: i < 3 ? "var(--accent)" : "var(--dim)",
            primary: `${p.player} · ${p.pos}`,
            meta: `$${p.faab} · ${p.manager} · ${p.season} WK ${p.week} · ${p.starts} STARTS`.toUpperCase(),
            value: `+${p.aboveAvg.toFixed(1)}`,
            valueColor: "var(--accent)",
          }))}
        />
        <RankedList
          title="WORST BIDS"
          subtitle="Biggest bids on players who never beat a typical starter"
          rows={data.worstBids.map((p, i) => ({
            rank: i + 1,
            rankColor: i < 3 ? "var(--negative)" : "var(--dim)",
            primary: `${p.player} · ${p.pos}`,
            meta: `${p.manager} · ${p.season} WK ${p.week} · ${p.starts ? `${p.starts} STARTS, ${p.aboveAvg.toFixed(1)} VS TYPICAL` : "NEVER STARTED"}`.toUpperCase(),
            value: `$${p.faab}`,
            valueColor: "var(--negative)",
          }))}
        />
      </div>
    </>
  );
}

function FrontOfficeSections({ data }: { data: FrontOffice }) {
  const signed = (n: number) =>
    `${n > 0 ? "+" : ""}${n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
  const tradeCols = "grid-cols-[22px_minmax(0,1fr)_48px_52px_64px] md:grid-cols-[36px_minmax(0,1fr)_80px_80px_100px]";

  return (
    <>
      {/* Trade Report Card */}
      <section>
        <SectionHeading
          description={
            <>
              Every trade in league history, scored by what each side&apos;s new players went on to score in their new
              team&apos;s starting lineup that season. <strong>NET</strong> is the points a manager gained over the
              other side, added up across all their trades.{" "}
              <Link href="/rosters?tab=trades" className="text-[var(--accent)] font-semibold">
                See every trade →
              </Link>
            </>
          }
        >
          TRADE REPORT CARD
        </SectionHeading>
        <div
          className={`grid ${tradeCols} bg-[#151515] text-[#f5f5f0] text-[8px] md:text-[9.5px] font-semibold tracking-[.06em] md:tracking-[.1em]`}
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          <div className="py-[11px] pl-1.5 md:pl-3">#</div>
          <div className="py-[11px] px-1 md:px-2">MANAGER</div>
          <div className="py-[11px] px-0.5 md:px-1 text-right">TRADES</div>
          <div className="py-[11px] px-0.5 md:px-1 text-right">W–L</div>
          <div className="py-[11px] pr-1.5 pl-0.5 md:pr-3 md:pl-1 text-right">NET PTS</div>
        </div>
        <div className="bg-white">
          {data.trades.map((t, i) => (
            <div
              key={t.manager}
              className={`grid ${tradeCols} border-b border-[var(--hairline)] items-center text-[11px] md:text-[13.5px]`}
            >
              <div
                className="py-[11px] pl-1.5 md:pl-3 text-[15px] md:text-[20px] leading-none"
                style={{ fontFamily: "var(--font-bebas-neue)", color: i < 3 ? "var(--accent)" : "var(--dim)" }}
              >
                {i + 1}
              </div>
              <div className="py-[11px] px-1 md:px-2 font-semibold text-[#151515] truncate">{t.manager}</div>
              <div className="py-[11px] px-0.5 md:px-1 text-right text-[var(--body-text)]">{t.trades}</div>
              <div className="py-[11px] px-0.5 md:px-1 text-right font-semibold text-[#151515]">
                {t.wins}–{t.losses}
              </div>
              <div
                className="py-[11px] pr-1.5 pl-0.5 md:pr-3 md:pl-1 text-right font-semibold tabular-nums"
                style={{ color: t.net >= 0 ? "var(--accent)" : "var(--negative)" }}
              >
                {signed(t.net)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function ProjectionsSection({ projections }: { projections: FrontOffice["projections"] }) {
  const projMaxAbs = Math.max(1, ...projections.map((p) => Math.abs(p.perWeek)));
  const signed = (n: number) =>
    `${n > 0 ? "+" : ""}${n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;

  return (
      <section>
        <SectionHeading
          description={
            <>
              Yahoo projects every player before kickoff. This adds up how far each manager&apos;s starters beat (or
              missed) those projections, per week. A long green bar means they keep starting the right guys; a red
              bar means their lineup calls keep coming up short. A starter who didn&apos;t play counts as zero.
            </>
          }
        >
          BEATING THE PROJECTIONS
        </SectionHeading>
        <div className="bg-white p-5 md:p-7">
          <div className="flex flex-col gap-2.5">
            {projections.map((p) => {
              const pct = (Math.abs(p.perWeek) / projMaxAbs) * 50;
              const positive = p.perWeek >= 0;
              const color = positive ? "var(--accent)" : "var(--negative)";
              return (
                <div key={p.manager} className="flex items-center gap-2.5" title={`${signed(p.total)} pts over ${p.weeks} weeks`}>
                  <div
                    className="w-[60px] md:w-[86px] text-[10px] text-[var(--body-text)] text-right truncate shrink-0"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {p.manager}
                  </div>
                  <div className="flex-1 relative h-[18px] bg-[var(--background)]">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--rule)]" />
                    <div
                      data-bar=""
                      className="absolute top-0 h-[18px]"
                      style={{
                        left: positive ? "50%" : `${50 - pct}%`,
                        width: `${pct}%`,
                        background: color,
                        transformOrigin: positive ? "left" : "right",
                      }}
                    />
                  </div>
                  <div
                    className="w-[58px] text-[10px] font-semibold shrink-0"
                    style={{ fontFamily: "var(--font-geist-mono)", color }}
                  >
                    {signed(p.perWeek)}/WK
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
              STARTERS BEAT PROJECTIONS
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[var(--negative)]" />
              STARTERS FELL SHORT
            </span>
            <span>MANAGERS WITH 2+ SEASONS</span>
          </div>
        </div>
      </section>
  );
}

function LuckSections({
  data,
  projections,
  perfect,
}: {
  data: LuckAndLineups;
  projections: FrontOffice["projections"];
  perfect: PerfectSeason[];
}) {
  const maxAbs = Math.max(1, ...data.careers.map((c) => Math.abs(c.luck)));
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const signed = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}`;
  const cols = "grid-cols-[22px_minmax(0,1fr)_52px_56px_62px] md:grid-cols-[36px_minmax(0,1fr)_100px_110px_130px]";

  return (
    <>
      {/* Schedule Luck */}
      <section>
        <SectionHeading
          description={
            <>
              Your <strong>all-play</strong> record is what you&apos;d have gone if you played every other team every
              week. The gap between that and your real record is pure schedule luck: a green bar means you kept drawing
              opponents on their off weeks, a red bar means you kept running into the week&apos;s top score. Regular
              season only.
            </>
          }
        >
          SCHEDULE LUCK
        </SectionHeading>
        <div className="bg-white p-5 md:p-7">
          <div className="flex flex-col gap-2.5">
            {data.careers.map((c) => {
              const w = (Math.abs(c.luck) / maxAbs) * 50;
              const positive = c.luck >= 0;
              const color = positive ? "var(--accent)" : "var(--negative)";
              return (
                <div
                  key={c.manager}
                  className="flex items-center gap-2.5"
                  title={`Real ${pct(c.realPct)} vs all-play ${pct(c.allPlayPct)} over ${c.games} games`}
                >
                  <div
                    className="w-[60px] md:w-[86px] text-[10px] text-[var(--body-text)] text-right truncate shrink-0"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {c.manager}
                  </div>
                  <div className="flex-1 relative h-[18px] bg-[var(--background)]">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--rule)]" />
                    <div
                      data-bar=""
                      className="absolute top-0 h-[18px]"
                      style={{
                        left: positive ? "50%" : `${50 - w}%`,
                        width: `${w}%`,
                        background: color,
                        transformOrigin: positive ? "left" : "right",
                      }}
                    />
                  </div>
                  <div
                    className="w-[44px] text-[10px] font-semibold shrink-0"
                    style={{ fontFamily: "var(--font-geist-mono)", color }}
                  >
                    {signed(c.luck)}%
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
              REAL RECORD BEAT ALL-PLAY
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[var(--negative)]" />
              SCHEDULE COST THEM WINS
            </span>
            <span>WIN % POINTS · 40+ GAMES</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-9">
        <RankedList
          title="LUCKIEST SEASONS"
          subtitle="Real wins minus all-play expected wins"
          rows={data.luckiest.map((s, i) => ({
            rank: i + 1,
            rankColor: i < 3 ? "var(--accent)" : "var(--dim)",
            primary: s.manager,
            meta: `${s.season} · WENT ${s.wins}-${s.losses} · DESERVED ${s.expectedWins.toFixed(1)} WINS`,
            value: `${signed(s.luck)}`,
            valueColor: "var(--accent)",
          }))}
        />
        <RankedList
          title="UNLUCKIEST SEASONS"
          subtitle="Real wins minus all-play expected wins"
          rows={data.unluckiest.map((s, i) => ({
            rank: i + 1,
            rankColor: i < 3 ? "var(--negative)" : "var(--dim)",
            primary: s.manager,
            meta: `${s.season} · WENT ${s.wins}-${s.losses} · DESERVED ${s.expectedWins.toFixed(1)} WINS`,
            value: `${signed(s.luck)}`,
            valueColor: "var(--negative)",
          }))}
        />
      </div>

      {/* Lineup Efficiency */}
      <section>
        <SectionHeading
          description={
            <>
              Each week we rebuild the best lineup you could have started from your own roster.{" "}
              <strong>Efficiency</strong> is the share of those points you actually started. <strong>Coulda won</strong>{" "}
              counts losses where that best lineup would have beaten your opponent. Regular season only.
            </>
          }
        >
          LINEUP EFFICIENCY
        </SectionHeading>
        <div
          className={`grid ${cols} bg-[#151515] text-[#f5f5f0] text-[8px] md:text-[9.5px] font-semibold tracking-[.06em] md:tracking-[.1em]`}
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          <div className="py-[11px] pl-1.5 md:pl-3">#</div>
          <div className="py-[11px] px-1 md:px-2">MANAGER</div>
          <div className="py-[11px] px-0.5 md:px-1 text-right">EFFICIENCY</div>
          <div className="py-[11px] px-0.5 md:px-1 text-right">BENCH PTS/WK</div>
          <div className="py-[11px] pr-1.5 pl-0.5 md:pr-3 md:pl-1 text-right">COULDA WON</div>
        </div>
        <div className="bg-white">
          {data.lineups.map((l, i) => (
            <div
              key={l.manager}
              className={`grid ${cols} border-b border-[var(--hairline)] items-center text-[11px] md:text-[13.5px]`}
            >
              <div
                className="py-[11px] pl-1.5 md:pl-3 text-[15px] md:text-[20px] leading-none"
                style={{ fontFamily: "var(--font-bebas-neue)", color: i < 3 ? "var(--accent)" : "var(--dim)" }}
              >
                {i + 1}
              </div>
              <div className="py-[11px] px-1 md:px-2 font-semibold text-[#151515] truncate">{l.manager}</div>
              <div className="py-[11px] px-0.5 md:px-1 text-right font-semibold text-[var(--accent)] tabular-nums">
                {pct(l.efficiency)}
              </div>
              <div className="py-[11px] px-0.5 md:px-1 text-right text-[var(--body-text)] tabular-nums">
                {l.benchPerWeek.toFixed(1)}
              </div>
              <div className="py-[11px] pr-1.5 pl-0.5 md:pr-3 md:pl-1 text-right tabular-nums">
                <span className="font-semibold text-[var(--negative)]">{l.couldaWon}</span>
                <span className="text-[var(--muted-light)]"> of {l.losses} L</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[12px] text-[var(--muted-light)] mt-2.5 max-w-[68ch]">
          A few bench players have no known position and can&apos;t be moved, so the best lineup is slightly understated.
        </p>
      </section>

      <ProjectionsSection projections={projections} />

      <PerfectLineups seasons={perfect} />
    </>
  );
}

function PerfectLineups({ seasons }: { seasons: PerfectSeason[] }) {
  const [year, setYear] = useState(seasons[0]?.season);
  const changed = seasons.filter((s) => s.real.champion !== s.perfect.champion).length;
  const chosen = seasons.find((s) => s.season === year) ?? seasons[0];
  if (!chosen) return null;
  const realByManager = new Map(chosen.real.teams.map((t) => [t.manager, t]));
  const record = (t: { wins: number; losses: number; ties: number }) => `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ""}`;
  const mono = { fontFamily: "var(--font-geist-mono)" };
  const titleCols = "grid-cols-[52px_minmax(0,1fr)_minmax(0,1fr)] md:grid-cols-[90px_minmax(0,1fr)_minmax(0,1fr)]";
  const rankCols = "grid-cols-[28px_minmax(0,1fr)_64px_64px] md:grid-cols-[44px_minmax(0,1fr)_150px_150px]";

  return (
    <section>
      <SectionHeading
        description={
          <>
            What if every manager had started their best possible lineup every week? We rescored both sides of every
            game, replayed the real schedule, and ran the playoff bracket the way the league did (no reseeding).{" "}
            <strong>
              {changed} of {seasons.length} titles change hands.
            </strong>
          </>
        }
      >
        PERFECT LINEUPS
      </SectionHeading>
      <div
        className={`grid ${titleCols} bg-[#151515] text-[#f5f5f0] text-[8px] md:text-[9.5px] font-semibold tracking-[.06em] md:tracking-[.1em]`}
        style={mono}
      >
        <div className="py-[11px] pl-1.5 md:pl-3">SEASON</div>
        <div className="py-[11px] px-1 md:px-2">REAL CHAMPION</div>
        <div className="py-[11px] px-1 md:px-2">PERFECT-LINEUP CHAMPION</div>
      </div>
      <div className="bg-white">
        {seasons.map((s) => {
          const flipped = s.real.champion !== s.perfect.champion;
          return (
            <div key={s.season} className={`grid ${titleCols} border-b border-[var(--hairline)] items-center text-[11px] md:text-[13.5px]`}>
              <div className="py-[11px] pl-1.5 md:pl-3 tabular-nums text-[var(--body-text)]">{s.season}</div>
              <div className="py-[11px] px-1 md:px-2 text-[#151515] truncate">{s.real.champion}</div>
              <div
                className={`py-[11px] px-1 md:px-2 truncate ${flipped ? "font-semibold text-[var(--accent)]" : "text-[var(--muted-light)]"}`}
              >
                {flipped ? s.perfect.champion : "Same"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 flex-wrap mt-8 mb-3">
        <span className="text-[10.5px] tracking-[.08em] text-[var(--muted-light)]" style={mono}>
          RE-RANKED SEASON
        </span>
        <select
          value={chosen.season}
          onChange={(e) => setYear(Number(e.target.value))}
          className="bg-[#151515] text-white border-none px-3.5 py-2.5 text-[11px] font-semibold tracking-[.12em] focus:outline-none"
          style={mono}
        >
          {seasons.map((s) => (
            <option key={s.season} value={s.season}>
              {s.season}
            </option>
          ))}
        </select>
      </div>
      <div
        className={`grid ${rankCols} bg-[#151515] text-[#f5f5f0] text-[8px] md:text-[9.5px] font-semibold tracking-[.06em] md:tracking-[.1em]`}
        style={mono}
      >
        <div className="py-[11px] pl-1.5 md:pl-3">SEED</div>
        <div className="py-[11px] px-1 md:px-2">MANAGER</div>
        <div className="py-[11px] px-0.5 md:px-1 text-right">PERFECT</div>
        <div className="py-[11px] pr-1.5 pl-0.5 md:pr-3 md:pl-1 text-right">REAL</div>
      </div>
      <div className="bg-white">
        {chosen.perfect.teams.map((t) => {
          const real = realByManager.get(t.manager)!;
          const move = real.seed - t.seed;
          return (
            <div key={t.manager} className={`grid ${rankCols} border-b border-[var(--hairline)] items-center text-[11px] md:text-[13.5px]`}>
              <div
                className="py-[11px] pl-1.5 md:pl-3 text-[15px] md:text-[20px] leading-none"
                style={{ fontFamily: "var(--font-bebas-neue)", color: t.seed <= 3 ? "var(--accent)" : "var(--dim)" }}
              >
                {t.seed}
              </div>
              <div className="py-[11px] px-1 md:px-2 min-w-0">
                <div className="font-semibold text-[#151515] truncate">{t.manager}</div>
                <div className="text-[9.5px] md:text-[10px] tracking-[.06em] text-[var(--muted-light)] truncate" style={mono}>
                  {t.manager === chosen.perfect.champion ? "PERFECT-LINEUP CHAMP" : ""}
                  {t.manager === chosen.perfect.champion && t.manager === chosen.real.champion ? " · " : ""}
                  {t.manager === chosen.real.champion ? "REAL CHAMP" : ""}
                </div>
              </div>
              <div className="py-[11px] px-0.5 md:px-1 text-right tabular-nums font-semibold text-[#151515]">
                {record(t)}
                <span className="hidden md:inline font-normal text-[var(--muted-light)]"> · {Math.round(t.pointsFor).toLocaleString("en-US")}</span>
              </div>
              <div className="py-[11px] pr-1.5 pl-0.5 md:pr-3 md:pl-1 text-right tabular-nums text-[var(--body-text)]">
                {record(real)} <span className="text-[var(--muted-light)]">#{real.seed}</span>
                {move !== 0 && (
                  <span className="hidden md:inline font-semibold" style={{ color: move > 0 ? "var(--accent)" : "var(--negative)" }}>
                    {" "}
                    {move > 0 ? "▲" : "▼"}
                    {Math.abs(move)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[12px] text-[var(--muted-light)] mt-2.5 max-w-[68ch]">
        Seeds are by record, then points. Perfect records count every team&apos;s best lineup, so everyone scores more;
        ▲/▼ is how many seeds a team moved. Replaying the real scores this way reproduces every actual champion.
      </p>
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

export default function StatsClient({
  core,
  frontOffice,
  luck,
  perfect,
}: {
  core: CoreStats;
  frontOffice: FrontOffice;
  luck: LuckAndLineups;
  perfect: PerfectSeason[];
}) {
  return (
    <Suspense fallback={null}>
      <StatsContent core={core} frontOffice={frontOffice} luck={luck} perfect={perfect} />
    </Suspense>
  );
}

function StatsContent({
  core,
  frontOffice,
  luck,
  perfect,
}: {
  core: CoreStats;
  frontOffice: FrontOffice;
  luck: LuckAndLineups;
  perfect: PerfectSeason[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  // "waiver" was its own tab briefly; old links land on Front Office, where it lives now.
  const activeTab: TabId =
    tabParam === "waiver"
      ? "office"
      : tabParam === "rankings" ||
          tabParam === "records" ||
          tabParam === "seasons" ||
          tabParam === "office" ||
          tabParam === "luck"
        ? tabParam
        : "highlights";

  function setTab(tab: TabId) {
    router.replace(`${pathname}?tab=${tab}`, { scroll: false });
  }

  const {
    seasons,
    champions: championsData,
    managerStats,
    scoringTrends,
    scoreDistribution,
    topPerformances,
    lowestPerformances,
    h2hRecords,
    blowouts,
    closestGames,
    consistency,
    playoffStats,
  } = core;
  const [selectedSeason, setSelectedSeason] = useState(seasons[0]);
  const seasonStandings = core.standingsBySeason[selectedSeason] ?? [];

  // Summary stats
  const totalGames = scoringTrends.reduce((acc, s) => acc + s.totalGames, 0);
  const allTimeHighScore = Math.max(...scoringTrends.map((s) => s.highScore));
  const avgPointsPerGame =
    scoringTrends.reduce((acc, s) => acc + s.avgScore * s.totalGames, 0) / totalGames;

  const leaderboard = [...managerStats].sort((a, b) => b.totalWins - a.totalWins);

  const consistencyMax = Math.max(1, ...consistency.map((c) => c.stdDev));

  const highlights = buildHighlights();
  function buildHighlights(): Highlight[] {
    const top = topPerformances[0];
    const low = lowestPerformances[0];
    const blow = blowouts[0];
    const close = closestGames[0];
    const sides = (g: MarginGame) =>
      g.winner === g.team1
        ? { w: g.team1Manager, l: g.team2Manager, ws: g.team1Score, ls: g.team2Score }
        : { w: g.team2Manager, l: g.team1Manager, ws: g.team2Score, ls: g.team1Score };
    const mostTitles = Math.max(...managerStats.map((m) => m.championships));
    const titleHolders = managerStats.filter((m) => m.championships === mostTitles).map((m) => m.manager);
    const clutch = playoffStats.filter((p) => p.playoffGames >= 6)[0];
    const trader = frontOffice.trades[0];
    const pickup = frontOffice.waiver.pickups[0];
    const worstBid = frontOffice.waiver.worstBids[0];
    const lucky = luck.careers[0];
    const lineup = [...luck.lineups].sort((a, b) => b.efficiency - a.efficiency)[0];
    const flipped = perfect.filter((p) => p.real.champion !== p.perfect.champion);
    const cards: (Highlight | false | undefined)[] = [
      top && { label: "TOP SCORE EVER", value: top.score.toFixed(2), tone: "good", who: top.manager, detail: `${top.season} week ${top.week} vs ${top.opponent}`, tab: "records" },
      low && { label: "LOWEST SCORE EVER", value: low.score.toFixed(2), tone: "bad", who: low.manager, detail: `${low.season} week ${low.week} vs ${low.opponent}`, tab: "records" },
      blow && { label: "BIGGEST BLOWOUT", value: `+${blow.margin.toFixed(1)}`, who: sides(blow).w, detail: `${sides(blow).ws.toFixed(1)}-${sides(blow).ls.toFixed(1)} over ${sides(blow).l}, ${blow.season} week ${blow.week}`, tab: "records" },
      close && { label: "CLOSEST GAME", value: close.margin.toFixed(2), who: sides(close).w, detail: `${sides(close).ws.toFixed(2)}-${sides(close).ls.toFixed(2)} over ${sides(close).l}, ${close.season} week ${close.week}`, tab: "records" },
      { label: "MOST TITLES", value: String(mostTitles), who: titleHolders.join(" & "), detail: `Championships since ${seasons[seasons.length - 1]}`, tab: "rankings" },
      clutch && { label: "CLUTCH KING", value: `+${clutch.clutchRating.toFixed(1)}`, tone: "good", who: clutch.manager, detail: `${clutch.playoffPPG.toFixed(1)} points per playoff game vs ${clutch.regularPPG.toFixed(1)} in the regular season`, tab: "rankings" },
      trader && { label: "BEST TRADER", value: `+${Math.round(trader.net).toLocaleString("en-US")}`, tone: "good", who: trader.manager, detail: `Net starting points across ${trader.trades} trades (${trader.wins}-${trader.losses})`, tab: "office" },
      pickup && { label: "BEST PICKUP EVER", value: `+${pickup.aboveAvg.toFixed(1)}`, tone: "good", who: pickup.player, detail: `${pickup.manager}, ${pickup.season}: points above a typical starter`, tab: "office" },
      worstBid && { label: "WORST FAAB BID", value: `$${worstBid.faab}`, tone: "bad", who: worstBid.player, detail: `${worstBid.manager}, ${worstBid.season}: ${worstBid.starts ? `${worstBid.starts} starts, never beat a typical starter` : "never started"}`, tab: "office" },
      lucky && { label: "LUCKIEST CAREER", value: `+${lucky.luck.toFixed(1)}%`, tone: "good", who: lucky.manager, detail: `Real win % above what all-play says his scores earned`, tab: "luck" },
      lineup && { label: "BEST LINEUP SETTER", value: `${(lineup.efficiency * 100).toFixed(1)}%`, tone: "good", who: lineup.manager, detail: `Share of his best possible lineup's points he actually started`, tab: "luck" },
      flipped.length > 0 && { label: "TITLES PERFECT LINEUPS FLIP", value: `${flipped.length} of ${perfect.length}`, who: `${flipped[0].season}: ${flipped[0].perfect.champion}`, detail: `would have beaten real champion ${flipped[0].real.champion}`, tab: "luck" },
    ];
    return cards.filter((c): c is Highlight => Boolean(c));
  }

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
                <CountUp text={String(seasons.length)} />
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
                <CountUp text={String(Math.round(totalGames))} />
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
                <CountUp text={allTimeHighScore.toFixed(1)} />
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
                <CountUp text={avgPointsPerGame.toFixed(1)} />
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

      {/* Section picker */}
      <div id="stats-tabs" className="bg-[var(--background)] border-b border-[var(--rule)] scroll-mt-[70px]">
        <div className="max-w-[1160px] mx-auto px-4 md:px-10 pt-5 md:pt-7">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] lg:grid-cols-6 gap-0.5 bg-[var(--rule)]">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTab(tab.id)}
                  className={`text-left p-3.5 md:p-[18px] min-h-12 flex flex-col gap-[3px] ${
                    active ? "bg-[var(--accent)]" : "bg-white"
                  }`}
                >
                  <span
                    className={`text-[20px] md:text-[25px] leading-[1.02] ${active ? "text-white" : "text-[#151515]"}`}
                    style={{ fontFamily: "var(--font-bebas-neue)" }}
                  >
                    {tab.title}
                  </span>
                  <span
                    className={`text-xs leading-[1.35] ${active ? "text-[var(--accent-pale)]" : "text-[var(--muted-light)]"}`}
                  >
                    {tab.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main
        key={activeTab}
        className="tab-fade max-w-[1160px] mx-auto px-4 md:px-10 py-8 md:py-[52px] pb-14 md:pb-[88px] flex flex-col gap-9 md:gap-14"
      >
        {activeTab === "highlights" && (
          <Highlights
            cards={highlights}
            onOpen={(tab) => {
              setTab(tab);
              document.getElementById("stats-tabs")?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        )}

        {activeTab === "rankings" && (
          <>
            {/* Manager Leaderboard */}
            <section>
              <SectionHeading
                description={
                  <>
                    Every manager who has ever played in the league, sorted by total wins. <strong>TTL</strong> is
                    championships.
                  </>
                }
              >
                MANAGER LEADERBOARD
              </SectionHeading>
              <div
                className="grid grid-cols-[22px_minmax(0,1fr)_28px_28px_42px_42px_26px] md:grid-cols-[36px_minmax(0,1fr)_46px_46px_62px_62px_40px] bg-[#151515] text-[#f5f5f0] text-[8px] md:text-[9.5px] font-semibold tracking-[.06em] md:tracking-[.1em]"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                <div className="py-[11px] pl-1.5 md:pl-3">#</div>
                <div className="py-[11px] px-1 md:px-2">MANAGER</div>
                <div className="py-[11px] px-0.5 md:px-1 text-right">W</div>
                <div className="py-[11px] px-0.5 md:px-1 text-right">L</div>
                <div className="py-[11px] px-0.5 md:px-1 text-right">WIN%</div>
                <div className="py-[11px] px-0.5 md:px-1 text-right">PPG</div>
                <div className="py-[11px] pr-1.5 pl-0.5 md:pr-3 md:pl-1 text-right">TTL</div>
              </div>
              <div className="bg-white">
                {leaderboard.map((manager, index) => (
                  <div
                    key={manager.manager}
                    className="grid grid-cols-[22px_minmax(0,1fr)_28px_28px_42px_42px_26px] md:grid-cols-[36px_minmax(0,1fr)_46px_46px_62px_62px_40px] border-b border-[var(--hairline)] items-center text-[11px] md:text-[13.5px]"
                  >
                    <div
                      className="py-[11px] pl-1.5 md:pl-3 text-[15px] md:text-[20px] leading-none"
                      style={{
                        fontFamily: "var(--font-bebas-neue)",
                        color: index < 3 ? "var(--accent)" : "var(--dim)",
                      }}
                    >
                      {index + 1}
                    </div>
                    <div className="py-[11px] px-1 md:px-2 font-semibold text-[#151515] truncate">{manager.manager}</div>
                    <div className="py-[11px] px-0.5 md:px-1 text-right font-semibold text-[#151515]">{manager.totalWins}</div>
                    <div className="py-[11px] px-0.5 md:px-1 text-right text-[var(--muted-light)]">{manager.totalLosses}</div>
                    <div className="py-[11px] px-0.5 md:px-1 text-right font-semibold text-[var(--accent)]">
                      {(manager.winPercentage * 100).toFixed(1)}%
                    </div>
                    <div className="py-[11px] px-0.5 md:px-1 text-right text-[var(--body-text)]">{manager.avgPointsPerGame.toFixed(1)}</div>
                    <div
                      className="py-[11px] pr-1.5 pl-0.5 md:pr-3 md:pl-1 text-right text-[13px] md:text-[19px] leading-none"
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

            {/* Scoring Consistency */}
            <section>
              <SubHeading description="How much each manager's weekly score swings around their own average. A short bar means you can pencil in their score every week; a long bar means big ceilings and ugly floors.">
                SCORING CONSISTENCY
              </SubHeading>
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
                          data-bar=""
                          className="h-[18px] origin-left"
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

            {/* Playoff Performance */}
            <section>
              <SectionHeading
                description={
                  <>
                    Does anyone actually raise their game when it counts? <strong>Clutch</strong> is playoff points
                    per game minus regular-season points per game — positive means they showed up in January,
                    negative means they shrank.
                  </>
                }
              >
                PLAYOFF PERFORMANCE
              </SectionHeading>
              <div
                className="grid grid-cols-[20px_minmax(0,1fr)_36px_36px_36px_36px] md:grid-cols-[36px_minmax(0,1fr)_56px_56px_56px_56px] bg-[#151515] text-[#f5f5f0] text-[8px] md:text-[9.5px] font-semibold tracking-[.06em] md:tracking-[.1em]"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                <div className="py-[11px] pl-1.5 md:pl-3">#</div>
                <div className="py-[11px] px-1 md:px-2">MANAGER</div>
                <div className="py-[11px] px-0.5 md:px-1 text-right">PO W-L</div>
                <div className="py-[11px] px-0.5 md:px-1 text-right">PO PPG</div>
                <div className="py-[11px] px-0.5 md:px-1 text-right">REG PPG</div>
                <div className="py-[11px] pr-1.5 pl-0.5 md:pr-3 md:pl-1 text-right">CLUTCH</div>
              </div>
              <div className="bg-white">
                {playoffStats.map((stats, index) => (
                  <div
                    key={stats.manager}
                    className="grid grid-cols-[20px_minmax(0,1fr)_36px_36px_36px_36px] md:grid-cols-[36px_minmax(0,1fr)_56px_56px_56px_56px] border-b border-[var(--hairline)] items-center text-[10.5px] md:text-[13px]"
                  >
                    <div
                      className="py-[11px] pl-1.5 md:pl-3 text-[14px] md:text-[20px] leading-none"
                      style={{
                        fontFamily: "var(--font-bebas-neue)",
                        color: index < 3 ? "var(--accent)" : "var(--dim)",
                      }}
                    >
                      {index + 1}
                    </div>
                    <div className="py-[11px] px-1 md:px-2 font-semibold text-[#151515] truncate">{stats.manager}</div>
                    <div className="py-[11px] px-0.5 md:px-1 text-right font-semibold text-[#151515]">
                      {stats.playoffWins}-{stats.playoffLosses}
                    </div>
                    <div className="py-[11px] px-0.5 md:px-1 text-right text-[#151515]">{stats.playoffPPG.toFixed(1)}</div>
                    <div className="py-[11px] px-0.5 md:px-1 text-right text-[var(--muted-light)]">{stats.regularPPG.toFixed(1)}</div>
                    <div
                      className="py-[11px] pr-1.5 pl-0.5 md:pr-3 md:pl-1 text-right text-[13px] md:text-[20px] leading-none"
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
          </>
        )}

        {activeTab === "records" && (
          <>
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
                    value: `+${g.margin.toFixed(2)}`,
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

            {/* Head to Head */}
            <section>
              <SectionHeading description="Every pairing's all-time record against each other. The manager in green leads the series.">
                HEAD TO HEAD
              </SectionHeading>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] gap-0.5">
                {h2hRecords.slice(0, 36).map((record, index) => {
                  const m1Winning = record.manager1_wins > record.manager2_wins;
                  const m2Winning = record.manager2_wins > record.manager1_wins;
                  return (
                    <div
                      key={index}
                      className="bg-white border border-[var(--hairline)] flex items-center gap-2.5 py-[11px] px-3.5"
                    >
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
          </>
        )}

        {activeTab === "seasons" && (
          <>
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

            {/* Championship Points */}
            <section>
              <SectionHeading description="Total points scored by the team that won it all, each season.">
                CHAMPIONSHIP POINTS
              </SectionHeading>
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
                          data-bar=""
                          className="h-[22px] bg-[var(--accent)] origin-left"
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
          </>
        )}

        {activeTab === "office" && (
          <>
            <FrontOfficeSections data={frontOffice} />
            <WaiverSections data={frontOffice.waiver} />
          </>
        )}
        {activeTab === "luck" && <LuckSections data={luck} projections={frontOffice.projections} perfect={perfect} />}

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
