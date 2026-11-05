"use client";

import { useState } from "react";
import type { Movement, TeamPath } from "@/lib/tier-lists-data";

const MONO = { fontFamily: "var(--font-geist-mono)" };
const ROW = 32; // px per rank
const STRIP = 18; // px header strip above each tier
const PAD = 8; // % inset of first/last week column inside the plot

const xPct = (w: number, n: number) => PAD + (w * (100 - 2 * PAD)) / Math.max(n - 1, 1);

function pathD(ranks: number[], yPx: (rank: number) => number) {
  const n = ranks.length;
  return ranks
    .map((r, w) => {
      const x = xPct(w, n);
      const y = yPx(r);
      if (w === 0) return `M${x},${y}`;
      const px = xPct(w - 1, n);
      const mid = (px + x) / 2;
      return `C${mid},${yPx(ranks[w - 1])} ${mid},${y} ${x},${y}`;
    })
    .join(" ");
}

function change(t: TeamPath) {
  const d = t.ranks[0] - t.ranks[t.ranks.length - 1];
  return d > 0 ? `▲${d}` : d < 0 ? `▼${-d}` : "–";
}

export default function TierMovement({ data }: { data: Movement }) {
  const { weeks, tierNames, teams } = data;
  const [active, setActive] = useState<string | null>(null);
  const byStartRank = [...teams].sort((a, b) => a.ranks[0] - b.ranks[0]);
  const perTier = teams.length / Math.max(tierNames.length, 1);
  const bandH = perTier * ROW + STRIP;
  const height = tierNames.length * bandH;
  const yPx = (rank: number) => Math.floor((rank - 1) / perTier) * STRIP + STRIP + (rank - 0.5) * ROW;
  const rowTop = (rank: number) => yPx(rank) - ROW / 2;
  const current = teams.find((t) => t.team === active);

  const rowProps = (team: string) => ({
    onMouseEnter: () => setActive(team),
    onFocus: () => setActive(team),
    onClick: () => setActive((a) => (a === team ? null : team)),
    "aria-pressed": active === team,
  });
  const dim = (team: string) => (active && active !== team ? "opacity-35" : "");

  return (
    <div className="bg-white p-3 md:p-5">
      <p className="text-sm min-h-[2.6em] leading-[1.3] text-[var(--body-text)]" aria-live="polite">
        {current ? (
          <>
            <b className="font-semibold text-[#151515]">{current.team}</b>:{" "}
            {current.ranks.map((r, i) => `#${r} ${current.tiers[i]}`).join(" → ")}
          </>
        ) : (
          <span className="text-[var(--muted-light)]">Tap or hover a team to trace its path.</span>
        )}
      </p>

      <div
        className="mt-2 grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1.35fr)] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] gap-x-2 text-[10px] font-semibold tracking-[.14em] text-[var(--muted-light)]"
        style={MONO}
      >
        <div className="text-right truncate">
          <span className="sm:hidden">{weeks[0]?.replace("Week ", "W")}</span>
          <span className="hidden sm:inline">{weeks[0]?.toUpperCase()}</span>
        </div>
        <div className="relative h-4">
          {weeks.slice(1, -1).map((w, i) => (
            <span
              key={w}
              className="absolute -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${xPct(i + 1, weeks.length)}%` }}
            >
              <span className="sm:hidden">{w.replace("Week ", "W")}</span>
              <span className="hidden sm:inline">{w.toUpperCase()}</span>
            </span>
          ))}
        </div>
        <div>{weeks.at(-1)?.toUpperCase()}</div>
      </div>

      <div
        className="relative mt-1.5 grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1.35fr)] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] gap-x-2"
        onMouseLeave={() => setActive(null)}
      >
        {/* Tier bands, by position */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {tierNames.map((name, i) => (
            <div
              key={name}
              className={`absolute inset-x-0 ${i % 2 ? "" : "bg-[#f3f3ee]"} ${i ? "border-t border-[var(--rule)]" : ""}`}
              style={{ top: i * bandH, height: bandH }}
            />
          ))}
        </div>

        {/* Left: starting rank (names from sm up) */}
        <ol className="relative" style={{ height }}>
          {byStartRank.map((t) => (
            <li key={t.team} className={`absolute inset-x-0 transition-opacity ${dim(t.team)}`} style={{ top: rowTop(t.ranks[0]), height: ROW }}>
              <button
                type="button"
                {...rowProps(t.team)}
                className="w-full h-full flex items-center justify-end gap-1.5 text-right text-[12px] leading-[1.15]"
              >
                <span className="hidden sm:block truncate">{t.team}</span>
                <span className="w-5 shrink-0 text-[var(--muted-light)] tabular-nums" style={MONO}>
                  {t.ranks[0]}
                </span>
              </button>
            </li>
          ))}
        </ol>

        {/* Plot */}
        <div className="relative" style={{ height }}>
          <svg
            className="absolute inset-0 w-full h-full overflow-visible"
            viewBox={`0 0 100 ${height}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={`Rank movement across ${weeks.join(", ")}. Full numbers in the table below.`}
          >
            {teams.map((t) => {
              const on = active === t.team;
              return (
                <g key={t.team} className="cursor-pointer" onMouseEnter={() => setActive(t.team)} onClick={() => setActive(on ? null : t.team)}>
                  <path d={pathD(t.ranks, yPx)} fill="none" stroke="transparent" strokeWidth={14} vectorEffect="non-scaling-stroke" />
                  <path
                    d={pathD(t.ranks, yPx)}
                    fill="none"
                    stroke={on ? "var(--accent)" : "#b4b4ac"}
                    strokeWidth={on ? 3 : 2}
                    strokeOpacity={active && !on ? 0.3 : 1}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            })}
          </svg>
          {/* Dots in HTML so they stay round while the SVG stretches */}
          {teams.flatMap((t) =>
            t.ranks.map((r, w) => {
              const on = active === t.team;
              return (
                <span
                  key={`${t.team}-${w}`}
                  aria-hidden="true"
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white pointer-events-none flex items-center justify-center ${
                    on ? "w-[22px] h-[22px] bg-[var(--accent)] text-white z-10" : `w-[10px] h-[10px] bg-[#8f8f88] ${active ? "opacity-30" : ""}`
                  }`}
                  style={{ left: `${xPct(w, t.ranks.length)}%`, top: yPx(r) }}
                >
                  {on && (
                    <span className="text-[10px] font-semibold tabular-nums" style={MONO}>
                      {r}
                    </span>
                  )}
                </span>
              );
            }),
          )}
        </div>

        {/* Right: latest rank, name, change since the first list */}
        <ol className="relative" style={{ height }}>
          {tierNames.map((name, i) => (
            <li
              key={name}
              aria-hidden="true"
              className="absolute left-0 text-[9px] font-semibold tracking-[.16em] text-[var(--muted-light)] whitespace-nowrap leading-none"
              style={{ ...MONO, top: i * bandH + 5 }}
            >
              {name.toUpperCase()}
            </li>
          ))}
          {teams.map((t) => (
            <li key={t.team} className={`absolute inset-x-0 transition-opacity ${dim(t.team)}`} style={{ top: rowTop(t.ranks.at(-1)!), height: ROW }}>
              <button
                type="button"
                {...rowProps(t.team)}
                className="w-full h-full flex items-center gap-1.5 text-left text-[12px] leading-[1.15]"
              >
                <span className="w-4 shrink-0 text-[var(--muted-light)] tabular-nums" style={MONO}>
                  {t.ranks.at(-1)}
                </span>
                <span className={`min-w-0 line-clamp-2 ${active === t.team ? "font-semibold" : ""}`}>{t.team}</span>
                <span className="ml-auto shrink-0 text-[10.5px] text-[var(--muted-light)] tabular-nums" style={MONO}>
                  {change(t)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer min-h-11 flex items-center text-[11px] font-semibold tracking-[.14em] text-[var(--accent)]" style={MONO}>
          TABLE VIEW
        </summary>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="text-[10px] tracking-[.12em] text-[var(--muted-light)]" style={MONO}>
              <tr>
                <th className="py-1.5 pr-2 font-semibold">TEAM</th>
                {weeks.map((w) => (
                  <th key={w} className="py-1.5 px-1 font-semibold text-right">{w.replace("Week ", "WK ")}</th>
                ))}
                <th className="py-1.5 pl-2 font-semibold text-right">CHG</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.team} className="border-t border-[var(--hairline)]">
                  <td className="py-1.5 pr-2">{t.team}</td>
                  {t.ranks.map((r, i) => (
                    <td key={i} className="py-1.5 px-1 text-right tabular-nums" title={t.tiers[i]}>{r}</td>
                  ))}
                  <td className="py-1.5 pl-2 text-right tabular-nums">{change(t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
