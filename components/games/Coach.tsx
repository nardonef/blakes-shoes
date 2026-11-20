"use client";

import { useState } from "react";
import { downLabel, spotLabel } from "@/lib/games/core";
import {
  DEFENSE,
  OFFENSE,
  cpuFourthDown,
  fgDistance,
  fgOdds,
  fieldGoal,
  newCoachGame,
  pick,
  punt,
  runPlay,
  type CoachGame,
  type DefCall,
  type OffCall,
  type Side,
} from "@/lib/games/coach";
import { BigButton, GameOver, Scoreboard } from "./ui";

const MONO = { fontFamily: "var(--font-geist-mono)" };
const BEBAS = { fontFamily: "var(--font-bebas-neue)" };
const lastName = (n: string) => n.split(" ").slice(-1)[0].toUpperCase();

export default function Coach({ manager, opponents, onFinish }: { manager: string; opponents: string[]; onFinish: (score: number) => void }) {
  const [opp, setOpp] = useState<string | null>(null);
  const [game, setGame] = useState<CoachGame>(newCoachGame);
  const [log, setLog] = useState<{ side: Side; text: string }[]>([]);

  function apply(next: CoachGame) {
    const fresh = next.log.slice(0, next.log.length - game.log.length).filter((t) => t !== "FINAL");
    setLog((l) => [...fresh.map((text) => ({ side: game.possession, text })), ...l].slice(0, 8));
    setGame(next);
    if (next.over && !game.over) onFinish(Math.max(-99, Math.min(99, next.you - next.cpu)));
  }

  function start() {
    setOpp(pick(opponents, Math.random));
    setGame(newCoachGame());
    setLog([]);
  }

  if (!opp) {
    return (
      <div className="bg-[#151515] text-[#f5f5f0] p-6 text-center">
        <div className="text-[34px] leading-none" style={BEBAS}>
          {lastName(manager)} VS ???
        </div>
        <p className="text-sm text-[#c9c9c2] mt-2 mb-4">A random league manager takes the other sideline.</p>
        <BigButton onPress={start}>KICKOFF</BigButton>
      </div>
    );
  }

  const g = game;
  const yours = g.possession === "you";
  const fourth = g.drive.down === 4;
  const fg = fgDistance(g.drive.yardLine);
  const cpuDecision = !yours && fourth ? cpuFourthDown(g) : "go";
  const name = (s: Side) => (s === "you" ? lastName(manager) : lastName(opp));

  return (
    <div>
      <Scoreboard
        items={[
          [lastName(manager), String(g.you)],
          [lastName(opp), String(g.cpu)],
          ["BALL", g.over ? "-" : `${name(g.possession)}`],
          ["DOWN", g.over ? "FINAL" : `${downLabel(g.drive)} · ${spotLabel(g.drive.yardLine)}`],
        ]}
      />
      <div className="bg-[#2D5A3D] px-4 py-2 text-[10px] font-semibold tracking-[.08em] text-[#e6efe9]" style={MONO}>
        DRIVES LEFT · {lastName(manager)} {g.left.you} · {lastName(opp)} {g.left.cpu}
      </div>

      {g.over ? (
        <GameOver
          line={`${g.you > g.cpu ? "WIN" : g.you < g.cpu ? "LOSS" : "TIE"} ${g.you}-${g.cpu}`}
          onAgain={() => setOpp(null)}
        />
      ) : yours ? (
        <div className="bg-[#232322] p-3">
          <div className="text-[10.5px] font-semibold tracking-[.14em] text-[#c9c9c2] mb-2" style={MONO}>
            YOUR BALL · CALL A PLAY
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {OFFENSE.map((o) => (
              <CallButton key={o} onClick={() => apply(runPlay(g, o as OffCall, pick(DEFENSE, Math.random), Math.random))}>
                {o}
              </CallButton>
            ))}
            {fourth && <CallButton tone="dark" onClick={() => apply(punt(g))}>PUNT</CallButton>}
            {fourth && fgOdds(fg) > 0 && (
              <CallButton tone="dark" onClick={() => apply(fieldGoal(g, Math.random))}>
                {`${fg}-YD FG (${Math.round(fgOdds(fg) * 100)}%)`}
              </CallButton>
            )}
          </div>
        </div>
      ) : cpuDecision !== "go" ? (
        <div className="bg-[#232322] p-3">
          <div className="text-[10.5px] font-semibold tracking-[.14em] text-[#c9c9c2] mb-2" style={MONO}>
            4TH DOWN · {lastName(opp)} {cpuDecision === "fg" ? `LINES UP FOR A ${fg}-YARD FIELD GOAL` : "PUNTS"}
          </div>
          <BigButton onPress={() => apply(cpuDecision === "fg" ? fieldGoal(g, Math.random) : punt(g))}>CONTINUE</BigButton>
        </div>
      ) : (
        <div className="bg-[#232322] p-3">
          <div className="text-[10.5px] font-semibold tracking-[.14em] text-[#c9c9c2] mb-2" style={MONO}>
            {lastName(opp)} HAS THE BALL · CALL A DEFENSE
          </div>
          <div className="grid grid-cols-3 gap-2">
            {DEFENSE.map((d) => (
              <CallButton key={d} onClick={() => apply(runPlay(g, pick(OFFENSE, Math.random), d as DefCall, Math.random))}>
                {d}
              </CallButton>
            ))}
          </div>
        </div>
      )}

      <ol className="bg-white divide-y divide-[var(--hairline)]" aria-label="Play by play" aria-live="polite">
        {log.map((e, i) => (
          <li key={log.length - i} className={`px-3 py-2 text-sm flex gap-3 ${i === 0 ? "font-semibold" : "text-[var(--body-text)]"}`}>
            <span className="w-20 shrink-0 text-[10.5px] tracking-[.1em] text-[var(--muted-light)] pt-0.5 truncate" style={MONO}>
              {name(e.side)}
            </span>
            <span>{e.text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function CallButton({ onClick, children, tone }: { onClick: () => void; children: React.ReactNode; tone?: "dark" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-12 px-2 text-[19px] leading-tight touch-manipulation active:brightness-90 ${tone === "dark" ? "bg-[#151515] text-[#e8c547] border border-[#555]" : "bg-[var(--accent)] text-white"}`}
      style={BEBAS}
    >
      {children}
    </button>
  );
}
