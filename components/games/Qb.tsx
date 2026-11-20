"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { dist, FIELD_WIDTH, type Vec } from "@/lib/games/core";
import {
  CONCEPTS,
  DROPBACKS,
  QB_SPOT,
  SACK_YARDS,
  completionYards,
  defenderPosition,
  leadThrow,
  resolveThrow,
  rollCoverage,
  routePosition,
  sackTime,
  type Coverage,
  type Route,
} from "@/lib/games/qb";
import { BigButton, GameOver, Scoreboard } from "./ui";

const PX = 10;
const Y0 = -9;
const W = Math.round(FIELD_WIDTH * PX);
const H = 480;
const toPx = (p: Vec) => ({ x: p.x * PX, y: H - (p.y - Y0) * PX });
const LABELS = ["LEFT", "RIGHT", "SLOT"];

interface Play {
  concept: string;
  routes: Route[];
  cov: Coverage[];
  sackT: number;
  t: number;
  ball?: { from: Vec; target: Vec; releaseT: number; arriveT: number; i: number };
}

type Phase = "pre" | "live" | "result" | "over";

function newPlay(): Play {
  const c = CONCEPTS[Math.floor(Math.random() * CONCEPTS.length)];
  return { concept: c.name, routes: c.routes, cov: c.routes.map(() => rollCoverage(Math.random)), sackT: sackTime(Math.random), t: 0 };
}

