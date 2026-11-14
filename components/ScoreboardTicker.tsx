"use client";

import { useEffect, useRef } from "react";
import type { Scoreboard } from "@/lib/scoreboard";

const AMBER = "#ffb21a";
const DOT = { fontFamily: "var(--font-dot), var(--font-geist-mono), monospace" };

/**
 * A stadium scoreboard band: the latest complete week's results scrolling in amber dot-matrix
 * lettering, with a fixed "WEEK N · FINAL" label. The list is rendered twice and slides by half its
 * width for a seamless loop; hovering pauses it. With reduced motion it stays still and scrolls by hand.
 */
export default function ScoreboardTicker({ board }: { board: Scoreboard }) {
  const track = useRef<HTMLDivElement>(null);
  const anim = useRef<Animation | null>(null);

  useEffect(() => {
    const el = track.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const pxPerSec = 55;
    anim.current = el.animate([{ transform: "translateX(0)" }, { transform: "translateX(-50%)" }], {
      duration: ((el.scrollWidth / 2) / pxPerSec) * 1000,
      iterations: Infinity,
    });
    return () => anim.current?.cancel();
  }, [board]);

  const items = (copy: number) =>
    board.games.map((s, i) => (
      <span key={`${copy}-${i}`} aria-hidden={copy === 1 || undefined} className="inline-flex items-center gap-2.5 px-6 whitespace-nowrap">
        <span>{s.winner}</span>
        <span className="text-white" style={{ textShadow: "0 0 6px rgb(255 255 255 / 0.6)" }}>
          {s.winnerScore}
        </span>
        <span className="opacity-60">{s.tied ? "TIE" : "DEF"}</span>
        <span className="opacity-80">{s.loser}</span>
        <span className="opacity-80">{s.loserScore}</span>
        <span className="pl-4 opacity-40" aria-hidden="true">
          ✦
        </span>
      </span>
    ));

  return (
    <section
      aria-label={`${board.season} ${board.label.toLowerCase()} scores`}
      className="relative flex items-stretch bg-[#0b0b0a] border-b border-[#262624] text-[15px] md:text-[17px] font-bold tracking-[.08em]"
      style={{ ...DOT, color: AMBER, textShadow: `0 0 6px ${AMBER}99` }}
    >
      <div className="shrink-0 z-10 flex items-center px-3 md:px-5 bg-[#151515] border-r border-[#3a3a38] text-[11px] md:text-[12px] text-[var(--accent-light)]" style={{ textShadow: "none" }}>
        {board.label}
      </div>
      <div
        className="relative flex-1 min-w-0 overflow-x-auto motion-safe:overflow-hidden [scrollbar-width:none] [background:radial-gradient(rgb(255_178_26/0.07)_1px,transparent_1.4px)_0_0/5px_5px]"
        onMouseEnter={() => anim.current?.pause()}
        onMouseLeave={() => anim.current?.play()}
      >
        <div ref={track} className="flex w-max py-2.5">
          {items(0)}
          {items(1)}
        </div>
      </div>
    </section>
  );
}
