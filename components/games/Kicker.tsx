"use client";

import { useEffect, useRef, useState } from "react";
import { KICK_START, KICK_STEP, KICK_STRIKES, kickResult, meter, meterPeriod, rollWind, type KickResult } from "@/lib/games/kicker";
import { Scoreboard, BigButton, GameOver } from "./ui";

type Phase = "aim" | "power" | "flight" | "result" | "over";

export default function Kicker({ onFinish }: { onFinish: (score: number) => void }) {
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
      setResult(kickResult(distance, aim, value, wind));
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
          ["DISTANCE", `${distance} YD`],
          ["WIND", wind === 0 ? "CALM" : `${Math.abs(wind)} ${wind < 0 ? "←" : "→"}`],
          ["LONGEST", longest ? `${longest}` : "-"],
          ["MISSES", `${strikes}/${KICK_STRIKES}`],
        ]}
      />
      <div className="relative bg-[#151515]">
        <svg viewBox="0 0 300 260" className="w-full block select-none" aria-hidden="true">
          <defs>
            <linearGradient id="k-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1d2a22" />
              <stop offset="1" stopColor="#2D5A3D" />
            </linearGradient>
          </defs>
          <rect width="300" height="150" fill="url(#k-sky)" />
          <rect y="150" width="300" height="110" fill="#2D5A3D" />
          {[160, 180, 205, 235].map((y) => (
            <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="#ffffff" strokeOpacity=".25" />
          ))}
          {/* uprights */}
          <g stroke="#e8c547" strokeWidth="4" strokeLinecap="round">
            <line x1="150" x2="150" y1="150" y2="100" />
            <line x1={150 - half} x2={150 + half} y1="100" y2="100" />
            <line x1={150 - half} x2={150 - half} y1="100" y2="20" />
            <line x1={150 + half} x2={150 + half} y1="100" y2="20" />
          </g>
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

      <div className="bg-[#232322] px-4 py-3 space-y-3">
        <Meter label="AIM" value={phase === "aim" ? value : aim} zone={{ center: (1 - (wind / 15) * (distance / 100)) / 2, width: 4.5 / distance }} active={phase === "aim"} />
        <Meter label="POWER" value={phase === "power" ? value : phase === "aim" ? 0 : result?.range ? result.range / 70 : 0} need={distance / 70} active={phase === "power"} />
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
