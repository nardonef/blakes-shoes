"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { Vec } from "@/lib/games/core";
import { applyFrame, frameAt, type Frame } from "@/lib/rivalry/replay";
import { ballPosition, DT, step, type Input, type Sim } from "@/lib/rivalry/sim";
import Players, { type Kit } from "./Players";
import Stadium from "./Stadium";
import { MID_X, wx, wz, YD } from "./space";

export type CameraMode = "orbit" | "huddle" | "live" | "celebrate" | "replay";

export interface Replay {
  frames: Frame[];
  /** A copy of the play, posed frame by frame (simRef points at it while the replay runs). */
  sim: Sim;
}

type BallSpot = Vec & { h: number };
const REPLAY_SPEED = 0.5;

/** Plays a recorded play back at half speed, then holds a beat and calls onEnd. */
function Replayer({ replay, ballOverrideRef, onEnd }: { replay: Replay | null; ballOverrideRef: React.RefObject<BallSpot | null>; onEnd: () => void }) {
  const t = useRef(0);
  const done = useRef(false);
  const current = useRef<Replay | null>(null);
  useFrame((_, dt) => {
    if (current.current !== replay) {
      current.current = replay;
      t.current = 0;
      done.current = false;
      if (!replay) ballOverrideRef.current = null;
    }
    if (!replay || done.current) return;
    t.current += Math.min(dt, 0.1) * REPLAY_SPEED;
    const { frames } = replay;
    const f = frameAt(frames, frames[0].t + t.current);
    applyFrame(replay.sim, f);
    ballOverrideRef.current = f.ball;
    if (frames[0].t + t.current > frames[frames.length - 1].t + 0.6) {
      done.current = true;
      onEnd();
    }
  });
  return null;
}

/** Name tags over the players in `tagsRef` (ids), e.g. pass targets and your ball carrier. */
function NameTags({ simRef, names, tagsRef }: { simRef: React.RefObject<Sim | null>; names: Record<number, string>; tagsRef: React.RefObject<number[]> }) {
  const groups = useRef<Record<number, THREE.Group | null>>({});
  const divs = useRef<Record<number, HTMLDivElement | null>>({});
  useFrame(() => {
    const s = simRef.current;
    const show = new Set(tagsRef.current ?? []);
    for (const key of Object.keys(names)) {
      const id = Number(key);
      const g = groups.current[id];
      const d = divs.current[id];
      const p = s?.players[id];
      if (!g || !d || !p) continue;
      g.position.set(wx(p.x), 2.55, wz(p.y));
      d.style.display = show.has(id) ? "block" : "none";
    }
  });
  return (
    <>
      {Object.entries(names).map(([id, name]) => (
        <group key={id} ref={(g) => void (groups.current[Number(id)] = g)}>
          <Html center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
            <div
              ref={(d) => void (divs.current[Number(id)] = d)}
              style={{ display: "none", fontFamily: "var(--font-bebas-neue)" }}
              className="px-1.5 py-0.5 bg-[#0d0f13]/85 text-white text-[13px] leading-none tracking-[.04em] whitespace-nowrap border-b-2 border-[var(--accent-light)]"
            >
              {name}
            </div>
          </Html>
        </group>
      ))}
    </>
  );
}

/** Steps the simulation at a fixed rate while the play is live. One-shot inputs are consumed. */
function SimDriver({
  simRef,
  inputRef,
  live,
  slowmo,
  onTick,
}: {
  simRef: React.RefObject<Sim | null>;
  inputRef: React.RefObject<Input>;
  live: boolean;
  slowmo: React.RefObject<number>;
  onTick: (s: Sim) => void;
}) {
  const acc = useRef(0);
  useFrame((_, dt) => {
    const s = simRef.current;
    if (!s || !live) return;
    acc.current += Math.min(dt, 0.1) * (slowmo.current ?? 1);
    while (acc.current >= DT) {
      acc.current -= DT;
      if (s.result) break;
      step(s, inputRef.current);
      inputRef.current.juke = false;
      inputRef.current.throwTo = undefined;
    }
    onTick(s);
  });
  return null;
}

function Ball({ simRef, ballOverrideRef }: { simRef: React.RefObject<Sim | null>; ballOverrideRef: React.RefObject<BallSpot | null> }) {
  const ref = useRef<THREE.Group>(null);
  const spin = useRef(0);
  useFrame((_, dt) => {
    const s = simRef.current;
    const g = ref.current;
    if (!s || !g) return;
    const replayed = ballOverrideRef.current;
    const b = replayed ?? ballPosition(s);
    g.position.set(wx(b.x), b.h * YD, wz(b.y));
    if (replayed) {
      g.visible = true;
      return;
    }
    if (s.ball.state === "air") {
      // Nose along the flight, spiraling.
      const dir = new THREE.Vector3(wx(s.ball.to!.x) - wx(s.ball.from!.x), 0, wz(s.ball.to!.y) - wz(s.ball.from!.y)).normalize();
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      spin.current += dt * 25;
      g.children[0].rotation.z = spin.current;
    }
    g.visible = s.ball.state !== "dead" || s.result?.how === "touchdown" || s.result?.how === "tackle";
  });
  return (
    <group ref={ref}>
      <group>
        <mesh scale={[0.1, 0.1, 0.16]} castShadow>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color="#7a3e1d" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.098, 0]} scale={[0.012, 0.004, 0.07]}>
          <boxGeometry />
          <meshStandardMaterial color="#f5f5f0" />
        </mesh>
      </group>
    </group>
  );
}

