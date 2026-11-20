"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dist, type Vec } from "@/lib/games/core";
import type { GameRoster } from "@/lib/games/rosters";
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
import { BigButton, GameOver, PlayerLine, Scoreboard } from "./ui";
import { FIELD_W as W, line, paintField, PX, token } from "./field";

const Y0 = -9;
const H = 480;
const toPx = (p: Vec) => ({ x: p.x * PX, y: H - (p.y - Y0) * PX });

interface Play {
  concept: string;
  routes: Route[];
  cov: Coverage[];
  sackT: number;
  t: number;
  ball?: { from: Vec; target: Vec; releaseT: number; arriveT: number; i: number };
}

type Phase = "pre" | "live" | "result" | "over";

/** Routes go to WR1 (left), WR2 (right), TE (slot); each beats coverage by his rating. */
function newPlay(team: GameRoster): Play {
  const c = CONCEPTS[Math.floor(Math.random() * CONCEPTS.length)];
  const ratings = [team.wr1.rating, team.wr2.rating, team.te.rating];
  return { concept: c.name, routes: c.routes, cov: c.routes.map((_, i) => rollCoverage(Math.random, ratings[i])), sackT: sackTime(Math.random, team.qb.rating), t: 0 };
}

export default function Qb({ team, opp, onFinish }: { team: GameRoster; opp: GameRoster; onFinish: (score: number) => void }) {
  const targets = useMemo(() => [team.wr1, team.wr2, team.te], [team]);
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
    play.current = newPlay(team);
    setConcept(play.current.concept);
  }, [team]);

  const draw = useCallback(() => {
    const ctx = canvas.current?.getContext("2d");
    const p = play.current;
    if (!ctx) return;
    paintField(ctx, H, (y) => toPx({ x: 0, y }).y, Y0, Y0 + H / PX);
    line(ctx, toPx({ x: 0, y: 0 }).y, "#6ba5ff");
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
      token(ctx, D.x, D.y, { r: 9, fill: opp.color, ring: "rgba(0,0,0,.35)", ringWidth: 2 });
      const ring = p.t === 0 ? "#ffffff" : sep > 2.5 ? "#7CFC9A" : sep > 1.2 ? "#e8c547" : "#ff6b5b";
      token(ctx, R.x, R.y, { fill: team.color, ring, ringWidth: 4, name: targets[i].short });
    });

    // QB, with the pocket clock around him
    const q = toPx(QB_SPOT);
    token(ctx, q.x, q.y, { fill: team.color, ring: "#ffffff", ringWidth: 2, name: team.qb.short });
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
      // trail
      ctx.strokeStyle = "rgba(255,255,255,.5)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 5]);
      const q0 = toPx(p.ball.from);
      ctx.beginPath();
      ctx.moveTo(q0.x, q0.y);
      ctx.lineTo(b.x, b.y - lift);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#8a4b26";
      ctx.beginPath();
      ctx.ellipse(b.x, b.y - lift, 5 + lift / 3, 3.5 + lift / 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [team, opp, targets]);

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
          endPlay(y, `${targets[p.ball.i].short}: +${y}`);
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
  }, [phase, draw, endPlay, targets]);

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
          {targets.map(({ short: l }, i) => (
            <button
              key={i}
              type="button"
              onClick={() => throwTo(i)}
              className="min-h-14 px-1 truncate text-white text-[22px] border-r border-[#151515] last:border-r-0 touch-manipulation active:brightness-90"
              style={{ fontFamily: "var(--font-bebas-neue)", background: team.color }}
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
      <div className="bg-[#232322] py-1">
        <PlayerLine label="QB" name={team.qb.name} ppg={team.qb.ppg} rating={team.qb.rating} color={team.color} />
        {targets.map((p, i) => (
          <PlayerLine key={p.name} label={["WR1", "WR2", "TE"][i]} name={p.name} ppg={p.ppg} rating={p.rating} color={team.color} />
        ))}
      </div>
    </div>
  );
}
