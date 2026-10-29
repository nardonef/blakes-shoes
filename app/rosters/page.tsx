import Link from "next/link";
import RostersSelect from "@/components/RostersSelect";
import {
  defaultManager,
  getAllTrades,
  getRosterSeasons,
  getSeasonModel,
  getTeamView,
  managerSlug,
  type AcqKind,
  type RosterRow,
  type TeamView,
  type Trade,
} from "@/lib/rosters-data";
import { getLiveSeason } from "@/lib/season-status";

export const metadata = { title: "Rosters | Blake's Shoes" };

const MONO = { fontFamily: "var(--font-geist-mono)" };
const BEBAS = { fontFamily: "var(--font-bebas-neue)" };
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const f1 = (n: number | null) =>
  n == null ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ord = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const acqColor = (k: AcqKind) => (k === "trade" ? "#8a5a14" : k === "draft" ? "#6b6b63" : "var(--accent)");
const acqText = (r: RosterRow) => r.acq.label + (r.acq.week ? ` · wk ${r.acq.week}` : "");
const tradeHref = (id: string) => `/rosters?tab=trades&trade=${id}#${id}`;
const teamHref = (season: number, mgr: string, week?: number) =>
  `/rosters?season=${season}&mgr=${managerSlug(mgr)}${week ? `&week=${week}` : ""}`;

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function RostersPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const tab = one(sp.tab) === "trades" ? "trades" : "teams";

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header className="bg-[#151515] text-[#f5f5f0] px-4 md:px-10 pt-8 md:pt-[52px]">
        <div className="max-w-[1160px] mx-auto">
          <div className="text-[11px] tracking-[.14em] text-[var(--accent-light)] mb-2.5" style={MONO}>
            ROSTER ARCHIVE
          </div>
          <h1 className="text-[clamp(44px,7vw,76px)] leading-[.92] mb-3 tracking-[.01em]" style={BEBAS}>
            Rosters &amp; trades
          </h1>
          <p className="mb-7 max-w-[560px] text-[15px] leading-normal text-[#b5b5ad]">
            The team each manager finished the year with, how it changed week to week, and every trade in league
            history.
          </p>
          <div className="flex gap-1 flex-wrap">
            {[
              { id: "teams", href: "/rosters", label: "TEAMS", desc: "Any manager's roster, final or week by week" },
              { id: "trades", href: "/rosters?tab=trades", label: "TRADE LOG", desc: "Every trade, and who came out ahead" },
            ].map((t) => (
              <Link
                key={t.id}
                href={t.href}
                className={`flex flex-col gap-[3px] px-5 pt-3.5 pb-[13px] min-w-[150px] flex-[1_1_150px] max-w-[260px] ${
                  tab === t.id ? "bg-[#f5f5f0] text-[#151515]" : "bg-[#262624] text-[#d6d6cc] hover:text-white"
                }`}
              >
                <span className="text-[11px] font-semibold tracking-[.12em]" style={MONO}>
                  {t.label}
                </span>
                <span className="text-[13px] opacity-80">{t.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </header>

      {tab === "teams" ? <TeamsTab sp={sp} /> : <TradesTab sp={sp} />}
    </div>
  );
}

function TeamsTab({ sp }: { sp: Params }) {
  const seasons = getRosterSeasons();
  const requested = Number(one(sp.season));
  const season = seasons.includes(requested) ? requested : seasons[0];
  const S = getSeasonModel(season)!;
  const mgr = S.managers.find((m) => managerSlug(m) === one(sp.mgr)) ?? defaultManager(S);
  const weekParam = Number(one(sp.week));
  const v = getTeamView(S, mgr, Number.isInteger(weekParam) && weekParam > 0 ? weekParam : null);
  const last = v.weeks[v.weeks.length - 1];
  const prevWeek = v.isFinal ? last - 1 : Math.max(v.weeks[0], v.week - 1);
  const nextWeek = v.isFinal || v.week + 1 >= last ? undefined : v.week + 1;

  const inProgress = getLiveSeason()?.season === season;
  const facts = v.standing
    ? [
        { k: inProgress ? "CURRENT" : "FINISHED", v: ord(v.standing.final_rank) },
        { k: "RECORD", v: `${v.standing.wins}–${v.standing.losses}${v.standing.ties ? `–${v.standing.ties}` : ""}` },
        { k: "POINTS FOR", v: f1(v.standing.points_for) },
      ]
    : [];

  return (
    <main className="max-w-[1160px] mx-auto px-4 md:px-10 pt-7 pb-16 flex flex-col gap-5">
      <div className="flex flex-wrap gap-3 items-end">
        <RostersSelect
          label="MANAGER"
          param="mgr"
          value={managerSlug(mgr)}
          options={S.managers.map((m) => ({ value: managerSlug(m), label: m }))}
          resets={["week"]}
          className="flex-[1_1_220px] max-w-[320px]"
        />
        <RostersSelect
          label="SEASON"
          param="season"
          value={String(season)}
          options={seasons.map((y) => ({ value: String(y), label: String(y) }))}
          resets={["week"]}
          className="flex-[0_1_130px]"
        />
      </div>

      <section className="bg-white border border-[#e2e2da]">
        <div className="px-4 md:px-6 pt-5 pb-[18px] flex flex-wrap justify-between items-end gap-x-6 gap-y-3 border-b border-[#e2e2da]">
          <div className="min-w-0">
            <div className="text-[11px] tracking-[.12em] text-[#6b6b63] mb-1" style={MONO}>
              {mgr.toUpperCase()} · {season}
            </div>
            <div className="text-[clamp(32px,4.4vw,44px)] leading-[.95] tracking-[.01em] [overflow-wrap:anywhere]" style={BEBAS}>
              {v.team}
            </div>
          </div>
          <div className="flex gap-6 flex-wrap">
            {facts.map((f) => (
              <div key={f.k} className="flex flex-col gap-0.5">
                <span className="text-[10px] tracking-[.12em] text-[#6b6b63]" style={MONO}>
                  {f.k}
                </span>
                <span className="text-[18px] font-bold tabular-nums">{f.v}</span>
              </div>
            ))}
          </div>
        </div>

        <WeekScrubber v={v} season={season} mgr={mgr} prevWeek={prevWeek} nextWeek={nextWeek} inProgress={inProgress} />

        <div className="grid grid-cols-1 min-[1000px]:grid-cols-3">
          <div className="min-w-0 min-[1000px]:col-span-2">
            {v.groups.map((g) => (
              <RosterGroup key={g.title} title={g.title} rows={g.rows} v={v} />
            ))}
          </div>
          <MovesPanel v={v} season={season} />
        </div>
      </section>
    </main>
  );
}

function WeekScrubber({
  v,
  season,
  mgr,
  prevWeek,
  nextWeek,
  inProgress,
}: {
  v: TeamView;
  season: number;
  mgr: string;
  prevWeek: number;
  nextWeek?: number;
  inProgress: boolean;
}) {
  const g = v.game;
  const resultColor = g?.result === "W" ? "var(--accent)" : g?.result === "L" ? "#a3412f" : "#6b6b63";
  const arrow = "w-11 h-9 border border-[#d6d6cc] bg-white text-base text-[#151515] flex items-center justify-center";
  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-3 bg-[#fafaf6] border-b border-[#e2e2da]">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <span className="text-[11px] font-semibold tracking-[.12em] text-[#6b6b63]" style={MONO}>
          ROSTER AS OF
        </span>
        <div className="flex gap-1.5">
          <Link href={teamHref(season, mgr, prevWeek)} aria-label="Previous week" className={arrow} scroll={false}>
            ‹
          </Link>
          <Link href={teamHref(season, mgr, nextWeek)} aria-label="Next week" className={arrow} scroll={false}>
            ›
          </Link>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {v.weeks.map((wk) => {
          const on = !v.isFinal && wk === v.week;
          const playoff = wk >= v.playoffStart;
          return (
            <Link
              key={wk}
              href={teamHref(season, mgr, wk)}
              scroll={false}
              title={playoff ? `Week ${wk} · playoffs` : `Week ${wk}`}
              aria-current={on ? "page" : undefined}
              className={`min-w-[38px] h-9 px-2 flex items-center justify-center border text-[12px] font-semibold tracking-[.06em] tabular-nums ${
                on ? "bg-[#151515] text-white border-[#151515]" : `${playoff ? "bg-[#eef3ef]" : "bg-white"} text-[#151515] border-[#d6d6cc]`
              }`}
              style={MONO}
            >
              {wk}
            </Link>
          );
        })}
        <Link
          href={teamHref(season, mgr)}
          scroll={false}
          title={inProgress ? "Latest roster" : "End-of-season roster"}
          aria-current={v.isFinal ? "page" : undefined}
          className={`min-w-16 h-9 px-2 flex items-center justify-center border border-[var(--accent)] text-[12px] font-semibold tracking-[.06em] ${
            v.isFinal ? "bg-[var(--accent)] text-white" : "bg-white text-[var(--accent)]"
          }`}
          style={MONO}
        >
          {inProgress ? "LATEST" : "FINAL"}
        </Link>
      </div>
      <div className="text-[14px] text-[#151515] flex gap-2 items-baseline flex-wrap">
        <strong className="font-bold">
          {v.isFinal
            ? `${inProgress ? "Latest" : "Final"} roster · after week ${v.week}`
            : `Week ${v.week}${v.week >= v.playoffStart ? " · Playoffs" : ""}`}
        </strong>
        {g && (
          <span className="font-semibold tabular-nums" style={{ color: resultColor }}>
            {g.result} {f1(g.points)}–{f1(g.opponentPoints)} vs {g.opponent}
          </span>
        )}
      </div>
    </div>
  );
}

function RosterGroup({ title, rows, v }: { title: string; rows: RosterRow[]; v: TeamView }) {
  const cols = v.isFinal
    ? "grid-cols-[44px_minmax(0,1fr)_84px] min-[760px]:grid-cols-[52px_minmax(0,1fr)_170px_120px]"
    : "grid-cols-[44px_minmax(0,1fr)_84px] min-[760px]:grid-cols-[52px_minmax(0,1fr)_170px_76px_120px]";
  return (
    <div>
      <div
        className={`grid ${cols} gap-3 px-4 md:px-6 pt-3.5 pb-2 text-[10px] font-semibold tracking-[.12em] text-[#6b6b63] border-b border-[#e2e2da]`}
        style={MONO}
      >
        <span className="col-span-2">{title}</span>
        <span className="hidden min-[760px]:block">ACQUIRED</span>
        <span className="text-right">{v.isFinal ? "PTS STARTED" : `WK ${v.week} PTS`}</span>
        {!v.isFinal && <span className="hidden min-[760px]:block text-right">SEASON · FOR TEAM</span>}
      </div>
      {rows.map((r) => {
        const meta = [r.pos, r.nfl ? r.nfl.toUpperCase() : ""].filter(Boolean).join(" · ");
        return (
          <div
            key={r.player}
            className={`grid ${cols} gap-3 items-center px-4 md:px-6 py-2.5 border-b border-[#efefe8] ${r.isNew ? "bg-[#f1f6f2]" : "bg-white"}`}
          >
            <span
              className={`text-[11px] font-semibold tracking-[.04em] ${r.started ? "text-[#151515]" : "text-[#8a8a80]"}`}
              style={MONO}
            >
              {r.slot}
            </span>
            <div className="min-w-0 flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[15px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap">{r.player}</span>
                {r.isNew && (
                  <span className="text-[10px] font-semibold tracking-[.08em] text-[var(--accent)]" style={MONO}>
                    NEW
                  </span>
                )}
              </div>
              <span className="text-[12px] text-[#6b6b63]">
                {meta || "—"}
                <span className="min-[760px]:hidden"> · {acqText(r)}</span>
              </span>
            </div>
            <span className="hidden min-[760px]:block text-[13px] font-medium" style={{ color: acqColor(r.acq.kind) }}>
              {acqText(r)}
            </span>
            <div className="text-right flex flex-col gap-px">
              <span
                className={`text-[15px] font-bold tabular-nums ${!v.isFinal && !r.started ? "text-[#8a8a80]" : "text-[#151515]"}`}
              >
                {v.isFinal ? f1(r.season.pts) : f1(r.points)}
              </span>
              <span className="text-[11px] text-[#8a8a80] tabular-nums">
                {v.isFinal
                  ? `${r.season.starts} of ${plural(r.season.weeks, "wk")} started`
                  : r.projected != null
                    ? `proj ${f1(r.projected)}`
                    : ""}
              </span>
            </div>
            {!v.isFinal && (
              <div className="hidden min-[760px]:flex text-right flex-col gap-px">
                <span className="text-[14px] font-semibold tabular-nums">{f1(r.season.pts)}</span>
                <span className="text-[11px] text-[#8a8a80]">{plural(r.season.starts, "start")}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MoveItem({ player, sub, tradeId }: { player: string; sub: string; tradeId?: string }) {
  return (
    <div className="flex justify-between items-baseline gap-2.5 pb-2 border-b border-[#efefe8]">
      <div className="min-w-0 flex flex-col gap-0.5">
        <span className="text-[14px] font-semibold">{player}</span>
        <span className="text-[12px] text-[#6b6b63]">{sub}</span>
      </div>
      {tradeId && (
        <Link href={tradeHref(tradeId)} className="text-[12px] font-semibold text-[var(--accent)] whitespace-nowrap">
          View trade →
        </Link>
      )}
    </div>
  );
}

function MoveGroup({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] font-semibold tracking-[.12em]" style={{ ...MONO, color }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function MovesPanel({ v, season }: { v: TeamView; season: number }) {
  const ins = v.changes?.ins ?? [];
  const outs = v.changes?.outs ?? [];
  return (
    <aside className="min-w-0 bg-white px-4 md:px-6 pt-[18px] pb-6 flex flex-col gap-[18px] border-t border-[#e2e2da] min-[1000px]:border-t-0 min-[1000px]:border-l">
      <div className="text-[11px] font-semibold tracking-[.12em] text-[#6b6b63]" style={MONO}>
        {v.isFinal ? `${season} SEASON MOVES` : `CHANGES SINCE WEEK ${v.week - 1}`}
      </div>
      {v.final && (
        <>
          {v.final.trades.length > 0 && (
            <MoveGroup title={`TRADES · ${v.final.trades.length}`} color="#8a5a14">
              {v.final.trades.map((t) => (
                <MoveItem key={t.tradeId} player={t.players} sub={`Week ${t.week} · from ${t.from}`} tradeId={t.tradeId} />
              ))}
            </MoveGroup>
          )}
          <MoveGroup title="PICKUPS" color="var(--accent)">
            <MoveItem
              player={plural(v.final.adds, "add")}
              sub={v.final.faab ? `$${v.final.faab} FAAB spent` : "No FAAB spent"}
            />
          </MoveGroup>
        </>
      )}
      {v.changes && !ins.length && !outs.length && (
        <p className="m-0 text-[14px] text-[#6b6b63]">
          {v.week === v.weeks[0] ? "Opening-week roster." : "No roster changes this week."}
        </p>
      )}
      {ins.length > 0 && (
        <MoveGroup title={`IN · ${ins.length}`} color="var(--accent)">
          {ins.map((m) => (
            <MoveItem key={m.player} player={m.player} sub={m.label} tradeId={m.tradeId} />
          ))}
        </MoveGroup>
      )}
      {outs.length > 0 && (
        <MoveGroup title={`OUT · ${outs.length}`} color="#a3412f">
          {outs.map((m) => (
            <MoveItem key={m.player} player={m.player} sub={m.label} tradeId={m.tradeId} />
          ))}
        </MoveGroup>
      )}
    </aside>
  );
}

function TradesTab({ sp }: { sp: Params }) {
  const seasons = getRosterSeasons();
  const all = getAllTrades();
  const managers = [...new Set(all.flatMap((t) => t.sides.map((s) => s.mgr)))].sort();
  const season = seasons.map(String).includes(one(sp.season) ?? "") ? one(sp.season)! : "all";
  const mgrSlug = managers.some((m) => managerSlug(m) === one(sp.mgr)) ? one(sp.mgr)! : "all";
  const focus = one(sp.trade);
  const list = all.filter(
    (t) =>
      (season === "all" || t.season === Number(season)) &&
      (mgrSlug === "all" || t.sides.some((s) => managerSlug(s.mgr) === mgrSlug)),
  );

  return (
    <main className="max-w-[1160px] mx-auto px-4 md:px-10 pt-7 pb-16 flex flex-col gap-4">
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-wrap gap-3 flex-[1_1_420px] max-w-[520px]">
          <RostersSelect
            label="SEASON"
            param="season"
            value={season}
            options={[{ value: "all", label: "All seasons" }, ...seasons.map((y) => ({ value: String(y), label: String(y) }))]}
            resets={["trade"]}
            className="flex-[0_1_150px]"
          />
          <RostersSelect
            label="MANAGER"
            param="mgr"
            value={mgrSlug}
            options={[{ value: "all", label: "All managers" }, ...managers.map((m) => ({ value: managerSlug(m), label: m }))]}
            resets={["trade"]}
            className="flex-[1_1_200px]"
          />
        </div>
        <span className="text-[11px] tracking-[.12em] text-[#6b6b63]" style={MONO}>
          {list.length} TRADE{list.length === 1 ? "" : "S"}
        </span>
      </div>
      <p className="m-0 text-[13px] text-[#6b6b63] max-w-[640px]">
        Points are what each side&apos;s new players scored in their new team&apos;s starting lineup for the rest of that
        season. More points = won the trade.
      </p>
      {list.map((t) => (
        <TradeCard key={t.id} t={t} focused={t.id === focus} />
      ))}
      {!list.length && <p className="m-0 py-8 text-[14px] text-[#6b6b63]">No trades match these filters.</p>}
    </main>
  );
}

function TradeCard({ t, focused }: { t: Trade; focused: boolean }) {
  const [, month, day] = t.date.slice(0, 10).split("-").map(Number);
  return (
    <article
      id={t.id}
      className={`scroll-mt-[124px] md:scroll-mt-[90px] bg-white border ${focused ? "border-[var(--accent)] shadow-[0_0_0_2px_var(--accent)]" : "border-[#e2e2da]"}`}
    >
      <div
        className="px-4 md:px-6 py-3 border-b border-[#e2e2da] flex justify-between gap-3 flex-wrap text-[11px] font-semibold tracking-[.12em] text-[#6b6b63]"
        style={MONO}
      >
        <span>
          WEEK {t.week} · {MONTHS[month - 1]} {day}
        </span>
        <span>{t.season}</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))]">
        {t.sides.map((s) => (
          <div
            key={s.mgr}
            className={`px-4 md:px-6 pt-4 pb-[18px] flex flex-col gap-2.5 border-r border-b border-[#efefe8] ${s.won ? "bg-[#f1f6f2]" : "bg-white"}`}
          >
            <div className="flex justify-between items-baseline gap-3">
              <Link href={teamHref(t.season, s.mgr, t.week)} className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[16px] font-bold text-[#151515]">{s.mgr}</span>
                <span className="text-[12px] text-[var(--accent)] font-medium">{s.team} · see roster →</span>
              </Link>
              <div className="text-right flex flex-col gap-0.5 shrink-0">
                <span className="text-[18px] font-bold tabular-nums">{f1(s.total)}</span>
                <span
                  className={`text-[10px] font-semibold tracking-[.1em] ${s.won ? "text-[var(--accent)]" : "text-[#8a8a80]"}`}
                  style={MONO}
                >
                  {s.won ? "WON THE TRADE" : "PTS AFTER TRADE"}
                </span>
              </div>
            </div>
            <div className="text-[10px] font-semibold tracking-[.12em] text-[#6b6b63]" style={MONO}>
              RECEIVED
            </div>
            {s.gets.map((g) => (
              <div key={g.player} className="flex justify-between gap-3 text-[14px]">
                <span className="min-w-0">
                  <strong className="font-semibold">{g.player}</strong>{" "}
                  <span className="text-[#6b6b63] text-[12px]">
                    {[g.pos, g.nfl ? g.nfl.toUpperCase() : ""].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="tabular-nums text-[#151515] whitespace-nowrap">
                  {f1(g.pts)} · {g.starts} st
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </article>
  );
}
