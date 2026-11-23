"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FIELD_WIDTH } from "@/lib/games/core";
import { bebas, YD } from "./space";

const PPY = 20; // canvas pixels per yard

/** The field: stripes, lines, hashes, numbers, both end zones with names, and the league at midfield. */
function drawField(own: [string, string], opp: [string, string]): HTMLCanvasElement {
  const W = Math.round(FIELD_WIDTH * PPY);
  const H = 120 * PPY;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  // Canvas row r is yard line 110 - r / PPY (own goal line near the bottom).
  const row = (y: number) => (110 - y) * PPY;
  for (let y = 0; y < 100; y += 5) {
    g.fillStyle = (y / 5) % 2 === 0 ? "#2f6e3c" : "#2a6436";
    g.fillRect(0, row(y + 5), W, 5 * PPY);
  }
  for (const [y0, [color, name]] of [
    [-10, own],
    [100, opp],
  ] as [number, [string, string]][]) {
    g.fillStyle = color;
    g.fillRect(0, row(y0 + 10), W, 10 * PPY);
    g.fillStyle = "rgba(255,255,255,.9)";
    g.font = bebas(150);
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(name, W / 2, row(y0 + 5) + 8);
  }
  g.strokeStyle = "#f4f4f0";
  g.fillStyle = "#f4f4f0";
  for (let y = 0; y <= 100; y++) {
    const r = row(y);
    if (y % 5 === 0) {
      g.lineWidth = y === 0 || y === 100 ? 8 : 4;
      g.beginPath();
      g.moveTo(0, r);
      g.lineTo(W, r);
      g.stroke();
    } else {
      for (const x of [1, 23.58, 29.72, FIELD_WIDTH - 1]) g.fillRect(x * PPY - 10, r - 2, 20, 4);
    }
  }
  g.lineWidth = 10;
  g.strokeRect(5, row(110), W - 10, 120 * PPY);
  // Yard numbers, facing each sideline.
  g.font = bebas(64);
  g.textAlign = "center";
  g.textBaseline = "middle";
  for (let y = 10; y <= 90; y += 10) {
    const n = String(y <= 50 ? y : 100 - y);
    for (const [x, rot] of [
      [12, Math.PI / 2],
      [FIELD_WIDTH - 12, -Math.PI / 2],
    ] as [number, number][]) {
      g.save();
      g.translate(x * PPY, row(y));
      g.rotate(rot);
      g.fillText(n, 0, 0);
      g.restore();
    }
  }
  // Midfield.
  g.fillStyle = "rgba(255,255,255,.22)";
  g.font = bebas(120);
  g.fillText("BLAKE'S SHOES", W / 2, row(50) - 90);
  g.fillText("BLAKE'S SHOES", W / 2, row(50) + 90);
  return c;
}

function Field({ own, opp }: { own: [string, string]; opp: [string, string] }) {
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    let alive = true;
    document.fonts.ready.then(() => {
      if (!alive) return;
      const t = new THREE.CanvasTexture(drawField(own, opp));
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      setTex((old) => {
        old?.dispose();
        return t;
      });
    });
    return () => {
      alive = false;
    };
  }, [own, opp]);
  return (
    <group>
      {/* surround */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[FIELD_WIDTH * YD + 24, 120 * YD + 24]} />
        <meshStandardMaterial color="#1f4a2a" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[FIELD_WIDTH * YD, 120 * YD]} />
        {/* keyed so the textured material mounts fresh (a reused one keeps a reset, black color) */}
        {tex ? <meshStandardMaterial key="tex" map={tex} color="#ffffff" roughness={0.95} /> : <meshStandardMaterial key="plain" color="#2c683a" />}
      </mesh>
    </group>
  );
}

