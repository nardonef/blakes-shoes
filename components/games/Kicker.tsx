"use client";

import { useEffect, useRef, useState } from "react";
import { KICK_START, KICK_STEP, KICK_STRIKES, kickResult, legRange, meter, meterPeriod, rollWind, type KickResult } from "@/lib/games/kicker";
import type { GameRoster } from "@/lib/games/rosters";
import { Scoreboard, BigButton, GameOver, PlayerLine } from "./ui";

type Phase = "aim" | "power" | "flight" | "result" | "over";

// Static crowd: a deterministic scatter of fans in the stands, some in your team color.
const CROWD = Array.from({ length: 160 }, (_, i) => ({ x: (i * 37) % 300, y: 34 + ((i * 53) % 46), c: i % 5 }));
const lastName = (n: string) => n.split(" ").slice(-1)[0].toUpperCase();

export default function Kicker({ team, onFinish }: { team: GameRoster; onFinish: (score: number) => void }) {
  const leg = legRange(team.k.rating);
  const [distance, setDistance] = useState(KICK_START);
  const [wind, setWind] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [longest, setLongest] = useState(0);
  const [phase, setPhase] = useState<Phase>("aim");
  const [aim, setAim] = useState(0.5);
  const [value, setValue] = useState(0);
  const [result, setResult] = useState<KickResult | null>(null);
  const t0 = useRef(0);

  // Wind is random, so roll it after mount (not during render) to keep hydration stable.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setWind(rollWind(Math.random)), []);

  useEffect(() => {
    if (phase !== "aim" && phase !== "power") return;
    t0.current = performance.now();
    let raf = 0;
    const period = meterPeriod(distance) * (phase === "power" ? 0.8 : 1);
    const tick = (now: number) => {
      setValue(meter((now - t0.current) / 1000, period));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, distance]);

  function tap() {
    if (phase === "aim") {
      setAim(value);
      setPhase("power");
    } else if (phase === "power") {
      setResult(kickResult(distance, aim, value, wind, leg));
      setPhase("flight");
      setTimeout(() => setPhase("result"), 900);
    } else if (phase === "result" && result) {
      if (result.good) {
        setLongest(Math.max(longest, distance));
        setDistance(distance + KICK_STEP);
      } else if (strikes + 1 >= KICK_STRIKES) {
        setStrikes(strikes + 1);
        setPhase("over");
        if (longest > 0) onFinish(longest);
        return;
      } else {
        setStrikes(strikes + 1);
      }
      setWind(rollWind(Math.random));
      setResult(null);
      setPhase("aim");
    }
  }

  function restart() {
    setDistance(KICK_START);
    setStrikes(0);
    setLongest(0);
    setWind(rollWind(Math.random));
    setResult(null);
    setPhase("aim");
  }

  // Perspective: uprights look narrower from farther back.
  const half = Math.min(80, 1500 / distance);
  const ball =
    phase === "flight" || phase === "result"
      ? {
          // lateral == tolerance lands exactly on an upright
          x: 150 + Math.max(-2.2, Math.min(2.2, result!.lateral / result!.tolerance)) * half,
          y: result!.miss === "short" ? 128 : 60,
          s: 0.35,
        }
      : { x: 150, y: 236, s: 1 };

  return (
    <div>
      <Scoreboard
        items={[
          ["KICK", `${distance} YD`],
          ["WIND", wind === 0 ? "CALM" : `${Math.abs(wind)} ${wind < 0 ? "←" : "→"}`],
          ["LONGEST", longest ? `${longest}` : "-"],
          ["MISSES", `${strikes}/${KICK_STRIKES}`],
          ["LEG", `${Math.round(leg)} YD`],
        ]}
      />
      <div className="relative bg-[#151515]">
        <svg viewBox="0 0 300 260" className="w-full block select-none" aria-hidden="true">
          <defs>
            <linearGradient id="k-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b1018" />
              <stop offset="1" stopColor="#1b2633" />
            </linearGradient>
            <radialGradient id="k-light">
              <stop offset="0" stopColor="#fffbe6" stopOpacity=".9" />
              <stop offset="1" stopColor="#fffbe6" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="k-grass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#24502f" />
              <stop offset="1" stopColor="#3a7a49" />
            </linearGradient>
          </defs>
          <rect width="300" height="150" fill="url(#k-sky)" />
          {[30, 270].map((x) => (
            <g key={x}>
              <circle cx={x} cy="14" r="26" fill="url(#k-light)" />
              <rect x={x - 9} y="10" width="18" height="7" rx="1.5" fill="#fffbe6" />
            </g>
          ))}
          {/* stands */}
          <rect y="30" width="300" height="56" fill="#141a22" />
          {CROWD.map((f, i) => (
            <rect key={i} x={f.x} y={f.y} width="3" height="3.5" rx="1" fill={f.c === 0 ? team.color : ["", "#6b7280", "#9ca3af", "#4b5563", "#d1d5db"][f.c]} opacity=".85" />
          ))}
          <rect y="84" width="300" height="5" fill={team.color} />
          {/* field in perspective, with the end zone in your colors */}
          <polygon points="0,260 300,260 300,150 0,150" fill="url(#k-grass)" />
          <rect y="89" width="300" height="61" fill="#2a5a37" />
          <rect y="150" width="300" height="22" fill={team.color} opacity=".85" />
          <text x="150" y="166" textAnchor="middle" fill="#fff" fillOpacity=".9" fontSize="15" letterSpacing="3" style={{ fontFamily: "var(--font-bebas-neue)" }}>
            {lastName(team.manager)}
          </text>
          {[180, 196, 216, 242].map((y, i) => (
            <rect key={y} y={y} width="300" height={8 + i * 4} fill="#ffffff" opacity=".05" />
          ))}
          {[172, 180, 196, 216, 242].map((y) => (
            <line key={`l${y}`} x1="0" x2="300" y1={y} y2={y} stroke="#ffffff" strokeOpacity=".35" />
          ))}
          {/* uprights, with a shadow on the grass */}
          <g stroke="#000" strokeOpacity=".25" strokeWidth="4" strokeLinecap="round">
            <line x1="152" x2="168" y1="150" y2="160" />
          </g>
          <g stroke="#f2c230" strokeWidth="4" strokeLinecap="round">
            <line x1="150" x2="150" y1="150" y2="100" />
            <line x1={150 - half} x2={150 + half} y1="100" y2="100" />
            <line x1={150 - half} x2={150 - half} y1="100" y2="18" />
            <line x1={150 + half} x2={150 + half} y1="100" y2="18" />
          </g>
          {/* ball's arc once it's away */}
          {phase === "result" && (
            <path
              d={`M150 236 Q ${(150 + ball.x) / 2} ${result!.miss === "short" ? 60 : -10} ${ball.x} ${ball.y}`}
              fill="none"
              stroke="#fff"
              strokeOpacity=".45"
              strokeWidth="2"
              strokeDasharray="4 5"
            />
          )}
          <g
            style={{
              transform: `translate(${ball.x}px, ${ball.y}px) scale(${ball.s})`,
              transition: phase === "flight" ? "transform .9s cubic-bezier(.3,.6,.4,1)" : "none",
            }}
          >
            <ellipse rx="10" ry="15" fill="#8a4b26" stroke="#3a1f0f" strokeWidth="1.5" />
            <line x1="0" x2="0" y1="-7" y2="7" stroke="#fff" strokeWidth="1.5" />
          </g>
        </svg>
        {phase === "result" && result && (
          <div className="absolute inset-x-0 top-3 text-center">
            <span
              className={`inline-block px-3 py-1 text-[34px] leading-none text-white ${result.good ? "bg-[var(--accent)]" : "bg-[var(--negative)]"}`}
              style={{ fontFamily: "var(--font-bebas-neue)" }}
            >
              {result.good ? `${distance} YD: IT'S GOOD` : `NO GOOD: ${result.miss!.toUpperCase()}`}
            </span>
          </div>
        )}
      </div>

      <div className="bg-[#232322] border-b border-[#333]">
        <PlayerLine label="K" name={team.k.name} ppg={team.k.ppg} rating={team.k.rating} color={team.color} />
      </div>
      <div className="bg-[#232322] px-4 py-3 space-y-3">
        <Meter label="AIM" value={phase === "aim" ? value : aim} zone={{ center: (1 - (wind / 15) * (distance / 100)) / 2, width: 4.5 / distance }} active={phase === "aim"} />
        <Meter label="POWER" value={phase === "power" ? value : phase === "aim" ? 0 : result?.range ? result.range / leg : 0} need={distance / leg} active={phase === "power"} />
      </div>

      {phase === "over" ? (
        <GameOver line={`LONGEST: ${longest} YD`} onAgain={restart} />
      ) : (
        <BigButton onPress={tap} disabled={phase === "flight"}>
          {phase === "aim" ? "LOCK AIM" : phase === "power" ? "KICK" : phase === "flight" ? "..." : "NEXT KICK"}
        </BigButton>
      )}
    </div>
  );
}

/** zone: the aim window that splits the uprights, in meter units (shifted into the wind). */
function Meter({ label, value, zone, need, active }: { label: string; value: number; zone?: { center: number; width: number }; need?: number; active: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`w-14 text-[10.5px] font-semibold tracking-[.14em] ${active ? "text-white" : "text-[#7a7a76]"}`} style={{ fontFamily: "var(--font-geist-mono)" }}>
        {label}
      </span>
      <div className="relative flex-1 h-4 bg-[#151515]">
        {zone && (
          <div className="absolute inset-y-0 bg-[var(--accent)]" style={{ left: `${(zone.center - zone.width / 2) * 100}%`, width: `${zone.width * 100}%` }} />
        )}
        {need !== undefined && <div className="absolute inset-y-0 bg-[#e8c547] w-[2px]" style={{ left: `${Math.min(100, need * 100)}%` }} />}
        {zone ? (
          <div className="absolute inset-y-[-3px] w-[4px] bg-white" style={{ left: `calc(${value * 100}% - 2px)` }} />
        ) : (
          <div className="absolute inset-y-0 left-0 bg-[var(--accent-light)]" style={{ width: `${value * 100}%` }} />
        )}
      </div>
    </div>
  );
}
