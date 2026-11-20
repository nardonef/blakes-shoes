"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { advance, downLabel, FIELD_WIDTH, spotLabel, startDrive, type Downs, type Vec } from "@/lib/games/core";
import { playEnded, runnerSpeed, spawnDefenders, stepDefenders, stepPlayer, type Defender } from "@/lib/games/run";
import type { GameRoster } from "@/lib/games/rosters";
import { BigButton, GameOver, PlayerLine, Scoreboard } from "./ui";
import { FIELD_W as W, line, paintField, PX, token } from "./field";

const H = 560;
const VIEW = H / PX;

type Phase = "pre" | "live" | "result" | "over";

interface World {
  player: Vec;
  vel: Vec;
  defs: Defender[];
  /** Held pointer as a fraction of the canvas (0-1 each way); the runner steers toward it. */
  pointer: Vec | null;
  keys: Set<string>;
  cameraY: number;
}

const lastName = (n: string) => n.split(" ").slice(-1)[0].toUpperCase();

function cameraFor(y: number) {
  return Math.min(110 - VIEW, Math.max(-10, y - VIEW * 0.3));
}

export default function Run({ team, opp, onFinish }: { team: GameRoster; opp: GameRoster; onFinish: (score: number) => void }) {
  const speed = runnerSpeed(team.rb.rating);
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<World | null>(null);
  const downsRef = useRef<Downs>(startDrive());
  const [downs, setDowns] = useState<Downs>(startDrive());
  const [phase, setPhase] = useState<Phase>("pre");
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [msg, setMsg] = useState("");

  const draw = useCallback(() => {
    const ctx = canvas.current?.getContext("2d");
    const w = world.current;
    if (!ctx || !w) return;
    const d = downsRef.current;
    const sy = (y: number) => H - (y - w.cameraY) * PX;
    // You drive toward their end zone.
    paintField(ctx, H, sy, w.cameraY, w.cameraY + VIEW, {
      numbers: (y) => (y > 0 && y < 100 ? (y <= 50 ? y : 100 - y) : null),
      endZones: { own: [team.color, lastName(team.manager)], opp: [opp.color, lastName(opp.manager)] },
    });
    line(ctx, sy(d.yardLine), "#6ba5ff");
    if (d.yardLine + d.toGo < 100) line(ctx, sy(d.yardLine + d.toGo), "#f2c230");
    for (const def of w.defs) token(ctx, def.x * PX, sy(def.y), { fill: opp.color, ring: "rgba(0,0,0,.35)", ringWidth: 2 });
    token(ctx, w.player.x * PX, sy(w.player.y), { r: 11, fill: team.color, ring: "#ffffff", name: team.rb.short });
  }, [team, opp]);

  const setUpPlay = useCallback(
    (lvl: number) => {
      const los = downsRef.current.yardLine;
      world.current = {
        player: { x: FIELD_WIDTH / 2, y: los - 2 },
        vel: { x: 0, y: 0 },
        defs: spawnDefenders(los, lvl, Math.random, opp.def.rating),
        pointer: null,
        keys: world.current?.keys ?? new Set(),
        cameraY: cameraFor(los - 2),
      };
      draw();
    },
    [draw, opp],
  );

  useEffect(() => {
    const c = canvas.current!;
    const dpr = window.devicePixelRatio || 1;
    c.width = W * dpr;
    c.height = H * dpr;
    c.getContext("2d")!.setTransform(dpr, 0, 0, dpr, 0, 0);
    setUpPlay(1);
  }, [setUpPlay]);

  // Arrow keys / WASD steer while the play is live.
  useEffect(() => {
    const map: Record<string, string> = { ArrowUp: "u", KeyW: "u", ArrowDown: "d", KeyS: "d", ArrowLeft: "l", KeyA: "l", ArrowRight: "r", KeyD: "r" };
    const down = (e: KeyboardEvent) => {
      if (!map[e.code] || !world.current) return;
      if (phase === "live") e.preventDefault();
      world.current.keys.add(map[e.code]);
    };
    const up = (e: KeyboardEvent) => map[e.code] && world.current?.keys.delete(map[e.code]);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [phase]);

  const finishPlay = useCallback(
    (endY: number, how: string) => {
      const d = downsRef.current;
      const yards = Math.round(endY - d.yardLine);
      const { state, event } = advance(d, how === "touchdown" ? 100 - d.yardLine : yards);
      if (event === "touchdown") {
        setScore((s) => s + 7);
        setLevel((l) => l + 1);
        downsRef.current = startDrive();
        setMsg("TOUCHDOWN +7");
      } else if (event === "turnover-on-downs") {
        downsRef.current = state;
        setMsg("TURNOVER ON DOWNS");
        setDowns(state);
        setPhase("over");
        return;
      } else {
        downsRef.current = state;
        const tag = how === "out of bounds" ? "OUT OF BOUNDS" : "TACKLED";
        setMsg(`${tag}: ${yards >= 0 ? "+" : ""}${yards}${event === "first-down" ? " FIRST DOWN" : ""}`);
      }
      setDowns(downsRef.current);
      setPhase("result");
    },
    [],
  );

  const reported = useRef(false);
  useEffect(() => {
    if (phase !== "over" || reported.current) return;
    reported.current = true;
    if (score > 0) onFinish(score);
  }, [phase, score, onFinish]);

  useEffect(() => {
    if (phase !== "live") return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const w = world.current!;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let dir = { x: 0, y: 0 };
      if (w.keys.size) {
        dir = { x: (w.keys.has("r") ? 1 : 0) - (w.keys.has("l") ? 1 : 0), y: (w.keys.has("u") ? 1 : 0) - (w.keys.has("d") ? 1 : 0) };
      } else if (w.pointer) {
        const t = { x: w.pointer.x * FIELD_WIDTH, y: w.cameraY + (1 - w.pointer.y) * VIEW };
        if (Math.hypot(t.x - w.player.x, t.y - w.player.y) > 0.6) dir = { x: t.x - w.player.x, y: t.y - w.player.y };
      }
      const { pos, vel } = stepPlayer(w.player, dir, dt, speed);
      w.player = pos;
      w.vel = vel;
      w.defs = stepDefenders(w.defs, pos, vel, dt);
      w.cameraY = cameraFor(pos.y);
      draw();
      const end = playEnded(pos, w.defs);
      if (end) {
        finishPlay(pos.y, end);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, draw, finishPlay, speed]);

  function pointer(e: React.PointerEvent<HTMLCanvasElement>) {
    const w = world.current;
    if (!w || phase !== "live") return;
    if (e.type === "pointerdown") e.currentTarget.setPointerCapture(e.pointerId);
    if (e.type === "pointermove" && e.buttons === 0 && e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    w.pointer = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  }

  function release() {
    if (world.current) world.current.pointer = null;
  }

  function next() {
    if (phase === "pre") {
      setMsg("");
      setPhase("live");
    } else if (phase === "result") {
      setUpPlay(level);
      setMsg("");
      setPhase("pre");
    }
  }

  function restart() {
    reported.current = false;
    downsRef.current = startDrive();
    setDowns(startDrive());
    setScore(0);
    setLevel(1);
    setMsg("");
    setUpPlay(1);
    setPhase("pre");
  }

  return (
    <div>
      <Scoreboard
        items={[
          ["SCORE", String(score)],
          ["DOWN", downLabel(downs)],
          ["BALL ON", spotLabel(downs.yardLine)],
          ["DRIVE", String(level)],
        ]}
      />
      <div className="relative bg-[#151515]">
        <canvas
          ref={canvas}
          onPointerDown={pointer}
          onPointerMove={pointer}
          onPointerUp={release}
          onPointerCancel={release}
          onPointerLeave={(e) => e.pointerType === "mouse" && release()}
          className="block w-full h-auto touch-none select-none"
          style={{ aspectRatio: `${W} / ${H}` }}
          aria-label="Running field. Hold and drag where you want to run, or use the arrow keys."
        />
        {msg && (
          <div className="absolute inset-x-0 top-3 text-center pointer-events-none">
            <span className="inline-block px-3 py-1 bg-[#151515]/85 text-white text-[30px] leading-none" style={{ fontFamily: "var(--font-bebas-neue)" }}>
              {msg}
            </span>
          </div>
        )}
      </div>
      {phase === "over" ? (
        <GameOver line={`${score} POINTS`} onAgain={restart} />
      ) : phase === "live" ? (
        <div className="min-h-14 flex items-center justify-center bg-[#232322] text-[#c9c9c2] text-[11px] font-semibold tracking-[.14em] px-3 text-center" style={{ fontFamily: "var(--font-geist-mono)" }}>
          HOLD + DRAG ON THE FIELD TO RUN · ARROW KEYS ON DESKTOP
        </div>
      ) : (
        <BigButton onPress={next}>{phase === "pre" ? "HIKE" : "NEXT PLAY"}</BigButton>
      )}
      <div className="bg-[#232322] py-1">
        <PlayerLine label="RB" name={team.rb.name} ppg={team.rb.ppg} rating={team.rb.rating} color={team.color} />
        <PlayerLine label="VS" name={`${opp.def.name} D`} ppg={opp.def.ppg} rating={opp.def.rating} color={opp.color} />
      </div>
    </div>
  );
}