/** Broadcast camera: behind the offense, easing toward the ball; orbits for setup and celebrations. */
function CameraRig({ simRef, mode, los, ballOverrideRef }: { simRef: React.RefObject<Sim | null>; mode: CameraMode; los: number; ballOverrideRef: React.RefObject<BallSpot | null> }) {
  const look = useRef(new THREE.Vector3(0, 0, wz(los + 10)));
  const want = useMemo(() => new THREE.Vector3(), []);
  const wantLook = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock, camera, size }, dt) => {
    const s = simRef.current;
    // Portrait screens are narrow: go higher, farther back and wider so the receivers stay in frame.
    const portrait = size.height > size.width;
    const fov = portrait ? 70 : 50;
    const cam = camera as THREE.PerspectiveCamera;
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    const back = portrait ? 13 : 15;
    const up = portrait ? 17 : 12;
    let ease = 3;
    if (mode === "orbit") {
      const t = clock.elapsedTime * 0.08;
      want.set(Math.sin(t) * 70, 38, Math.cos(t) * 70);
      wantLook.set(0, 0, 0);
      ease = 1;
    } else if (mode === "celebrate" && s) {
      const b = ballPosition(s);
      const t = clock.elapsedTime * 0.5;
      want.set(wx(b.x) + Math.sin(t) * 9, 4, wz(b.y) + Math.cos(t) * 9);
      wantLook.set(wx(b.x), 1.2, wz(b.y));
      ease = 2;
    } else if (mode === "replay" && s) {
      // Low sideline angle, like a broadcast replay.
      const b = ballOverrideRef.current ?? ballPosition(s);
      want.set(wx(b.x) + (portrait ? 11 : 15), portrait ? 5 : 3.5, wz(b.y) + 6);
      wantLook.set(wx(b.x), 1, wz(b.y) - 2);
      ease = 3;
    } else if (mode === "live" && s) {
      const b = ballPosition(s);
      const x = wx(b.x) * 0.7;
      want.set(x, up, wz(b.y) + back);
      wantLook.set(x, 0, wz(b.y) - (portrait ? 14 : 11));
      ease = 4;
    } else {
      want.set(0, up, wz(los) + back + 2);
      wantLook.set(0, 0, wz(los + (portrait ? 15 : 12)));
      ease = 3;
    }
    const k = 1 - Math.exp(-ease * dt);
    camera.position.lerp(want, k);
    look.current.lerp(wantLook, k);
    camera.lookAt(look.current);
  });
  return null;
}

export default function Scene({
  simRef,
  inputRef,
  live,
  slowmo,
  onTick,
  mode,
  los,
  toGo,
  offense,
  defense,
  own,
  opp,
  excitement,
  shadows,
  replay,
  onReplayEnd,
  names,
  tagsRef,
}: {
  simRef: React.RefObject<Sim | null>;
  inputRef: React.RefObject<Input>;
  live: boolean;
  slowmo: React.RefObject<number>;
  onTick: (s: Sim) => void;
  mode: CameraMode;
  los: number;
  toGo: number;
  offense: Kit;
  defense: Kit;
  own: [string, string];
  opp: [string, string];
  excitement: React.RefObject<number>;
  shadows: boolean;
  replay: Replay | null;
  onReplayEnd: () => void;
  names: Record<number, string>;
  tagsRef: React.RefObject<number[]>;
}) {
  const ballOverrideRef = useRef<BallSpot | null>(null);
  return (
    <>
      <Stadium own={own} opp={opp} excitement={excitement} shadows={shadows} />
      <Players simRef={simRef} offense={offense} defense={defense} />
      <Ball simRef={simRef} ballOverrideRef={ballOverrideRef} />
      <LineMarkers los={los} toGo={toGo} />
      <NameTags simRef={simRef} names={names} tagsRef={tagsRef} />
      <SimDriver simRef={simRef} inputRef={inputRef} live={live} slowmo={slowmo} onTick={onTick} />
      <Replayer replay={replay} ballOverrideRef={ballOverrideRef} onEnd={onReplayEnd} />
      <CameraRig simRef={simRef} mode={mode} los={los} ballOverrideRef={ballOverrideRef} />
    </>
  );
}

/** Line of scrimmage (blue) and first-down line (yellow), drawn on the turf. */
function LineMarkers({ los, toGo }: { los: number; toGo: number }) {
  const width = 53.3 * YD;
  return (
    <group position={[wx(MID_X), 0.015, 0]}>
      <mesh rotation-x={-Math.PI / 2} position-z={wz(los)}>
        <planeGeometry args={[width, 0.22]} />
        <meshBasicMaterial color="#4f8dff" transparent opacity={0.85} depthWrite={false} />
      </mesh>
      {los + toGo < 100 && (
        <mesh rotation-x={-Math.PI / 2} position-z={wz(los + toGo)}>
          <planeGeometry args={[width, 0.22]} />
          <meshBasicMaterial color="#ffd23f" transparent opacity={0.9} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
