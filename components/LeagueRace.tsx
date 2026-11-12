"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  closestCall,
  leadersBySeason,
  positionsAt,
  raceHeadline,
  seasonCaption,
  standingsAt,
  type LeagueRace as Race,
} from "@/lib/league-race";

const MONO = { fontFamily: "var(--font-geist-mono)" };
const BEBAS = { fontFamily: "var(--font-bebas-neue)" };
const SEASON_MS = 1150;
const GOLD = "#d4af37";

function Trophy({ pop }: { pop: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className={pop ? "race-pop" : undefined}>
      <path
        fill={GOLD}
        d="M4 1h8v2h2.5v2.2A3.3 3.3 0 0 1 11.6 8.5 4 4 0 0 1 9 10.4V12h2.5v2h-7v-2H7v-1.6A4 4 0 0 1 4.4 8.5 3.3 3.3 0 0 1 1.5 5.2V3H4V1Zm-1 3.5v.7a1.8 1.8 0 0 0 1.1 1.7A6 6 0 0 1 4 5.5v-1H3Zm10 0h-1v1c0 .5 0 1-.1 1.4A1.8 1.8 0 0 0 13 5.2v-.7Z"
      />
    </svg>
  );
}

export default function LeagueRace({ race }: { race: Race }) {
  const last = race.seasons.length - 1;
  const [t, setT] = useState(last); // server and first client render show the final standings
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | null>(null);
  const from = useRef<{ t0: number; at: number } | null>(null);
  const root = useRef<HTMLElement>(null);

  const stop = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    setPlaying(false);
  }, []);

  const play = useCallback(
    (start?: number) => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      const t0 = start ?? 0;
      from.current = { t0, at: performance.now() };
      setT(t0);
      setPlaying(true);
      const tick = (now: number) => {
        const next = from.current!.t0 + (now - from.current!.at) / SEASON_MS;
        if (next >= last) {
          setT(last);
          raf.current = null;
          setPlaying(false);
          return;
        }
        setT(next);
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    },
    [last],
  );

  // Autoplay once, the first time the race is mostly on screen (never with reduced motion).
  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        play(0);
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [play]);

  const yearIndex = Math.min(Math.max(Math.round(t), 0), last);
  const year = race.seasons[yearIndex];
  const rows = standingsAt(race, t);
  const pos = positionsAt(race, t);
  // Rank labels follow on-screen order, so the numbers always read 1-12 top to bottom.
  const shown = new Map(
    [...pos.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])).map(([name], i) => [name, i]),
  );
  const top = Math.max(rows[0].value, 1);
  const leaders = leadersBySeason(race);
  const changeAt = leaders.map((name, i) => i > 0 && name !== leaders[i - 1]);
  const close = closestCall(race);
  const tiedNow = close.gap === 0 && yearIndex === close.index && Math.abs(t - yearIndex) < 0.5;
  const live = year === race.liveSeason;
  const pct = (i: number) => (i / last) * 100;

  return (
    <section
      ref={root}
      aria-labelledby="race-title"
      className="relative overflow-hidden bg-[#151515] text-[#f5f5f0] px-4 md:px-10 pt-2 md:pt-5 pb-10 md:pb-14"
    >
      {/* The year, huge and faint, behind the race */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-.04em] bottom-[-.18em] text-[150px] md:text-[300px] leading-none text-white/[.045] tabular-nums select-none"
        style={BEBAS}
      >
        {year}
      </div>

      <div className="relative max-w-[1160px] mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 pt-6 md:pt-8">
          <div>
            <div className="text-[11px] font-semibold tracking-[.26em] text-[var(--accent-light)] mb-2.5" style={MONO}>
              {race.seasons.length} SEASONS · ALL-TIME WINS
            </div>
            <h1 id="race-title" className="text-[48px] md:text-[88px] leading-[.86]" style={BEBAS}>
              THE WINS RACE
            </h1>
          </div>
          <p className="text-[13px] leading-snug text-[#a3a3a0] max-w-[340px] md:text-right">{raceHeadline(race)}</p>
        </div>

        <p
          aria-live="polite"
          className="mt-4 min-h-[1.5em] text-[13px] md:text-[15px] font-semibold tracking-[.06em] flex items-center gap-2"
          style={MONO}
        >
          {live && (
            <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 text-[10px] tracking-[.14em] bg-[var(--accent)] text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-white motion-safe:animate-pulse" />
              LIVE
            </span>
          )}
          <span className="text-[#d6d6cc]">{seasonCaption(race, year).toUpperCase()}</span>
          {tiedNow && (
            <span key={year} className="race-pop shrink-0 px-1.5 py-0.5 text-[10px] tracking-[.14em] text-[#151515]" style={{ background: GOLD }}>
              TIED FOR THE LEAD
            </span>
          )}
        </p>

        {/* The race. Each row's height is computed from t (positionsAt), so overtakes are one smooth crossing per season. */}
        <ol
          className="relative mt-3 [--row:31px] md:[--row:38px]"
          style={{ height: `calc(${rows.length} * var(--row))` }}
        >
          {rows.map(({ manager, value, titles }) => {
            const rank = shown.get(manager.name)!;
            const champNow = manager.titleYears.includes(year) && Math.abs(t - yearIndex) < 0.5;
            const leader = rank === 0;
            return (
              <li
                key={manager.name}
                className="absolute inset-x-0 top-0 flex items-center gap-1.5 md:gap-2.5"
                style={{ height: "var(--row)", transform: `translateY(calc(${pos.get(manager.name)!.toFixed(3)} * var(--row)))` }}
              >
                <span className="w-4 md:w-5 shrink-0 text-right text-[10px] md:text-[11px] text-[#7a7a76] tabular-nums" style={MONO}>
                  {rank + 1}
                </span>
                <Image
                  src={manager.image}
                  alt=""
                  width={28}
                  height={28}
                  loading="eager"
                  className={`w-[22px] h-[22px] md:w-7 md:h-7 rounded-full object-cover shrink-0 border ${leader ? "border-[var(--accent-light)]" : "border-[#3a3a38]"}`}
                />
                <span className={`w-[62px] md:w-[104px] shrink-0 truncate text-[12px] md:text-[14px] ${leader ? "text-white font-semibold" : "text-[#d6d6cc]"}`}>
                  {manager.short}
                </span>
                <div className="relative flex-1 min-w-0 h-[60%] flex items-center">
                  <div
                    key={champNow ? `${manager.name}-${year}` : manager.name}
                    className={`h-full rounded-r-[3px] ${champNow ? "race-glow" : ""}`}
                    style={{
                      width: `${Math.max((value / top) * 100, value > 0 ? 1.5 : 0)}%`,
                      background: champNow
                        ? `linear-gradient(90deg, #8a6d1f, ${GOLD})`
                        : leader
                          ? "linear-gradient(90deg, var(--accent), var(--accent-light))"
                          : "linear-gradient(90deg, #2c2c2a, #4a4a46)",
                    }}
                  />
                  <span
                    className={`pl-1.5 shrink-0 text-[11px] md:text-[13px] tabular-nums ${leader ? "text-white" : "text-[#a3a3a0]"}`}
                    style={MONO}
                  >
                    {Math.round(value)}
                  </span>
                </div>
                <span className="w-[30px] md:w-[34px] shrink-0 flex gap-0.5" aria-label={titles ? `${titles} title${titles > 1 ? "s" : ""}` : undefined}>
                  {Array.from({ length: titles }, (_, i) => (
                    <Trophy key={i} pop={playing && manager.titleYears[i] === year} />
                  ))}
                </span>
              </li>
            );
          })}
        </ol>

        {/* Controls */}
        <div className="mt-5 flex items-center gap-3 md:gap-4">
          <button
            type="button"
            onClick={() => (playing ? stop() : play(t >= last ? 0 : t))}
            className="shrink-0 w-11 h-11 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white flex items-center justify-center transition-colors"
            aria-label={playing ? "Pause" : t >= last ? "Replay from 2012" : "Play"}
          >
            {playing ? (
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M3 2h3.5v12H3zM9.5 2H13v12H9.5z" /></svg>
            ) : t >= last ? (
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="2" d="M13 8a5 5 0 1 1-1.5-3.6M13 2v3h-3" /></svg>
            ) : (
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M4 2l10 6-10 6z" /></svg>
            )}
          </button>
          <div className="relative flex-1 min-w-0">
            <input
              type="range"
              min={0}
              max={last}
              step={0.01}
              value={t}
              onChange={(e) => {
                stop();
                setT(Number(e.target.value));
              }}
              aria-label="Season"
              aria-valuetext={String(year)}
              className="w-full h-11 cursor-pointer accent-[var(--accent-light)]"
            />
            {/* Lead changes and the closest call, marked on the timeline */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-[8px] top-[34px] h-3">
              {changeAt.map((c, i) =>
                c ? (
                  <span
                    key={i}
                    className="absolute top-0 -translate-x-1/2 w-1 h-2 bg-[var(--accent-light)]"
                    style={{ left: `${pct(i)}%` }}
                  />
                ) : null,
              )}
              <span
                className="absolute top-0 -translate-x-1/2 w-1.5 h-2.5"
                style={{ left: `${pct(close.index)}%`, background: GOLD }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#7a7a76] tabular-nums -mt-1" style={MONO}>
              <span>{race.seasons[0]}</span>
              <span className="hidden sm:inline">
                <span style={{ color: GOLD }}>▮</span> {close.gap === 0 ? "TIED FOR THE LEAD" : "CLOSEST CALL"}
                {changeAt.some(Boolean) && (
                  <>
                    {"  "}
                    <span className="text-[var(--accent-light)]">▮</span> LEAD CHANGE
                  </>
                )}
              </span>
              <span>{race.seasons[last]}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
