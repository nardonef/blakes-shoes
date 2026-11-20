"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Act, Sim } from "@/lib/rivalry/sim";
import { wx, wz, yawFor, YD } from "./space";

export const PLAYERS_GLB = "/games/players.glb";

export interface Kit {
  jersey: string;
  pants: string;
  helmet: string;
}

/**
 * Recolor the mannequin by its rest-pose position: jersey up top, pants, dark socks/shoes and gloves.
 * `shade` darkens the joint pieces a touch so the body still reads as segmented.
 */
function kitMaterial(base: THREE.Material, kit: Kit, shade: number): THREE.Material {
  const m = (base as THREE.MeshStandardMaterial).clone();
  m.roughness = 0.65;
  m.metalness = 0.05;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uJersey = { value: new THREE.Color(kit.jersey).multiplyScalar(shade) };
    shader.uniforms.uPants = { value: new THREE.Color(kit.pants).multiplyScalar(shade) };
    shader.uniforms.uDark = { value: new THREE.Color("#1c1d20") };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vRest;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvRest = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vRest;\nuniform vec3 uJersey;\nuniform vec3 uPants;\nuniform vec3 uDark;")
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        vec3 kit = uPants;
        if (vRest.y > 0.98) kit = uJersey;
        if (vRest.y < 0.42) kit = uDark;
        if (abs(vRest.x) > 0.52) kit = uDark;
        if (vRest.y > 0.98 && vRest.y < 1.02) kit = uDark;
        diffuseColor.rgb = kit;`,
      );
  };
  m.customProgramCacheKey = () => `kit-${kit.jersey}-${kit.pants}-${shade}`;
  return m;
}

/** Helmet and shoulder pads, placed in the rest pose so they follow the head and chest bones. */
function addGear(root: THREE.Object3D, kit: Kit) {
  root.updateMatrixWorld(true);
  const head = root.getObjectByName("Head");
  const chest = root.getObjectByName("spine_03");
  const attach = (bone: THREE.Object3D | undefined, obj: THREE.Object3D, worldOffset: THREE.Vector3) => {
    if (!bone) return;
    const p = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld).add(worldOffset);
    const q = new THREE.Quaternion();
    bone.getWorldQuaternion(q);
    bone.add(obj);
    obj.position.copy(bone.worldToLocal(p));
    obj.quaternion.copy(q.invert());
  };
  const shell = new THREE.MeshStandardMaterial({ color: kit.helmet, roughness: 0.25, metalness: 0.35 });
  const grey = new THREE.MeshStandardMaterial({ color: "#c9ccd2", roughness: 0.4, metalness: 0.6 });
  const helmet = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.155, 20, 16), shell);
  dome.scale.set(1, 1.02, 1.12);
  helmet.add(dome);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.33), new THREE.MeshStandardMaterial({ color: "#f2f2ee", roughness: 0.4 }));
  stripe.position.set(0, 0.155, 0);
  helmet.add(stripe);
  for (let i = 0; i < 3; i++) {
    const bar = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.009, 6, 16, Math.PI), grey);
    bar.rotation.set(0, 0, Math.PI);
    bar.position.set(0, -0.03 - i * 0.045, 0.1);
    bar.scale.set(1, 0.6, 1);
    helmet.add(bar);
  }
  attach(head, helmet, new THREE.Vector3(0, 0.1, 0.01));
  const pads = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10), new THREE.MeshStandardMaterial({ color: kit.jersey, roughness: 0.7 }));
  pads.scale.set(1.45, 0.55, 0.9);
  attach(chest, pads, new THREE.Vector3(0, 0.12, 0));
  for (const o of [helmet, pads]) o.traverse((c) => ((c as THREE.Mesh).castShadow = true));
}

/** Which clip plays for each act, and whether it loops. */
const CLIP: Record<Act, [string, boolean]> = {
  stance: ["Crouch_Idle_Loop", true],
  idle: ["Idle_Loop", true],
  jog: ["Jog_Fwd_Loop", true],
  sprint: ["Sprint_Loop", true],
  block: ["Push_Loop", true],
  throw: ["OverhandThrow", false],
  tackled: ["Hit_Knockback", false],
  dive: ["Slide_Start", false],
  celebrate: ["Dance_Loop", true],
  stumble: ["Hit_Chest", false],
};

function shadowTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, "rgba(0,0,0,.55)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

interface Rig {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  actions: Map<string, THREE.AnimationAction>;
  current?: string;
  yaw: number;
}

export default function Players({ simRef, offense, defense }: { simRef: React.RefObject<Sim | null>; offense: Kit; defense: Kit }) {
  const gltf = useGLTF(PLAYERS_GLB);
  const shadowMesh = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1.5 * YD, 1.5 * YD).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false });
    return { geo, mat };
  }, []);
  const group = useRef<THREE.Group>(null);
  const shadows = useRef<THREE.InstancedMesh>(null);

  const rigs = useMemo<Rig[]>(() => {
    const kitMats = (kit: Kit) => {
      const cache = new Map<THREE.Material, THREE.Material>();
      return (mat: THREE.Material) => {
        if (!cache.has(mat)) cache.set(mat, kitMaterial(mat, kit, mat.name === "M_Main" ? 1 : 0.78));
        return cache.get(mat)!;
      };
    };
    const off = kitMats(offense);
    const def = kitMats(defense);
    return Array.from({ length: 22 }, (_, i) => {
      const root = cloneSkinned(gltf.scene);
      const swap = i < 11 ? off : def;
      root.traverse((o) => {
        const mesh = o as THREE.SkinnedMesh;
        if (mesh.isMesh) {
          mesh.material = swap(mesh.material as THREE.Material);
          mesh.castShadow = true;
          mesh.frustumCulled = false;
        }
      });
      addGear(root, i < 11 ? offense : defense);
      const mixer = new THREE.AnimationMixer(root);
      const actions = new Map(gltf.animations.map((clip) => [clip.name, mixer.clipAction(clip)]));
      return { root, mixer, actions, yaw: i < 11 ? Math.PI : 0 };
    });
  }, [gltf, offense, defense]);

  useEffect(() => {
    const g = group.current!;
    for (const r of rigs) g.add(r.root);
    return () => {
      for (const r of rigs) {
        g.remove(r.root);
        r.mixer.stopAllAction();
      }
    };
  }, [rigs]);

  const m = useMemo(() => new THREE.Matrix4(), []);
  useFrame((_, dt) => {
    const s = simRef.current;
    if (!s) return;
    s.players.forEach((p, i) => {
      const rig = rigs[i];
      if (!rig) return;
      rig.root.position.set(wx(p.x), 0, wz(p.y));
      const speed = Math.hypot(p.vx, p.vy);
      // Face the way you're moving; otherwise face the other team.
      const target = speed > 0.6 ? yawFor(p.vx, p.vy) : p.team === "off" ? Math.PI : 0;
      let d = target - rig.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      rig.yaw += d * Math.min(1, dt * 10);
      rig.root.rotation.y = rig.yaw;

      let act: Act = p.act;
      if ((act === "sprint" || act === "jog") && speed < 0.8) act = "idle";
      else if (act === "sprint" && speed < 5) act = "jog";
      const [name, loop] = CLIP[act];
      const action = rig.actions.get(name);
      if (action && rig.current !== name) {
        const prev = rig.current ? rig.actions.get(rig.current) : undefined;
        action.reset();
        action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
        action.clampWhenFinished = !loop;
        action.play();
        if (prev) action.crossFadeFrom(prev, 0.18, false);
        rig.current = name;
      }
      if (action && (act === "sprint" || act === "jog")) action.timeScale = Math.max(0.7, Math.min(1.4, speed / (act === "sprint" ? 7.5 : 4.5)));
      rig.mixer.update(dt);

      if (shadows.current) {
        m.makeTranslation(wx(p.x), 0.02, wz(p.y));
        shadows.current.setMatrixAt(i, m);
      }
    });
    if (shadows.current) shadows.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <group ref={group} />
      <instancedMesh ref={shadows} args={[shadowMesh.geo, shadowMesh.mat, 22]} frustumCulled={false} renderOrder={1} />
    </group>
  );
}

useGLTF.preload(PLAYERS_GLB);