/** Tiered stands on both sidelines and behind each end zone, with an instanced crowd that bounces on big plays. */
function Stands({ colors, excitement }: { colors: string[]; excitement: React.RefObject<number> }) {
  const ROWS = 14;
  const halfW = (FIELD_WIDTH * YD) / 2 + 9;
  const halfL = (120 * YD) / 2 + 9;
  const tiers = useMemo(() => {
    const out: { pos: [number, number, number]; size: [number, number, number] }[] = [];
    for (let r = 0; r < ROWS; r++) {
      const step = r * 1.1;
      const h = 1.2 + r * 0.75;
      out.push({ pos: [-(halfW + step), h / 2, 0], size: [1.1, h, halfL * 2 + 10] });
      out.push({ pos: [halfW + step, h / 2, 0], size: [1.1, h, halfL * 2 + 10] });
      out.push({ pos: [0, h / 2, -(halfL + step)], size: [halfW * 2, h, 1.1] });
      out.push({ pos: [0, h / 2, halfL + step], size: [halfW * 2, h, 1.1] });
    }
    return out;
  }, [halfW, halfL]);

  const crowd = useRef<THREE.InstancedMesh>(null);
  const seats = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let r = 0; r < ROWS; r++) {
      const step = r * 1.1;
      const top = 1.2 + r * 0.75 + 0.4;
      for (let z = -halfL; z <= halfL; z += 0.9) {
        out.push([-(halfW + step), top, z]);
        out.push([halfW + step, top, z]);
      }
      for (let x = -halfW + 2; x <= halfW - 2; x += 0.9) {
        out.push([x, top, -(halfL + step)]);
        out.push([x, top, halfL + step]);
      }
    }
    return out;
  }, [halfW, halfL]);

  const uniforms = useRef({ uTime: { value: 0 }, uAmp: { value: 0.05 } });
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.9 });
    const u = uniforms.current;
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = u.uTime;
      shader.uniforms.uAmp = u.uAmp;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uTime;\nuniform float uAmp;")
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nfloat ph = float(gl_InstanceID) * 1.731;\ntransformed.y += max(0.0, sin(uTime * 7.0 + ph)) * uAmp * (0.6 + 0.4 * sin(ph * 3.1));",
        );
    };
    return m;
  }, []);

  useEffect(() => {
    const mesh = crowd.current!;
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    const neutrals = ["#d9d9d4", "#8a8f99", "#3b3f47", "#b8b2a6", "#5a5f6a"];
    seats.forEach(([x, y, z], i) => {
      const jitter = ((i * 9301 + 49297) % 233280) / 233280;
      m.makeTranslation(x + (jitter - 0.5) * 0.3, y, z);
      mesh.setMatrixAt(i, m);
      const pick = (i * 7919) % 100;
      c.set(pick < 40 ? colors[pick % colors.length] : neutrals[pick % neutrals.length]);
      mesh.setColorAt(i, c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [seats, colors]);

  useFrame(({ clock }) => {
    const u = uniforms.current;
    u.uTime.value = clock.elapsedTime;
    u.uAmp.value = THREE.MathUtils.lerp(u.uAmp.value, 0.05 + 0.35 * (excitement.current ?? 0), 0.05);
  });

  return (
    <group>
      {tiers.map((t, i) => (
        <mesh key={i} position={t.pos}>
          <boxGeometry args={t.size} />
          <meshStandardMaterial color={i % 8 < 4 ? "#1b2029" : "#20262f"} roughness={1} />
        </mesh>
      ))}
      <instancedMesh ref={crowd} args={[undefined, undefined, seats.length]} material={material} frustumCulled={false}>
        <boxGeometry args={[0.45, 0.75, 0.35]} />
      </instancedMesh>
    </group>
  );
}

function glowTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,250,230,1)");
  grad.addColorStop(0.25, "rgba(255,245,210,.6)");
  grad.addColorStop(1, "rgba(255,240,200,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function LightTowers() {
  const glow = useMemo(() => glowTexture(), []);
  const x = (FIELD_WIDTH * YD) / 2 + 26;
  const z = (120 * YD) / 2 - 10;
  const spots: [number, number][] = [
    [-x, -z],
    [x, -z],
    [-x, z],
    [x, z],
  ];
  return (
    <group>
      {spots.map(([px, pz], i) => (
        <group key={i} position={[px, 0, pz]}>
          <mesh position={[0, 17, 0]}>
            <cylinderGeometry args={[0.35, 0.5, 34, 8]} />
            <meshStandardMaterial color="#2a2f38" />
          </mesh>
          <mesh position={[0, 34.5, 0]} rotation-y={Math.atan2(-px, -pz)}>
            <boxGeometry args={[7, 3, 0.6]} />
            <meshStandardMaterial color="#fffbe6" emissive="#fff6d5" emissiveIntensity={3} />
          </mesh>
          <sprite position={[0, 34.5, 0]} scale={[22, 22, 1]}>
            <spriteMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.9} />
          </sprite>
        </group>
      ))}
    </group>
  );
}

export default function Stadium({
  own,
  opp,
  excitement,
  shadows,
}: {
  own: [string, string];
  opp: [string, string];
  excitement: React.RefObject<number>;
  shadows: boolean;
}) {
  const colors = useMemo(() => [own[0], opp[0]], [own, opp]);
  return (
    <group>
      <color attach="background" args={["#05080e"]} />
      <fog attach="fog" args={["#05080e", 70, 230]} />
      <hemisphereLight args={["#bcd0ff", "#1b3322", 0.9]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[30, 60, 25]}
        intensity={2.2}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
      />
      <directionalLight position={[-40, 50, -30]} intensity={0.9} />
      <Field own={own} opp={opp} />
      <Stands colors={colors} excitement={excitement} />
      <LightTowers />
    </group>
  );
}
