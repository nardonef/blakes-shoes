"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  gradeColor,
  historyManagers,
  managerHistory,
  managerSlug,
  shortName,
  topBusts,
  topRuns,
  topSteals,
  type BoardPick,
  type DraftModel,
  type DraftSeason,
  type SlotStats,
} from "@/lib/draft-board-view";
import { playerHref } from "@/lib/player-slug";

const MONO = { fontFamily: "var(--font-geist-mono)" };
const BEBAS = { fontFamily: "var(--font-bebas-neue)" };

const POS: Record<string, { bg: string; fg: string }> = {
  RB: { bg: "#e4eee6", fg: "#2D5A3D" },
  WR: { bg: "#f3ead9", fg: "#8a5a14" },
  QB: { bg: "#f2e1dc", fg: "#a3412f" },
  TE: { bg: "#e3e8ee", fg: "#3f5670" },
  K: { bg: "#efeee8", fg: "#6b6b63" },
  DEF: { bg: "#efeee8", fg: "#6b6b63" },
  "": { bg: "#fff", fg: "#8a8a80" },
};
const posStyle = (pos: string) => POS[pos] ?? POS[""];

const f1 = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ord = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const sgn = (v: number | null) => (v == null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v)}`);
const valueBg = (p: BoardPick) =>
  p.value == null ? "#fff" : p.steal ? "#cfe3d4" : p.bust ? "#f0d6cf" : p.value >= 24 ? "#e9f1eb" : p.value <= -48 ? "#f8ece8" : "#fff";
const plainMgr = (m: string) => m.replace(" (unknown manager)", "");

type Tab = "board" | "steals" | "history" | "slots";

export default function DraftClient({ model }: { model: DraftModel }) {
  return (
    <Suspense fallback={null}>
      <DraftContent model={model} />
    </Suspense>
  );
}

function DraftContent({ model }: { model: DraftModel }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const tabParam = sp.get("tab");
  const tab: Tab = tabParam === "steals" || tabParam === "history" || tabParam === "slots" ? tabParam : "board";
  const years = model.seasons.map((s) => s.year);

  /** Replace some params (null deletes), keeping the rest. */
  function setParams(next: Record<string, string | null>, opts: { push?: boolean } = {}) {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v == null) params.delete(k);
      else params.set(k, v);
    }
    const url = `${pathname}?${params}`;
    if (opts.push) {
      router.push(url);
      window.scrollTo({ top: 0 });
    } else {
      router.replace(url, { scroll: false });
    }
  }

  const goBoard = (season: number, pick: number | null, mgr: string | null) =>
    setParams(
      { tab: null, season: String(season), pick: pick == null ? null : String(pick), mgr: mgr ? managerSlug(mgr) : null, color: null },
      { push: true },
    );

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header className="bg-[#151515] text-[#f5f5f0] px-4 md:px-10 pt-8 md:pt-[52px]">
        <div className="max-w-[1160px] mx-auto">
          <div className="text-[11px] tracking-[.14em] text-[var(--accent-light)] mb-2.5" style={MONO}>
            DRAFT ARCHIVE · {years[years.length - 1]}–{years[0]}
          </div>
          <h1 className="text-[clamp(44px,7vw,76px)] leading-[.92] mb-3 tracking-[.01em]" style={BEBAS}>
            The draft
          </h1>
          <p className="mb-7 max-w-[580px] text-[15px] leading-normal text-[#b5b5ad]">
            Every pick from {years.length} snake drafts: who went where, what they scored for the team that took them,
            and which picks aged well.
          </p>
          <div className="flex gap-1 flex-wrap">
            {[
              { id: "board", label: "DRAFT BOARD", desc: "Every pick, round by round" },
              { id: "steals", label: "STEALS & BUSTS", desc: "The best and worst value picks" },
              { id: "history", label: "BY MANAGER", desc: "One manager's drafts, every year" },
              { id: "slots", label: "DRAFT SLOTS", desc: "Does where you pick in round 1 matter?" },
            ].map((t) => (
              <Link
                key={t.id}
                href={t.id === "board" ? "/draft" : `/draft?tab=${t.id}`}
                scroll={false}
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

      {tab === "board" && <Board model={model} sp={sp} setParams={setParams} />}
      {tab === "steals" && <Steals model={model} season={sp.get("season")} setParams={setParams} goBoard={goBoard} />}
      {tab === "history" && <History model={model} mgrSlug={sp.get("mgr")} setParams={setParams} goBoard={goBoard} />}
      {tab === "slots" && <Slots stats={model.slotStats} />}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold tracking-[.12em] text-[#6b6b63]" style={MONO}>
      {children}
    </span>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 px-3 border border-[#d6d6cc] bg-white text-[15px] font-semibold text-[#151515] w-full"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

type SetParams = (next: Record<string, string | null>, opts?: { push?: boolean }) => void;

function Board({ model, sp, setParams }: { model: DraftModel; sp: URLSearchParams; setParams: SetParams }) {
  const years = model.seasons.map((s) => s.year);
  const S: DraftSeason = model.seasons.find((s) => String(s.year) === sp.get("season")) ?? model.seasons[0];
  const mode = sp.get("color") === "value" ? "value" : "pos";
  const selPick = Number(sp.get("pick")) || null;
  const focusMgr = S.slots.find((m) => managerSlug(m) === sp.get("mgr")) ?? null;
  // Run chips are local state, keyed by season so a new season clears them.
  const [runKey, setRunKey] = useState<string | null>(null);
  const run = S.runs.find((r) => `${S.year}:${r.from}` === runKey) ?? null;

  const grid = new Map(S.picks.map((p) => [`${p.round}|${p.slot}`, p]));
  const totals = new Map(S.totals.map((t) => [t.manager, t]));
  const sel = S.picks.find((p) => p.pick === selPick);

  const legend =
    mode === "pos"
      ? ["QB", "RB", "WR", "TE", "K"].map((k) => ({ label: k === "K" ? "K / DEF" : k, bg: POS[k].bg, border: POS[k].bg }))
      : [
          { label: "Steal", bg: "#cfe3d4" },
          { label: "Beat slot", bg: "#e9f1eb" },
          { label: "Near slot", bg: "#fff" },
          { label: "Well below", bg: "#f8ece8" },
          { label: "Bust", bg: "#f0d6cf" },
        ].map((l) => ({ ...l, border: "#d6d6cc" }));

  return (
    <main className="max-w-[1520px] mx-auto px-4 md:px-10 pt-7 pb-16 flex flex-col gap-4">
      <div className="flex flex-wrap gap-x-5 gap-y-3 items-end justify-between">
        <div className="flex flex-wrap gap-x-5 gap-y-3 items-end">
          <label className="flex flex-col gap-1.5 w-[130px]">
            <Label>SEASON</Label>
            <Select
              value={String(S.year)}
              onChange={(v) => {
                setRunKey(null);
                setParams({ season: v, pick: null, mgr: null });
              }}
              options={years.map((y) => ({ value: String(y), label: String(y) }))}
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <Label>COLOR BY</Label>
            <div className="flex border border-[#d6d6cc] bg-white h-11">
              {[
                { id: "pos", label: "Position" },
                { id: "value", label: "Value" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={mode === m.id}
                  onClick={() => setParams({ color: m.id === "value" ? "value" : null })}
                  className={`px-4 text-[14px] font-semibold ${mode === m.id ? "bg-[#151515] text-white" : "bg-white text-[#151515]"}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 items-center">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-[12px] text-[#4a4a44]">
              <span className="w-3.5 h-3.5 border" style={{ background: l.bg, borderColor: l.border }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {S.runs.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="mr-1">
            <Label>POSITION RUNS</Label>
          </span>
          {topRuns(S.runs).map((r) => {
            const key = `${S.year}:${r.from}`;
            const on = runKey === key;
            const pc = posStyle(r.pos);
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setRunKey(on ? null : key);
                  if (focusMgr) setParams({ mgr: null });
                }}
                className="h-[34px] px-3 border text-[13px] font-semibold flex items-center gap-1.5"
                style={{ background: on ? "#151515" : pc.bg, color: on ? "#fff" : pc.fg, borderColor: on ? "#151515" : pc.bg }}
              >
                {r.len} straight {r.pos}s<span className="font-normal opacity-75">picks {r.from}–{r.to}</span>
              </button>
            );
          })}
        </div>
      )}

      <PickDetail season={S} pick={sel} />

      <div className="overflow-x-auto border border-[#e2e2da] bg-white">
        <div
          className="grid [--cw:104px] min-[760px]:[--cw:112px] grid-cols-[48px_repeat(var(--n),minmax(var(--cw),1fr))] min-w-[calc(48px+var(--n)*var(--cw))]"
          style={{ "--n": S.n } as React.CSSProperties}
        >
          <div
            className="sticky left-0 z-[2] bg-[#fafaf6] border-b border-[#d6d6cc] border-r border-r-[#e2e2da] px-2 py-2.5 text-[10px] font-semibold tracking-[.1em] text-[#6b6b63] flex items-end"
            style={MONO}
          >
            RD
          </div>
          {S.slots.map((m) => {
            const t = totals.get(m)!;
            const unknown = m.endsWith("(unknown manager)");
            return (
              <div
                key={m}
                title={`${m} · ${t.team} · ${ord(t.rank)} in draft points`}
                className="bg-[#fafaf6] border-b border-[#d6d6cc] border-r border-r-[#efefe8] px-2.5 pt-2.5 pb-[9px] flex flex-col gap-1 min-w-0"
              >
                <span
                  className={`text-[13px] font-bold truncate ${unknown ? "text-[#6b6b63] italic" : "text-[#151515]"}`}
                >
                  {shortName(m)}
                </span>
                <div className="flex items-baseline justify-between gap-1.5">
                  <span className="text-[26px] leading-none" style={{ ...BEBAS, color: gradeColor(t.grade) }}>
                    {t.grade}
                  </span>
                  <span className="text-[11px] text-[#6b6b63] tabular-nums">{Math.round(t.pts).toLocaleString("en-US")} pts</span>
                </div>
              </div>
            );
          })}
          {Array.from({ length: S.rounds }, (_, i) => i + 1).map((round) => (
            <div key={round} className="contents">
              <div className="sticky left-0 z-[1] bg-[#fafaf6] border-r border-[#e2e2da] border-b border-b-[#efefe8] p-2 flex flex-col justify-center items-center gap-0.5">
                <span className="text-[15px] font-bold tabular-nums">{round}</span>
                <span className="text-[12px] text-[#8a8a80]" aria-hidden="true">
                  {round % 2 ? "→" : "←"}
                </span>
              </div>
              {S.slots.map((m, j) => {
                const p = grid.get(`${round}|${j + 1}`);
                if (!p) return <div key={m} className="bg-[#fafaf6] border-r border-b border-[#efefe8]" />;
                const pc = posStyle(p.pos);
                const inRun = run != null && p.pick >= run.from && p.pick <= run.to;
                const dim = (run != null && !inRun) || (focusMgr != null && p.manager !== focusMgr);
                const tag =
                  mode === "value"
                    ? p.steal ? "STEAL" : p.bust ? "BUST" : p.value != null ? sgn(p.value) : ""
                    : p.kind === "kept" ? "" : p.short;
                const tagFg =
                  mode === "value"
                    ? (p.value ?? 0) > 0 ? "#2D5A3D" : (p.value ?? 0) < 0 ? "#a3412f" : "#6b6b63"
                    : p.kind === "traded" ? "#8a5a14" : "#a3412f";
                const selected = selPick === p.pick;
                return (
                  <button
                    key={m}
                    type="button"
                    title={`${p.label} · ${p.player} · ${p.manager}`}
                    aria-pressed={selected}
                    onClick={() => setParams({ pick: selected ? null : String(p.pick) })}
                    className="text-left border-r border-b border-[#efefe8] px-[9px] pt-[7px] pb-2 min-h-[74px] flex flex-col justify-between gap-[3px] min-w-0"
                    style={{
                      background: mode === "pos" ? pc.bg : valueBg(p),
                      opacity: dim ? 0.28 : 1,
                      outline: selected ? "2px solid #151515" : inRun ? "2px solid #8a5a14" : "none",
                      outlineOffset: -2,
                    }}
                  >
                    <span className="flex justify-between gap-1 text-[10px] font-semibold tracking-[.04em]" style={MONO}>
                      <span className="text-[#8a8a80]">{p.label}</span>
                      <span style={{ color: pc.fg }}>{p.posFull || "?"}</span>
                    </span>
                    <span
                      className="text-[13px] font-semibold leading-[1.2] line-clamp-2"
                      style={{ color: p.kind === "dropped" && mode === "pos" ? "#6b6b63" : "#151515" }}
                    >
                      {p.player}
                    </span>
                    <span className="flex justify-between gap-1 text-[11px] tabular-nums">
                      <span className="font-semibold text-[#151515]">{f1(p.pts)}</span>
                      <span className="text-[9px] font-semibold tracking-[.06em]" style={{ ...MONO, color: tagFg }}>
                        {tag}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="m-0 text-[13px] text-[#6b6b63] max-w-[760px]">
        Points are what the player scored in the drafting team&apos;s starting lineup.{" "}
        <strong className="text-[#151515]">Grade</strong> ranks each team by the total points its own picks scored for it
        that season. <strong className="text-[#151515]">Finished</strong> ranks drafted QBs, RBs, WRs and TEs by how far
        they outscored a typical starter at their position each week, so a QB&apos;s big raw totals don&apos;t count
        extra; kickers and defenses aren&apos;t rated. <strong className="text-[#151515]">Steal</strong>: finished top 60
        and at least 60 spots above where he was taken. <strong className="text-[#151515]">Bust</strong>: a round 1–4 pick
        who finished 100th or worse.
      </p>
    </main>
  );
}

function PickDetail({ season, pick: p }: { season: DraftSeason; pick: BoardPick | undefined }) {
  if (!p) {
    return (
      <section className="bg-white border border-[#e2e2da] px-4 md:px-6 py-4 flex items-center min-h-[84px]">
        <p className="m-0 text-[14px] text-[#6b6b63]">Pick any square on the board to see how that pick turned out.</p>
      </section>
    );
  }
  const facts = [
    {
      k: "FOR HIS TEAM",
      v: `${f1(p.pts)} pts`,
      sub: `${p.starts} start${p.starts === 1 ? "" : "s"} · ${p.weeks} wk${p.weeks === 1 ? "" : "s"} rostered`,
      fg: "#151515",
    },
    {
      k: "FINISHED",
      v: p.finish ? ord(p.finish) : "—",
      sub: p.finish ? `of ${season.rated} QB/RB/WR/TE` : p.pos === "K" || p.pos === "DEF" ? "K and DEF aren't rated" : "Not rated",
      fg: "#151515",
    },
    {
      k: "VALUE VS SLOT",
      v: sgn(p.value),
      sub:
        p.value == null ? "Not rated"
        : p.steal ? "Steal" : p.bust ? "Bust" : p.value > 0 ? "Beat his slot" : p.value < 0 ? "Below his slot" : "",
      fg: (p.value ?? 0) > 0 ? "#2D5A3D" : (p.value ?? 0) < 0 ? "#a3412f" : "#151515",
    },
    {
      k: "OUTCOME",
      v: p.kind === "kept" ? "Kept" : p.kind === "traded" ? "Traded" : p.kind === "dropped" ? "Dropped" : "Unknown",
      sub: p.kind === "kept" ? "all season" : p.detail,
      fg: p.kind === "kept" ? "#151515" : p.kind === "traded" ? "#8a5a14" : "#a3412f",
    },
  ];
  return (
    <section className="bg-white border border-[#e2e2da] px-4 md:px-6 py-4 flex flex-wrap gap-x-8 gap-y-3.5 items-center min-h-[84px]">
      <div className="flex flex-col gap-[3px] min-w-[200px] flex-[1_1_240px]">
        <Label>
          {season.year} · ROUND {p.round} · PICK {p.pick} · {p.posFull || "POS UNKNOWN"}
        </Label>
        {p.player.startsWith("Unknown player") ? (
          <span className="text-[34px] leading-none tracking-[.01em]" style={BEBAS}>
            {p.player}
          </span>
        ) : (
          <Link
            href={playerHref(p.player)}
            className="text-[34px] leading-none tracking-[.01em] text-[#151515] hover:text-[var(--accent)]"
            style={BEBAS}
          >
            {p.player}
          </Link>
        )}
        <span className="text-[13px] text-[#4a4a44]">
          Drafted by {plainMgr(p.manager)}
          {p.unknownMgr ? " (manager unknown)" : ""} · {p.team}
        </span>
      </div>
      {facts.map((f) => (
        <div key={f.k} className="flex flex-col gap-0.5 min-w-24">
          <span className="text-[10px] font-semibold tracking-[.12em] text-[#6b6b63]" style={MONO}>
            {f.k}
          </span>
          <span className="text-[17px] font-bold tabular-nums" style={{ color: f.fg }}>
            {f.v}
          </span>
          <span className="text-[12px] text-[#6b6b63]">{f.sub}</span>
        </div>
      ))}
    </section>
  );
}

function Steals({
  model,
  season,
  setParams,
  goBoard,
}: {
  model: DraftModel;
  season: string | null;
  setParams: SetParams;
  goBoard: (season: number, pick: number | null, mgr: string | null) => void;
}) {
  const years = model.seasons.map((s) => s.year);
  const value = years.map(String).includes(season ?? "") ? season! : "all";
  const pool = value === "all" ? model.seasons : model.seasons.filter((s) => String(s.year) === value);
  const lists = [
    { title: "Steals", sub: "LATE PICKS THAT HIT", fg: "#2D5A3D", rows: topSteals(pool) },
    { title: "Busts", sub: "EARLY PICKS THAT MISSED", fg: "#a3412f", rows: topBusts(pool) },
  ];
  return (
    <main className="max-w-[1160px] mx-auto px-4 md:px-10 pt-7 pb-16 flex flex-col gap-5">
      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1.5 w-40">
          <Label>SEASON</Label>
          <Select
            value={value}
            onChange={(v) => setParams({ season: v === "all" ? null : v })}
            options={[{ value: "all", label: "All seasons" }, ...years.map((y) => ({ value: String(y), label: String(y) }))]}
          />
        </label>
        <p className="m-0 mb-1 text-[13px] text-[#6b6b63] max-w-[560px] flex-[1_1_300px]">
          Value = where he was picked minus where he finished among that year&apos;s drafted QBs, RBs, WRs and TEs, ranked
          by points above a typical starter at their position. Kickers and defenses aren&apos;t rated. Busts only count
          rounds 1–5, where the misses hurt.
        </p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-5">
        {lists.map((L) => (
          <section key={L.title} className="bg-white border border-[#e2e2da]">
            <div className="px-4 md:px-[22px] pt-4 pb-3 border-b border-[#e2e2da] flex justify-between items-baseline gap-3">
              <span className="text-[30px] leading-none" style={{ ...BEBAS, color: L.fg }}>
                {L.title}
              </span>
              <span className="text-[10px] font-semibold tracking-[.12em] text-[#6b6b63]" style={MONO}>
                {L.sub}
              </span>
            </div>
            {L.rows.map((p, i) => (
              <button
                key={`${p.season}-${p.pick}`}
                type="button"
                onClick={() => goBoard(p.season, p.pick, null)}
                className="w-full border-b border-[#efefe8] bg-white text-left grid grid-cols-[28px_minmax(0,1fr)_auto] gap-3 items-center px-4 md:px-[22px] py-[11px]"
              >
                <span className="text-[13px] font-semibold text-[#8a8a80] tabular-nums">{i + 1}</span>
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[15px] font-semibold text-[#151515]">
                    {p.player}{" "}
                    <span className="text-[10px] font-semibold" style={{ ...MONO, color: posStyle(p.pos).fg }}>
                      {p.posFull}
                    </span>
                  </span>
                  <span className="text-[12px] text-[#6b6b63]">
                    Rd {p.round}, pick {p.pick} → finished {ord(p.finish!)} · {plainMgr(p.manager)}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-px">
                  <span className="text-[17px] font-bold tabular-nums" style={{ color: L.fg }}>
                    {sgn(p.value)}
                  </span>
                  <span className="text-[11px] text-[#8a8a80]">{p.season}</span>
                </span>
              </button>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}

function Slots({ stats }: { stats: SlotStats[] }) {
  const seasons = stats[0]?.seasons ?? 0;
  const reliable = [...stats].sort((a, b) => b.playoffs - a.playoffs || a.avgFinish - b.avgFinish)[0];
  const mostTitles = Math.max(...stats.map((s) => s.titles.length));
  const titleSlots = stats.filter((s) => s.titles.length === mostTitles);
  const finishes = stats.map((s) => s.avgFinish);
  const best = Math.min(...finishes);
  const worst = Math.max(...finishes);
  const toughest = stats.find((s) => s.avgFinish === worst)!;
  const takeaways = [
    {
      label: "MOST RELIABLE",
      value: `Slot ${reliable.slot}`,
      note: `${reliable.playoffs} of ${seasons} playoffs, average finish ${f1(reliable.avgFinish)}`,
    },
    {
      label: "MOST TITLES",
      value: `Slot${titleSlots.length > 1 ? "s" : ""} ${titleSlots.map((s) => s.slot).join(" & ")}`,
      note: `${mostTitles} title${mostTitles === 1 ? "" : "s"}${titleSlots.length > 1 ? " each" : ""}, from ${titleSlots
        .map((s) => s.playoffs)
        .join(" and ")} playoff trips`,
    },
    {
      label: "TOUGHEST",
      value: `Slot ${toughest.slot}`,
      note: `Average finish ${f1(toughest.avgFinish)}, ${toughest.titles.length ? `${toughest.titles.length} title${toughest.titles.length === 1 ? "" : "s"}` : "no titles"}`,
    },
  ];
  return (
    <main className="max-w-[1160px] mx-auto px-4 md:px-10 pt-7 pb-16 flex flex-col gap-5">
      <p className="m-0 text-[13px] text-[#6b6b63] max-w-[680px]">
        How the team picking from each round-1 slot finished, over the {seasons} completed seasons. A playoff trip is a
        top-8 finish in 2012–13 and top 6 since.
      </p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-3">
        {takeaways.map((t) => (
          <div key={t.label} className="bg-white border border-[#e2e2da] px-4 py-3.5 flex flex-col gap-1">
            <Label>{t.label}</Label>
            <span className="text-[30px] leading-none text-[#151515]" style={BEBAS}>
              {t.value}
            </span>
            <span className="text-[13px] text-[#4a4a44]">{t.note}</span>
          </div>
        ))}
      </div>
      <section className="bg-white border border-[#e2e2da]">
        <div
          className="grid grid-cols-[52px_minmax(0,1fr)_56px] md:grid-cols-[72px_140px_120px_minmax(0,1fr)] gap-3 px-4 md:px-[22px] py-2.5 border-b border-[#e2e2da] text-[10px] font-semibold tracking-[.12em] text-[#6b6b63]"
          style={MONO}
        >
          <span>SLOT</span>
          <span>
            PLAYOFF TRIPS<span className="md:hidden"> · TITLES</span>
          </span>
          <span className="hidden md:block md:order-last">TITLES</span>
          <span className="text-right md:text-left">AVG FINISH</span>
        </div>
        {stats.map((s) => (
          <div
            key={s.slot}
            className="grid grid-cols-[52px_minmax(0,1fr)_56px] md:grid-cols-[72px_140px_120px_minmax(0,1fr)] gap-x-3 gap-y-1 items-center px-4 md:px-[22px] py-3 border-b border-[#efefe8] last:border-b-0"
          >
            <span className="text-[26px] leading-none text-[#151515]" style={BEBAS}>
              {s.slot}
            </span>
            <div className="flex flex-col gap-1 min-w-0 md:contents">
              <span className="text-[15px] text-[#4a4a44] whitespace-nowrap tabular-nums">
                <strong className="text-[#151515]">{s.playoffs}</strong> of {s.seasons}
              </span>
              <span className="text-[12px] md:text-[13px] text-[#4a4a44] min-w-0 md:order-last">
                {s.titles.length ? (
                  <>
                    <strong className="text-[#151515]">
                      {s.titles.length} title{s.titles.length === 1 ? "" : "s"}
                    </strong>
                    <span className="text-[#6b6b63]">
                      {" "}
                      · {s.titles.map((t) => `${t.year} ${shortName(t.manager)}`).join(", ")}
                    </span>
                  </>
                ) : (
                  <span className="text-[#8a8a80]">No titles</span>
                )}
              </span>
            </div>
            <span
              className="text-right md:text-left text-[17px] font-bold tabular-nums"
              style={{ color: s.avgFinish === best ? "#2D5A3D" : s.avgFinish === worst ? "#a3412f" : "#151515" }}
            >
              {f1(s.avgFinish)}
            </span>
          </div>
        ))}
      </section>
      <p className="m-0 text-[13px] text-[#6b6b63] max-w-[680px]">
        Average finish is the final standing, 1st through 12th; green is the best slot, red the worst. Every slot&apos;s
        manager changes year to year, so this measures the pick position, not the people.
      </p>
    </main>
  );
}

function History({
  model,
  mgrSlug,
  setParams,
  goBoard,
}: {
  model: DraftModel;
  mgrSlug: string | null;
  setParams: SetParams;
  goBoard: (season: number, pick: number | null, mgr: string | null) => void;
}) {
  const mgrs = historyManagers(model.seasons);
  const mgr =
    mgrs.find((m) => managerSlug(m) === mgrSlug) ?? (mgrs.includes("Blake Kozloski") ? "Blake Kozloski" : mgrs[0]);
  const h = managerHistory(model.seasons, mgr);
  const photo = model.photos[mgr] ?? "/placeholder-owner.svg";
  const cols =
    "grid-cols-[52px_40px_minmax(0,1fr)_64px] min-[760px]:grid-cols-[64px_56px_minmax(0,1.2fr)_minmax(0,1.2fr)_90px]";
  const facts = [
    {
      k: "DRAFTS",
      v: String(h.years.length),
      sub: `${h.years[h.years.length - 1]?.year}–${h.years[0]?.year}`,
      fg: "#151515",
    },
    {
      k: "AVERAGE GRADE",
      v: h.avgGrade,
      sub: `${h.aRange} A-range draft${h.aRange === 1 ? "" : "s"}`,
      fg: gradeColor(h.avgGrade),
    },
    ...(h.bestEver
      ? [
          {
            k: "BEST PICK EVER",
            v: h.bestEver.player,
            sub: `${h.bestEver.season} · Rd ${h.bestEver.round} → ${ord(h.bestEver.finish!)}`,
            fg: "#2D5A3D",
          },
        ]
      : []),
  ];

  return (
    <main className="max-w-[1160px] mx-auto px-4 md:px-10 pt-7 pb-16 flex flex-col gap-5">
      <label className="flex flex-col gap-1.5 max-w-[320px]">
        <Label>MANAGER</Label>
        <Select
          value={managerSlug(mgr)}
          onChange={(v) => setParams({ mgr: v })}
          options={mgrs.map((m) => ({ value: managerSlug(m), label: m }))}
        />
      </label>
      <section className="bg-white border border-[#e2e2da]">
        <div className="px-4 md:px-6 py-5 border-b border-[#e2e2da] flex flex-wrap gap-x-8 gap-y-4 items-center justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="w-14 h-14 flex-none bg-[#e2e2da] bg-cover bg-center"
              style={{ backgroundImage: `url("${photo}")` }}
              role="img"
              aria-label={mgr}
            />
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[11px] tracking-[.12em] text-[#6b6b63]" style={MONO}>
                DRAFT HISTORY
              </span>
              <span className="text-[clamp(30px,4vw,40px)] leading-none" style={BEBAS}>
                {mgr}
              </span>
            </div>
          </div>
          <div className="flex gap-7 flex-wrap">
            {facts.map((f) => (
              <div key={f.k} className="flex flex-col gap-0.5 max-w-[220px]">
                <span className="text-[10px] tracking-[.12em] text-[#6b6b63]" style={MONO}>
                  {f.k}
                </span>
                <span className="text-[18px] font-bold" style={{ color: f.fg }}>
                  {f.v}
                </span>
                <span className="text-[12px] text-[#6b6b63]">{f.sub}</span>
              </div>
            ))}
          </div>
        </div>
        <div
          className={`grid ${cols} gap-3 px-4 md:px-6 pt-3 pb-2 text-[10px] font-semibold tracking-[.12em] text-[#6b6b63] border-b border-[#e2e2da]`}
          style={MONO}
        >
          <span>YEAR</span>
          <span>GRADE</span>
          <span>FIRST-ROUND PICK</span>
          <span className="hidden min-[760px]:block">BEST VALUE PICK</span>
          <span className="text-right">DRAFT PTS</span>
        </div>
        {h.years.map((y) => (
          <button
            key={y.year}
            type="button"
            onClick={() => goBoard(y.year, null, mgr)}
            className={`w-full border-b border-[#efefe8] bg-white text-left grid ${cols} gap-3 items-center px-4 md:px-6 py-[11px]`}
          >
            <span className="flex flex-col gap-px">
              <span className="text-[15px] font-bold text-[#151515] tabular-nums">{y.year}</span>
              <span className="text-[11px] text-[#8a8a80]">Slot {y.slot}</span>
            </span>
            <span className="text-[26px] leading-none" style={{ ...BEBAS, color: gradeColor(y.grade) }}>
              {y.grade}
            </span>
            <span className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[14px] font-semibold text-[#151515]">{y.first?.player ?? "—"}</span>
              <span className="text-[12px]" style={{ color: y.first?.bust ? "#a3412f" : "#6b6b63" }}>
                {y.first?.finish ? `finished ${ord(y.first.finish)}${y.first.bust ? " · bust" : ""}` : ""}
              </span>
            </span>
            <span className="hidden min-[760px]:flex flex-col gap-0.5 min-w-0">
              <span className="text-[14px] font-semibold text-[#151515]">{y.best?.player ?? "—"}</span>
              <span className="text-[12px] text-[var(--accent)]">
                {y.best ? `Rd ${y.best.round} → ${ord(y.best.finish!)} · ${sgn(y.best.value)}` : ""}
              </span>
            </span>
            <span className="text-right text-[15px] font-bold text-[#151515] tabular-nums">
              {Math.round(y.pts).toLocaleString("en-US")}
            </span>
          </button>
        ))}
      </section>
      <p className="m-0 text-[13px] text-[#6b6b63]">Pick a year to open that draft board with this manager&apos;s column.</p>
    </main>
  );
}
