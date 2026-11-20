// Field yards to three.js world units (meters). Offense drives toward -Z.

import { FIELD_WIDTH } from "@/lib/games/core";

export const YD = 0.9144;
export const MID_X = FIELD_WIDTH / 2;

export function wx(x: number): number {
  return (x - MID_X) * YD;
}

export function wz(y: number): number {
  return -(y - 50) * YD;
}

/** Yaw for a model that faces +Z, moving with field velocity (vx, vy). */
export function yawFor(vx: number, vy: number): number {
  return Math.atan2(vx, -vy);
}

export const lastName = (n: string) => n.split(" ").slice(-1)[0].toUpperCase();

/** Resolve next/font's generated Bebas family for canvas text (CSS variables don't work there). */
export function bebas(px: number): string {
  const fam = getComputedStyle(document.body).getPropertyValue("--font-bebas-neue").trim() || "Impact, sans-serif";
  return `${px}px ${fam}`;
}