export default function Qb({ onFinish }: { onFinish: (score: number) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const play = useRef<Play | null>(null);
  const [phase, setPhase] = useState<Phase>("pre");
  const [left, setLeft] = useState(DROPBACKS);
  const [total, setTotal] = useState(0);
  const [comps, setComps] = useState(0);
  const [plays, setPlays] = useState(0);
  const [msg, setMsg] = useState("");
  const [concept, setConcept] = useState("-");
  const leftRef = useRef(DROPBACKS);

  const setUpPlay = useCallback(() => {
    play.current = newPlay();
    setConcept(play.current.concept);
  }, []);

  const draw = useCallback(() => {
    const ctx = canvas.current?.getContext("2d");
    const p = play.current;
    if (!ctx) return;
    ctx.fillStyle = "#2D5A3D";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,.22)";
    ctx.lineWidth = 1;
    for (let y = -5; y <= 40; y += 5) {
      const py = toPx({ x: 0, y }).y;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(W, py);
      ctx.stroke();
    }
    ctx.strokeStyle = "#6ba5ff";
    ctx.lineWidth = 2;
    const los = toPx({ x: 0, y: 0 }).y;
    ctx.beginPath();
    ctx.moveTo(0, los);
    ctx.lineTo(W, los);
    ctx.stroke();
    if (!p) return;

    // routes (faint) before the snap
    if (p.t === 0) {
      ctx.strokeStyle = "rgba(255,255,255,.35)";
      ctx.setLineDash([6, 6]);
      for (const r of p.routes) {
        ctx.beginPath();
        r.forEach((pt, i) => (i ? ctx.lineTo(toPx(pt).x, toPx(pt).y) : ctx.moveTo(toPx(pt).x, toPx(pt).y)));
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    p.routes.forEach((r, i) => {
      const rp = routePosition(r, p.t);
      const dp = defenderPosition(r, p.cov[i], p.t);
      const sep = dist(rp, dp);
      const R = toPx(rp);
      const D = toPx(dp);
      ctx.fillStyle = "#a33a2f";
      ctx.beginPath();
      ctx.arc(D.x, D.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = p.t === 0 ? "#ffffff" : sep > 2.5 ? "#7CFC9A" : sep > 1.2 ? "#e8c547" : "#ff6b5b";
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(R.x, R.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#151515";
      ctx.font = "bold 11px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(LABELS[i][0], R.x, R.y + 1);
    });

    // QB
    const q = toPx(QB_SPOT);
    ctx.fillStyle = "#e8c547";
    ctx.beginPath();
    ctx.arc(q.x, q.y, 10, 0, Math.PI * 2);
    ctx.fill();
    // pocket clock
    if (p.t > 0 && !p.ball) {
      const frac = Math.min(1, p.t / p.sackT);
      ctx.strokeStyle = frac > 0.75 ? "#ff6b5b" : "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(q.x, q.y, 16, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.stroke();
    }
    if (p.ball) {
      const f = Math.min(1, (p.t - p.ball.releaseT) / (p.ball.arriveT - p.ball.releaseT));
      const b = toPx({ x: p.ball.from.x + (p.ball.target.x - p.ball.from.x) * f, y: p.ball.from.y + (p.ball.target.y - p.ball.from.y) * f });
      const lift = Math.sin(f * Math.PI) * 6;
      ctx.fillStyle = "#8a4b26";
      ctx.beginPath();
      ctx.ellipse(b.x, b.y - lift, 5 + lift / 3, 3.5 + lift / 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  const endPlay = useCallback(
    (yards: number, text: string, interception = false) => {
      setTotal((t) => t + yards);
      setPlays((n) => n + 1);
      setMsg(text);
      leftRef.current = interception ? 0 : leftRef.current - 1;
      setLeft(leftRef.current);
      setPhase(leftRef.current === 0 ? "over" : "result");
    },
    [],
  );

  // Report the final once the game ends.
  const reported = useRef(false);
  useEffect(() => {
    if (phase !== "over" || reported.current) return;
    reported.current = true;
    const score = Math.max(0, total);
    if (score > 0) onFinish(score);
  }, [phase, total, onFinish]);

  useEffect(() => {
    if (phase !== "live") return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const p = play.current!;
      p.t += Math.min(0.05, (now - last) / 1000);
      last = now;
      if (p.ball && p.t >= p.ball.arriveT) {
        const r = p.routes[p.ball.i];
        const sep = dist(routePosition(r, p.ball.arriveT), defenderPosition(r, p.cov[p.ball.i], p.ball.arriveT));
        const out = resolveThrow(sep, Math.random);
        draw();
        if (out === "complete") {
          const y = completionYards(p.ball.target.y, Math.random);
          setComps((c) => c + 1);
          endPlay(y, `COMPLETE TO THE ${LABELS[p.ball.i]}: +${y}`);
        } else if (out === "interception") endPlay(0, "INTERCEPTED", true);
        else endPlay(0, "INCOMPLETE");
        return;
      }
      if (!p.ball && p.t >= p.sackT) {
        draw();
        endPlay(SACK_YARDS, `SACKED: ${SACK_YARDS}`);
        return;
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, draw, endPlay]);

  useEffect(() => {
    const c = canvas.current!;
    const dpr = window.devicePixelRatio || 1;
    c.width = W * dpr;
    c.height = H * dpr;
    c.getContext("2d")!.setTransform(dpr, 0, 0, dpr, 0, 0);
    setUpPlay();
    draw();
  }, [draw, setUpPlay]);

  function throwTo(i: number) {
    const p = play.current;
    if (phase !== "live" || !p || p.ball) return;
    const { target, arriveT } = leadThrow(p.routes[i], p.t);
    p.ball = { from: QB_SPOT, target, releaseT: p.t, arriveT, i };
  }

  function onCanvasTap(e: React.PointerEvent<HTMLCanvasElement>) {
    const p = play.current;
    if (!p || phase !== "live") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    let best = -1;
    let bestD = 40;
    p.routes.forEach((r, i) => {
      const R = toPx(routePosition(r, p.t));
      const d = Math.hypot(R.x - x, R.y - y);
      if (d < bestD) [best, bestD] = [i, d];
    });
    if (best >= 0) throwTo(best);
  }

  function next() {
    if (phase === "pre") {
      setPhase("live");
    } else if (phase === "result") {
      setUpPlay();
      draw();
      setMsg("");
      setPhase("pre");
    }
  }

  function restart() {
    reported.current = false;
    setTotal(0);
    setComps(0);
    setPlays(0);
    setLeft(DROPBACKS);
    leftRef.current = DROPBACKS;
    setMsg("");
    setUpPlay();
    draw();
    setPhase("pre");
  }

  return (
    <div>
      <Scoreboard
        items={[
          ["YARDS", String(total)],
          ["COMP", `${comps}/${plays}`],
          ["DROPBACKS", String(left)],
          ["CALL", concept],
        ]}
      />
      <div className="relative bg-[#151515]">
        <canvas
          ref={canvas}
          onPointerDown={onCanvasTap}
          className="block w-full h-auto touch-none select-none"
          style={{ aspectRatio: `${W} / ${H}` }}
          aria-label="Passing field. Tap a receiver to throw."
        />
        {msg && (
          <div className="absolute inset-x-0 top-3 text-center pointer-events-none">
            <span className="inline-block px-3 py-1 bg-[#151515]/85 text-white text-[30px] leading-none" style={{ fontFamily: "var(--font-bebas-neue)" }}>
              {msg}
            </span>
          </div>
        )}
      </div>
      {phase === "live" ? (
        <div className="grid grid-cols-3">
          {LABELS.map((l, i) => (
            <button
              key={l}
              type="button"
              onClick={() => throwTo(i)}
              className="min-h-14 bg-[var(--accent)] text-white text-[22px] border-r border-[#151515] last:border-r-0 touch-manipulation"
              style={{ fontFamily: "var(--font-bebas-neue)" }}
            >
              {l}
            </button>
          ))}
        </div>
      ) : phase === "over" ? (
        <GameOver line={`${Math.max(0, total)} PASSING YARDS`} onAgain={restart} />
      ) : (
        <BigButton onPress={next}>{phase === "pre" ? "HIKE" : "NEXT PLAY"}</BigButton>
      )}
    </div>
  );
}
