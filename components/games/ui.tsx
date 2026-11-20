"use client";

import { useEffect } from "react";

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
