"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { advance, downLabel, spotLabel } from "@/lib/games/core";
import type { GameRoster, GameRosters } from "@/lib/games/rosters";
import { applyPlay, betweenPlays, callTimeout, clockLabel, spike, startTwoMinuteDrill, type Drive } from "@/lib/rivalry/drive";
import { OFFENSE_ALIGN, PLAYS, type PlayCall } from "@/lib/rivalry/plays";
import { record, replayCopy, replayWorthy, type Frame } from "@/lib/rivalry/replay";
import { deficit, seriesLine, type Series } from "@/lib/rivalry/series";
import { createSim, separation, targets, type Input, type PlayResult, type Ratings, type Sim } from "@/lib/rivalry/sim";
import Scene, { type CameraMode, type Replay } from "./Scene";
import { StadiumAudio, buzz } from "./audio";
import type { Kit } from "./Players";
import { lastName } from "./space";

const MONO = { fontFamily: "var(--font-geist-mono)" };
const BEBAS = { fontFamily: "var(--font-bebas-neue)" };
const MANAGER_KEY = "games-manager";
const BASE_SCORE = 17;

type Phase = "setup" | "call" | "snap" | "live" | "whistle" | "final" | "replay";

interface LastPlay {
  frames: Frame[];
  sim: Sim;
  /** A touchdown, pick, sack or 15+ yard gain: the replay gets offered up front. */
  big: boolean;
}

interface Props {
  managers: string[];
  rosters: GameRosters;
  seriesBy: Record<string, Series>;
  nemesisBy: Record<string, string>;
}

const ratingsFor = (me: GameRoster, them: GameRoster): Ratings => ({
  qb: me.qb.rating,
  rb: me.rb.rating,
  wr1: me.wr1.rating,
  wr2: me.wr2.rating,
  flex: me.flex.rating,
  te: me.te.rating,
  def: them.def.rating,
});

const kitFor = (t: GameRoster, pants: string): Kit => ({ jersey: t.color, pants, helmet: t.color });

/** Display name for a sim player: real names for skill spots, "DEF" for the rest. */
function nameFor(team: GameRoster, role: string): string {
  const map: Record<string, string> = { QB: team.qb.short, RB: team.rb.short, WR1: team.wr1.short, WR2: team.wr2.short, FLEX: team.flex.short, TE: team.te.short };
  return map[role] ?? role;
}

