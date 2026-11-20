"use client";

import { useEffect } from "react";
import type { GameRoster } from "@/lib/games/rosters";

const MONO = { fontFamily: "var(--font-geist-mono)" };
const BEBAS = { fontFamily: "var(--font-bebas-neue)" };

export function Scoreboard({ items }: { items: [string, string][] }) {
  return (
    <div className="grid bg-[#151515] text-[#f5f5f0] border-b border-[#333]" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map(([k, v]) => (
        <div key={k} className="px-2 py-2 text-center">
          <div className="text-[9.5px] font-semibold tracking-[.14em] text-[#7a7a76]" style={MONO}>
            {k}
          </div>
          <div className="text-[22px] leading-tight truncate" style={BEBAS}>
            {v}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Full-width action button; Space/Enter anywhere on the page also presses it. */
export function BigButton({ onPress, disabled, children }: { onPress: () => void; disabled?: boolean; children: React.ReactNode }) {
  useEffect(() => {
    if (disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.target instanceof HTMLElement && e.target.closest("button, select, input")) return;
      e.preventDefault();
      onPress();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onPress, disabled]);

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      className="w-full min-h-14 bg-[var(--accent)] text-white text-[26px] tracking-[.04em] disabled:opacity-50 active:brightness-90 touch-manipulation"
      style={BEBAS}
    >
      {children}
    </button>
  );
}

export function GameOver({ line, onAgain }: { line: string; onAgain: () => void }) {
  return (
    <div className="bg-[#151515] text-[#f5f5f0] p-4 text-center">
      <div className="text-[13px] font-semibold tracking-[.2em] text-[var(--accent-light)]" style={MONO}>
        GAME OVER
      </div>
      <div className="text-[40px] leading-none mt-1" style={BEBAS}>
        {line}
      </div>
      <button
        type="button"
        onClick={onAgain}
        className="mt-3 w-full min-h-12 bg-white text-[#151515] text-[22px]"
        style={BEBAS}
      >
        PLAY AGAIN
      </button>
    </div>
  );
}

const lastName = (n: string) => n.split(" ").slice(-1)[0].toUpperCase();

/** Header strip: your team (and the opponent's) in team colors, with the roster week. */
export function Matchup({ team, opp, week }: { team: GameRoster; opp?: GameRoster; week: number }) {
  return (
    <div className="flex items-stretch bg-[#151515] text-white border-b border-[#333]">
      <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2" style={{ boxShadow: `inset 4px 0 0 ${team.color}` }}>
        <span className="truncate text-[24px] leading-none" style={BEBAS}>
          {lastName(team.manager)}
        </span>
      </div>
      {opp && (
        <>
          <div className="flex items-center px-2 text-[10px] font-semibold tracking-[.14em] text-[#7a7a76]" style={MONO}>
            VS
          </div>
          <div className="flex-1 min-w-0 flex items-center justify-end gap-2 px-3 py-2" style={{ boxShadow: `inset -4px 0 0 ${opp.color}` }}>
            <span className="truncate text-[24px] leading-none" style={BEBAS}>
              {lastName(opp.manager)}
            </span>
          </div>
        </>
      )}
      <div className="flex items-center px-3 text-[9.5px] font-semibold tracking-[.1em] sm:tracking-[.14em] text-[#7a7a76] border-l border-[#333] whitespace-nowrap" style={MONO}>
        <span className="hidden sm:inline">ROSTERS AS OF&nbsp;</span>WK {week}
      </div>
    </div>
  );
}

/** A player chip: name, fantasy PPG, and a rating bar. */
export function PlayerLine({ label, name, ppg, rating, color }: { label: string; name: string; ppg: number; rating: number; color: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5">
      <span className="w-9 shrink-0 text-[9.5px] font-semibold tracking-[.14em] text-[#7a7a76]" style={MONO}>
        {label}
      </span>
      <span className="flex-1 min-w-0 truncate text-[13px] text-[#f5f5f0]">{name}</span>
      <span className="text-[10.5px] tabular-nums text-[#a3a3a0]" style={MONO}>
        {ppg.toFixed(1)} PPG
      </span>
      <span className="w-14 h-1.5 bg-[#333] shrink-0" aria-label={`rating ${Math.round(rating * 100)}`}>
        <span className="block h-full" style={{ width: `${Math.max(6, rating * 100)}%`, background: color }} />
      </span>
    </div>
  );
}