export default function RivalryGame({ managers, rosters, seriesBy, nemesisBy }: Props) {
  const [me, setMe] = useState("");
  const [rival, setRival] = useState("");
  const [phase, setPhase] = useState<Phase>("setup");
  const [drive, setDrive] = useState<Drive>(startTwoMinuteDrill);
  const [huddlePending, setHuddlePending] = useState(false);
  const [banner, setBanner] = useState<{ text: string; tone: "good" | "bad" | "info" } | null>(null);
  const [hud, setHud] = useState<{ clock: number; targets: { id: number; name: string; sep: number }[]; running: boolean }>({ clock: 120, targets: [], running: false });
  const [board, setBoard] = useState<{ manager: string; score: number }[] | null>(null);
  const [desktop, setDesktop] = useState(false);
  const [replay, setReplay] = useState<Replay | null>(null);
  const [lastPlay, setLastPlay] = useState<LastPlay | null>(null);
  const [muted, setMuted] = useState(false);

  const simRef = useRef<Sim | null>(null);
  const inputRef = useRef<Input>({ dir: { x: 0, y: 0 }, juke: false });
  const slowmo = useRef(1);
  const excitement = useRef(0);
  const lastHud = useRef(0);
  const seenEvents = useRef(0);
  const driveRef = useRef(drive);
  driveRef.current = drive;
  const framesRef = useRef<Frame[]>([]);
  const lastPlayRef = useRef<LastPlay | null>(null);
  const replayReturn = useRef<Phase>("call");
  const tagsRef = useRef<number[]>([]);
  const audioRef = useRef<StadiumAudio | null>(null);
  const audio = () => (audioRef.current ??= new StadiumAudio());

  const team = rosters.teams.find((t) => t.manager === me);
  const them = rosters.teams.find((t) => t.manager === rival);
  const s = me && rival ? seriesBy[`${me}|${rival}`] : undefined;
  const down = s ? deficit(s) : 4;
  const myScore = BASE_SCORE + (drive.outcome === "touchdown" ? 7 : 0);
  const theirScore = BASE_SCORE + down;

  // Restore the manager picked on /games, default the rival to their nemesis; detect desktop.
  useEffect(() => {
    let m = "";
    try {
      m = localStorage.getItem(MANAGER_KEY) ?? "";
    } catch {}
    if (!managers.includes(m)) m = managers[0];
    setMe(m);
    setRival(nemesisBy[m]);
    setDesktop(window.matchMedia("(pointer: fine)").matches && window.innerWidth >= 1024);
    setMuted((audioRef.current ??= new StadiumAudio()).muted);
    fetch("/api/games/scores")
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => b && setBoard(b.rivalry));
  }, [managers, nemesisBy]);

  // A sim in formation, for the huddle / setup views.
  const ratings = useMemo(() => (team && them ? ratingsFor(team, them) : null), [team, them]);
  const showFormation = useCallback(
    (los: number, call: PlayCall = PLAYS[0]) => {
      if (!ratings) return;
      simRef.current = createSim(call, los, ratings, Math.floor(Math.random() * 1e9));
    },
    [ratings],
  );
  useEffect(() => {
    if (phase === "setup") showFormation(25);
  }, [phase, showFormation]);

  const flash = useCallback((text: string, tone: "good" | "bad" | "info" = "info", ms = 1100) => {
    setBanner({ text, tone });
    window.setTimeout(() => setBanner((b) => (b?.text === text ? null : b)), ms);
  }, []);

  function chooseMe(m: string) {
    setMe(m);
    setRival(nemesisBy[m]);
    try {
      localStorage.setItem(MANAGER_KEY, m);
    } catch {}
  }

  useEffect(() => () => audioRef.current?.dispose(), []);

  function toggleMute() {
    const a = audio();
    a.start();
    a.setMuted(!a.muted);
    setMuted(a.muted);
  }

  function kickoff() {
    const a = audio();
    a.start();
    a.swell(0.45, 3);
    setLastPlay(null);
    lastPlayRef.current = null;
    const d = startTwoMinuteDrill();
    setDrive(d);
    setHuddlePending(false);
    showFormation(d.downs.yardLine);
    setPhase("call");
  }

  function callPlay(call: PlayCall) {
    if (!ratings) return;
    let d = drive;
    if (huddlePending) d = betweenPlays(d);
    setHuddlePending(false);
    setDrive(d);
    if (d.outcome) {
      setPhase("final");
      return;
    }
    simRef.current = createSim(call, d.downs.yardLine, ratings, Math.floor(Math.random() * 1e9));
    seenEvents.current = 0;
    framesRef.current = [];
    tagsRef.current = [];
    audioRef.current?.swell(0.2, 1.5);
    inputRef.current = { dir: { x: 0, y: 0 }, juke: false };
    slowmo.current = 1;
    setPhase("snap");
    flash("HUT, HUT!", "info", 700);
    window.setTimeout(() => setPhase("live"), 650);
  }

  function doSpike() {
    const d = spike(drive);
    setHuddlePending(false);
    setDrive(d);
    flash("SPIKED: CLOCK STOPPED", "info");
    if (d.outcome) setPhase("final");
  }

  function doTimeout() {
    setDrive(callTimeout(drive));
    setHuddlePending(false);
    flash("TIMEOUT", "info");
  }

  const finishPlay = useCallback(
    (r: PlayResult) => {
      const d0 = driveRef.current;
      const d = applyPlay(d0, r);
      const firstDown = r.how !== "incomplete" && r.how !== "interception" && advance(d0.downs, r.yards).event === "first-down";
      const sign = r.yards > 0 ? `+${r.yards}` : String(r.yards);
      const text: Record<PlayResult["how"], string> = {
        touchdown: "TOUCHDOWN!",
        interception: "INTERCEPTED",
        incomplete: "INCOMPLETE",
        sack: `SACKED ${sign}`,
        tackle: `${sign}${firstDown ? " · FIRST DOWN" : ""}`,
        "out of bounds": `${sign} · OUT OF BOUNDS${firstDown ? " · 1ST" : ""}`,
      };
      const good = r.how === "touchdown" || firstDown || (r.yards >= 5 && r.how !== "sack");
      const bad = r.how === "interception" || r.how === "sack" || d.outcome === "turnover on downs" || d.outcome === "time expired";
      flash(text[r.how], good ? "good" : bad ? "bad" : "info", r.how === "touchdown" ? 3800 : 1600);
      const a = audioRef.current;
      a?.whistle(r.how === "touchdown");
      if (r.how === "tackle" || r.how === "sack") {
        a?.hit(r.how === "sack" ? 1 : 0.8);
        buzz(35);
      }
      if (r.how === "touchdown") {
        a?.swell(1, 5);
        buzz([60, 40, 140]);
      } else if (good) a?.swell(0.55);
      else if (bad) a?.swell(0.05, 1.5);
      if (simRef.current) {
        const lp = { frames: framesRef.current, sim: simRef.current, big: replayWorthy(r.how, r.yards) };
        lastPlayRef.current = lp;
        setLastPlay(lp);
      }
      if (r.how === "touchdown") {
        excitement.current = 1;
        slowmo.current = 0.35;
      } else excitement.current = good ? 0.6 : 0.1;
      setPhase("whistle");
      window.setTimeout(
        () => {
          excitement.current = 0;
          slowmo.current = 1;
          tagsRef.current = [];
          setDrive(d);
          setHuddlePending(d.running);
          if (d.outcome) setPhase("final");
          else {
            showFormation(d.downs.yardLine);
            setPhase("call");
          }
        },
        r.how === "touchdown" ? 4200 : 1900,
      );
    },
    [flash, showFormation],
  );

  // Live HUD at ~10 Hz, call-outs as they happen, and the whistle.
  const onTick = useCallback(
    (sim: Sim) => {
      if (phase === "live") record(framesRef.current, sim);
      for (; seenEvents.current < sim.events.length; seenEvents.current++) {
        const e = sim.events[seenEvents.current];
        if (e === "CAUGHT") {
          flash(`${team ? nameFor(team, sim.players[sim.controlled!].role) : ""} MAKES THE CATCH`, "good", 900);
          audioRef.current?.swell(0.45);
        }
        if (e === "JUKE") {
          flash("JUKE!", "good", 600);
          audioRef.current?.swell(0.35, 1.2);
        }
        if (e === "THROW") audioRef.current?.swell(0.25, 1.5);
        if (e === "HANDOFF") flash("HANDOFF · RUN!", "info", 600);
      }
      // Name tags: your runner, the receiver the ball is going to, or every target before the throw.
      tagsRef.current =
        sim.controlled !== undefined ? [sim.controlled] : sim.ball.state === "air" && sim.ball.target !== undefined ? [sim.ball.target] : sim.ball.state === "held" ? targets(sim) : [];
      if (sim.result && phase === "live") {
        finishPlay(sim.result);
        return;
      }
      const now = performance.now();
      if (now - lastHud.current < 100) return;
      lastHud.current = now;
      setHud({
        clock: driveRef.current.clock - sim.t,
        running: sim.controlled !== undefined,
        targets:
          sim.ball.state === "held" && sim.controlled === undefined && team
            ? targets(sim).map((id) => ({ id, name: nameFor(team, sim.players[id].role), sep: separation(sim, id) }))
            : [],
      });
    },
    [finishPlay, flash, phase, team],
  );

  // Keyboard: arrows/WASD steer, space jukes, 1-5 throw.
  useEffect(() => {
    if (phase !== "live") return;
    const held = new Set<string>();
    const sync = () => {
      const x = (held.has("r") ? 1 : 0) - (held.has("l") ? 1 : 0);
      const y = (held.has("u") ? 1 : 0) - (held.has("d") ? 1 : 0);
      inputRef.current.dir = { x, y };
    };
    const map: Record<string, string> = { ArrowUp: "u", KeyW: "u", ArrowDown: "d", KeyS: "d", ArrowLeft: "l", KeyA: "l", ArrowRight: "r", KeyD: "r" };
    const down = (e: KeyboardEvent) => {
      if (map[e.code]) {
        e.preventDefault();
        held.add(map[e.code]);
        sync();
      } else if (e.code === "Space") {
        e.preventDefault();
        inputRef.current.juke = true;
      } else if (/^Digit[1-5]$/.test(e.code) && simRef.current) {
        const id = targets(simRef.current)[Number(e.code.slice(5)) - 1];
        if (id !== undefined) inputRef.current.throwTo = id;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (map[e.code]) {
        held.delete(map[e.code]);
        sync();
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [phase]);

  function startReplay() {
    const lp = lastPlayRef.current;
    if (!lp || lp.frames.length < 2) return;
    replayReturn.current = phase;
    const copy = replayCopy(lp.sim);
    simRef.current = copy;
    tagsRef.current = [];
    setReplay({ frames: lp.frames, sim: copy });
    setPhase("replay");
    audioRef.current?.swell(0.3, 2);
  }

  const endReplay = useCallback(() => {
    setReplay(null);
    const back = replayReturn.current;
    if (back === "final" && lastPlayRef.current) simRef.current = lastPlayRef.current.sim;
    else showFormation(driveRef.current.downs.yardLine);
    setPhase(back);
  }, [showFormation]);

  // Offense player ids are fixed by alignment order; skill players get their real names as tags.
  const names = useMemo<Record<number, string>>(
    () => (team ? Object.fromEntries(OFFENSE_ALIGN.flatMap((a, i) => (a.role === "OL" ? [] : [[i, nameFor(team, a.role)]]))) : {}),
    [team],
  );

  // Record a win.
  const submitted = useRef(false);
  useEffect(() => {
    if (phase !== "final") {
      submitted.current = false;
      return;
    }
    if (drive.outcome !== "touchdown" || submitted.current) return;
    submitted.current = true;
    fetch("/api/games/scores", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ game: "rivalry", manager: me, score: Math.floor(drive.clock) }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => b && setBoard(b.rivalry));
  }, [phase, drive, me]);

  const own = useMemo<[string, string]>(() => [team?.color ?? "#2D5A3D", lastName(me || "HOME")], [team, me]);
  const opp = useMemo<[string, string]>(() => [them?.color ?? "#a33a2f", lastName(rival || "AWAY")], [them, rival]);
  const offenseKit = useMemo(() => (team ? kitFor(team, "#ece9e0") : null), [team]);
  const defenseKit = useMemo(() => (them ? kitFor(them, "#cfc9bb") : null), [them]);

  const mode: CameraMode =
    phase === "replay"
      ? "replay"
      : phase === "setup" || phase === "final" ? (drive.outcome === "touchdown" && phase === "final" ? "celebrate" : "orbit") : phase === "live" || phase === "whistle" ? (simRef.current?.result?.how === "touchdown" ? "celebrate" : "live") : "huddle";

  return (
    <div className="relative h-[calc(100svh-58px)] portrait:min-h-[520px] bg-[#05080e] overflow-hidden select-none touch-none">
      {offenseKit && defenseKit && (
        <Canvas
          shadows={desktop}
          dpr={[1, desktop ? 2 : 1.75]}
          camera={{ fov: 55, position: [0, 40, 70], near: 0.1, far: 600 }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          className="!absolute inset-0"
        >
          <Suspense fallback={null}>
            <Scene
              simRef={simRef}
              inputRef={inputRef}
              live={phase === "live" || phase === "whistle"}
              slowmo={slowmo}
              onTick={onTick}
              mode={mode}
              los={drive.downs.yardLine}
              toGo={drive.downs.toGo}
              offense={offenseKit}
              defense={defenseKit}
              own={own}
              opp={opp}
              excitement={excitement}
              shadows={desktop}
              replay={replay}
              onReplayEnd={endReplay}
              names={names}
              tagsRef={tagsRef}
            />
          </Suspense>
        </Canvas>
      )}

      {phase !== "setup" && team && them && (
        <ScoreBug
          me={team}
          them={them}
          myScore={myScore}
          theirScore={theirScore}
          clock={phase === "live" || phase === "whistle" ? hud.clock : drive.clock}
          drive={drive}
        />
      )}

      <button
        type="button"
        onClick={toggleMute}
        aria-pressed={!muted}
        className="absolute right-2 top-[66px] md:top-3 md:right-3 z-10 min-h-9 px-2.5 bg-[#0d0f13]/85 border border-white/15 text-[10px] tracking-[.16em] text-[#e6e6e0]"
        style={MONO}
      >
        SOUND {muted ? "OFF" : "ON"}
      </button>

      {phase === "replay" && (
        <>
          <div className="absolute left-3 top-[66px] md:top-3 px-2.5 py-1 bg-[var(--negative)] text-white text-[20px] leading-none tracking-[.04em] animate-pulse" style={BEBAS}>
            INSTANT REPLAY
          </div>
          <button
            type="button"
            onClick={endReplay}
            className="absolute right-3 bottom-[max(16px,env(safe-area-inset-bottom))] min-h-12 px-5 bg-white text-[#151515] text-[22px]"
            style={BEBAS}
          >
            SKIP
          </button>
        </>
      )}

      {banner && (
        <div className="absolute inset-x-0 top-[30%] landscape:top-[24%] flex justify-center pointer-events-none px-4">
          <div
            className={`px-5 py-2 text-white text-[40px] landscape:text-[30px] lg:landscape:text-[56px] leading-none text-center shadow-2xl ${banner.tone === "good" ? "bg-[var(--accent)]" : banner.tone === "bad" ? "bg-[var(--negative)]" : "bg-[#151515]/90"}`}
            style={BEBAS}
          >
            {banner.text}
          </div>
        </div>
      )}

      {phase === "setup" && team && them && s && (
        <SetupCard
          managers={managers}
          me={me}
          rival={rival}
          nemesis={nemesisBy[me]}
          team={team}
          them={them}
          series={s}
          down={down}
          week={rosters.week}
          board={board}
          onMe={chooseMe}
          onRival={setRival}
          onKickoff={kickoff}
        />
      )}

      {phase === "call" && (
        <PlayCallSheet
          drive={drive}
          huddlePending={huddlePending}
          replayable={!!lastPlay && lastPlay.frames.length > 1}
          bigPlay={!!lastPlay?.big}
          onReplay={startReplay}
          onCall={callPlay}
          onSpike={doSpike}
          onTimeout={doTimeout}
        />
      )}

      {phase === "live" && hud.targets.length > 0 && (
        <div className="absolute inset-x-0 bottom-0 p-3 pb-[max(12px,env(safe-area-inset-bottom))] grid gap-2" style={{ gridTemplateColumns: `repeat(${hud.targets.length}, minmax(0,1fr))` }}>
          {hud.targets.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onPointerDown={() => (inputRef.current.throwTo = t.id)}
              className="min-h-14 px-1 bg-[#151515]/90 text-white border-b-4 touch-manipulation active:scale-95 transition-transform"
              style={{ borderColor: t.sep > 2.5 ? "#7CFC9A" : t.sep > 1.2 ? "#ffd23f" : "#ff6b5b" }}
            >
              <div className="text-[9px] tracking-[.14em] text-[#a3a3a0]" style={MONO}>
                {desktop ? `${i + 1} · ` : ""}
                {t.sep > 2.5 ? "OPEN" : t.sep > 1.2 ? "WINDOW" : "COVERED"}
              </div>
              <div className="text-[19px] leading-tight truncate" style={BEBAS}>
                {t.name}
              </div>
            </button>
          ))}
        </div>
      )}

      {phase === "live" && hud.running && <RunControls inputRef={inputRef} />}

      {phase === "final" && team && them && s && (
        <FinalCard
          won={drive.outcome === "touchdown"}
          outcome={drive.outcome!}
          secondsLeft={Math.floor(drive.clock)}
          me={team}
          them={them}
          myScore={myScore}
          theirScore={theirScore}
          series={s}
          board={board}
          onAgain={kickoff}
          onNewRival={() => setPhase("setup")}
          onReplay={lastPlay && lastPlay.frames.length > 1 ? startReplay : undefined}
        />
      )}
    </div>
  );
}

function ScoreBug({ me, them, myScore, theirScore, clock, drive }: { me: GameRoster; them: GameRoster; myScore: number; theirScore: number; clock: number; drive: Drive }) {
  return (
    <div className="absolute top-0 inset-x-0 p-2 md:p-3 pointer-events-none">
      <div className="mx-auto max-w-[560px] flex items-stretch bg-[#0d0f13]/90 text-white shadow-xl border border-white/10">
        {[
          [me, myScore],
          [them, theirScore],
        ].map(([t, sc]) => (
          <div key={(t as GameRoster).manager} className="flex items-center gap-2 px-2.5 py-1.5 border-r border-white/10" style={{ boxShadow: `inset 4px 0 0 ${(t as GameRoster).color}` }}>
            <span className="text-[17px] md:text-[20px] leading-none truncate max-w-[82px] md:max-w-none" style={BEBAS}>
              {lastName((t as GameRoster).manager)}
            </span>
            <span className="text-[24px] md:text-[28px] leading-none tabular-nums" style={BEBAS}>
              {sc as number}
            </span>
          </div>
        ))}
        <div className="flex-1 flex flex-col justify-center px-2.5 py-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] tracking-[.14em] text-[#a3a3a0]" style={MONO}>
              4TH
            </span>
            <span className={`text-[22px] leading-none tabular-nums ${clock < 30 ? "text-[#ff6b5b]" : ""}`} style={BEBAS}>
              {clockLabel(clock)}
            </span>
            <span className="ml-auto text-[10px] tracking-[.1em] text-[#a3a3a0]" style={MONO} aria-label={`${drive.timeouts} timeouts`}>
              TO {"●".repeat(drive.timeouts)}
              {"○".repeat(1 - drive.timeouts)}
            </span>
          </div>
          <div className="text-[10.5px] tracking-[.08em] text-[#e6e6e0] truncate" style={MONO}>
            {drive.outcome ? `FINAL · ${drive.outcome.toUpperCase()}` : `${downLabel(drive.downs)} · ${spotLabel(drive.downs.yardLine)}`}
          </div>
        </div>
      </div>
    </div>
  );
}

function SetupCard(p: {
  managers: string[];
  me: string;
  rival: string;
  nemesis: string;
  team: GameRoster;
  them: GameRoster;
  series: Series;
  down: number;
  week: number;
  board: { manager: string; score: number }[] | null;
  onMe: (m: string) => void;
  onRival: (m: string) => void;
  onKickoff: () => void;
}) {
  const meS = lastName(p.me);
  const themS = lastName(p.rival);
  const lineup = (t: GameRoster) =>
    [
      ["QB", t.qb],
      ["RB", t.rb],
      ["WR", t.wr1],
      ["WR", t.wr2],
      ["TE", t.te],
      ["FLX", t.flex],
    ] as const;
  return (
    <div className="absolute inset-x-0 bottom-0 max-h-full overflow-y-auto touch-pan-y">
      <div className="h-24" />
      <div className="mx-auto max-w-[640px] bg-[#0d0f13]/95 text-white border-t-4 border-[var(--accent)] p-4 md:p-6 pb-[max(16px,env(safe-area-inset-bottom))]">
        <div className="text-[10.5px] tracking-[.24em] text-[var(--accent-light)]" style={MONO}>
          BLAKE&apos;S SHOES · 3D
        </div>
        <h1 className="text-[46px] md:text-[64px] leading-[.9]" style={BEBAS}>
          RIVALRY DRIVE
        </h1>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <label className="block">
            <span className="text-[10px] tracking-[.18em] text-[#a3a3a0]" style={MONO}>
              YOU
            </span>
            <select value={p.me} onChange={(e) => p.onMe(e.target.value)} className="mt-1 w-full min-h-11 bg-[#151515] border border-white/20 px-2 text-[18px]" style={BEBAS}>
              {p.managers.map((m) => (
                <option key={m} value={m}>
                  {m.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] tracking-[.18em] text-[#a3a3a0]" style={MONO}>
              RIVAL
            </span>
            <select value={p.rival} onChange={(e) => p.onRival(e.target.value)} className="mt-1 w-full min-h-11 bg-[#151515] border border-white/20 px-2 text-[18px]" style={BEBAS}>
              {p.managers
                .filter((m) => m !== p.me)
                .map((m) => (
                  <option key={m} value={m}>
                    {m.toUpperCase()}
                    {m === p.nemesis ? " · NEMESIS" : ""}
                  </option>
                ))}
            </select>
          </label>
        </div>

        <div className="mt-4 p-3 bg-white/5 border-l-4" style={{ borderColor: p.them.color }}>
          <div className="text-[30px] leading-none" style={BEBAS}>
            {seriesLine(p.series, meS, themS)}
          </div>
          {p.series.last && (
            <div className="text-[11px] tracking-[.08em] text-[#c9c9c2] mt-1" style={MONO}>
              LAST MEETING: {p.series.last.season} WK {p.series.last.week} · {p.series.last.mine.toFixed(1)}-{p.series.last.theirs.toFixed(1)}{" "}
              {p.series.last.mine > p.series.last.theirs ? "W" : p.series.last.mine < p.series.last.theirs ? "L" : "T"}
            </div>
          )}
          <p className="text-sm text-[#e6e6e0] mt-2">
            {themS} {BASE_SCORE + p.down}, {meS} {BASE_SCORE}. 2:00 left, your ball on the 25, one timeout.
            {p.series.lastLoss
              ? ` Payback for ${p.series.lastLoss.season} week ${p.series.lastLoss.week}, when they beat you by ${(p.series.lastLoss.theirs - p.series.lastLoss.mine).toFixed(1)}.`
              : " You've never lost to them. Keep it that way."}{" "}
            Touchdown wins it.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {[p.team, p.them].map((t) => (
            <div key={t.manager}>
              <div className="text-[18px] leading-none mb-1" style={{ ...BEBAS, color: t.color }}>
                {lastName(t.manager)}
              </div>
              {lineup(t).map(([pos, pl]) => (
                <div key={pos + pl.name} className="flex gap-2 text-[12px] py-0.5 border-b border-white/5">
                  <span className="w-7 text-[#7a7a76]" style={MONO}>
                    {pos}
                  </span>
                  <span className="truncate flex-1">{pl.name}</span>
                  <span className="text-[#a3a3a0] tabular-nums" style={MONO}>
                    {pl.ppg.toFixed(1)}
                  </span>
                </div>
              ))}
              <div className="flex gap-2 text-[12px] py-0.5">
                <span className="w-7 text-[#7a7a76]" style={MONO}>
                  DEF
                </span>
                <span className="truncate flex-1">{t.def.name}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="text-[9.5px] tracking-[.12em] text-[#7a7a76] mt-1" style={MONO}>
          WEEK {p.week} STARTERS · BETTER FANTASY SEASONS PLAY BETTER
        </div>

        <p className="mt-3 text-[10.5px] tracking-[.12em] text-[#7a7a76] portrait:block hidden" style={MONO}>
          TIP: TURN YOUR PHONE SIDEWAYS FOR THE FULL-FIELD VIEW
        </p>
        <button type="button" onClick={p.onKickoff} className="mt-4 w-full min-h-14 bg-[var(--accent)] text-white text-[28px] tracking-[.04em] active:brightness-90" style={BEBAS}>
          TAKE THE FIELD
        </button>
        <p className="text-[11px] text-[#a3a3a0] mt-2">
          Call a play. On runs and after catches, drag the stick to steer and hit JUKE to make a man miss. On passes, tap a receiver to throw: green is open.
        </p>
        {p.board && p.board.length > 0 && (
          <div className="mt-3 text-[11px] text-[#c9c9c2]" style={MONO}>
            FASTEST WINS ·{" "}
            {p.board
              .slice(0, 5)
              .map((e) => `${lastName(e.manager)} ${clockLabel(e.score)}`)
              .join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}

function PlayCallSheet({
  drive,
  huddlePending,
  replayable,
  bigPlay,
  onReplay,
  onCall,
  onSpike,
  onTimeout,
}: {
  drive: Drive;
  huddlePending: boolean;
  replayable: boolean;
  bigPlay: boolean;
  onReplay: () => void;
  onCall: (c: PlayCall) => void;
  onSpike: () => void;
  onTimeout: () => void;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 p-2 md:p-4 pb-[max(8px,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-[720px]">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-[10.5px] tracking-[.18em] text-white/80" style={MONO}>
            CALL A PLAY{huddlePending ? " · CLOCK RUNNING (-0:15 HUDDLE)" : ""}
          </span>
          {replayable && (
            <button
              type="button"
              onClick={onReplay}
              className={`min-h-9 px-3 text-[16px] leading-none ${bigPlay ? "bg-[var(--negative)] text-white animate-pulse" : "bg-[#0d0f13]/90 text-white border border-white/15"}`}
              style={BEBAS}
            >
              {bigPlay ? "▶ WATCH THAT AGAIN" : "▶ REPLAY"}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
          {PLAYS.map((c) => (
            <button key={c.name} type="button" onClick={() => onCall(c)} className="text-left bg-[#0d0f13]/92 border border-white/10 hover:border-[var(--accent-light)] active:scale-[.98] transition-transform p-2.5 min-h-[72px]">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-white text-[22px] leading-none" style={BEBAS}>
                  {c.name}
                </span>
                <span className={`text-[9px] tracking-[.16em] ${c.kind === "run" ? "text-[#ffd23f]" : "text-[#7cc4ff]"}`} style={MONO}>
                  {c.kind.toUpperCase()}
                </span>
              </div>
              <div className="text-[11px] leading-snug text-[#b8b8b2] mt-1 line-clamp-2">{c.blurb}</div>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5 mt-1.5">
          <button type="button" onClick={onSpike} disabled={drive.downs.down === 4} className="min-h-11 bg-[#151515]/92 text-[#ffd23f] border border-white/10 text-[18px] disabled:opacity-40" style={BEBAS}>
            SPIKE IT (STOP CLOCK, LOSE A DOWN)
          </button>
          <button type="button" onClick={onTimeout} disabled={!huddlePending || drive.timeouts === 0} className="min-h-11 bg-[#151515]/92 text-[#ffd23f] border border-white/10 text-[18px] disabled:opacity-40" style={BEBAS}>
            TIMEOUT ({drive.timeouts} LEFT)
          </button>
        </div>
      </div>
    </div>
  );
}

/** Left thumb: drag to steer (screen up is downfield). Right thumb: JUKE. */
function RunControls({ inputRef }: { inputRef: React.RefObject<Input> }) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const R = 48;
  const move = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect();
    let x = e.clientX - (r.left + r.width / 2);
    let y = e.clientY - (r.top + r.height / 2);
    const m = Math.hypot(x, y);
    if (m > R) {
      x = (x / m) * R;
      y = (y / m) * R;
    }
    setKnob({ x, y });
    inputRef.current.dir = m < 6 ? { x: 0, y: 0 } : { x: x / R, y: -y / R };
  };
  const release = () => {
    setKnob({ x: 0, y: 0 });
    inputRef.current.dir = { x: 0, y: 0 };
  };
  return (
    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 pb-[max(20px,env(safe-area-inset-bottom))] pointer-events-none">
      <div
        ref={base}
        className="pointer-events-auto w-[132px] h-[132px] rounded-full bg-white/10 border-2 border-white/25 relative touch-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          move(e);
        }}
        onPointerMove={(e) => e.buttons && move(e)}
        onPointerUp={release}
        onPointerCancel={release}
        aria-label="Steer"
      >
        <div className="absolute w-14 h-14 rounded-full bg-white/80 left-1/2 top-1/2 shadow-lg" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
      </div>
      <button
        type="button"
        onPointerDown={() => (inputRef.current.juke = true)}
        className="pointer-events-auto w-[92px] h-[92px] rounded-full bg-[var(--accent)] text-white text-[26px] shadow-xl active:scale-90 transition-transform border-2 border-white/30"
        style={BEBAS}
      >
        JUKE
      </button>
    </div>
  );
}

function FinalCard(p: {
  won: boolean;
  outcome: string;
  secondsLeft: number;
  me: GameRoster;
  them: GameRoster;
  myScore: number;
  theirScore: number;
  series: Series;
  board: { manager: string; score: number }[] | null;
  onAgain: () => void;
  onNewRival: () => void;
  onReplay?: () => void;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-[560px] bg-[#0d0f13]/95 text-white border-t-4 p-4" style={{ borderColor: p.won ? p.me.color : "var(--negative)" }}>
        <div className="text-[10.5px] tracking-[.22em] text-[#a3a3a0]" style={MONO}>
          FINAL{p.won ? "" : ` · ${p.outcome.toUpperCase()}`}
        </div>
        <div className="text-[52px] leading-[.9]" style={BEBAS}>
          {p.won ? `${lastName(p.me.manager)} WINS ${p.myScore}-${p.theirScore}` : `${lastName(p.them.manager)} HOLDS ON ${p.theirScore}-${p.myScore}`}
        </div>
        <p className="text-sm text-[#e6e6e0] mt-1">
          {p.won ? `Scored with ${clockLabel(p.secondsLeft)} left. That's on the board.` : `The real series still reads ${seriesLine(p.series, lastName(p.me.manager), lastName(p.them.manager))}.`}
        </p>
        {p.board && p.board.length > 0 && (
          <div className="mt-2 text-[11px] text-[#c9c9c2]" style={MONO}>
            FASTEST WINS ·{" "}
            {p.board
              .slice(0, 5)
              .map((e) => `${lastName(e.manager)} ${clockLabel(e.score)}`)
              .join(" · ")}
          </div>
        )}
        {p.onReplay && (
          <button type="button" onClick={p.onReplay} className="mt-3 w-full min-h-11 bg-[#151515] border border-white/20 text-white text-[20px]" style={BEBAS}>
            ▶ {p.won ? "WATCH THE WINNER AGAIN" : "WATCH THE LAST PLAY"}
          </button>
        )}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button type="button" onClick={p.onAgain} className="min-h-12 bg-[var(--accent)] text-white text-[22px]" style={BEBAS}>
            RUN IT BACK
          </button>
          <button type="button" onClick={p.onNewRival} className="min-h-12 bg-white text-[#151515] text-[22px]" style={BEBAS}>
            NEW RIVAL
          </button>
        </div>
      </div>
    </div>
  );
}
