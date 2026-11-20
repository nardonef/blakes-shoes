// Canvas painting shared by the QB and RUN games: a striped field and player tokens.

import { FIELD_WIDTH } from "@/lib/games/core";

export const PX = 10;
export const FIELD_W = Math.round(FIELD_WIDTH * PX);

const HASH_X = [FIELD_WIDTH * 0.38, FIELD_WIDTH * 0.62];

let display: string | null = null;
/** Canvas fonts can't use CSS variables, so resolve next/font's generated Bebas family once. */
function displayFont(px: number): string {
  if (display === null) display = getComputedStyle(document.body).getPropertyValue("--font-bebas-neue").trim() || "Impact, sans-serif";
  return `${px}px ${display}`;
}

/**
 * Paint the field between yard lines yMin and yMax. `sy` maps a yard line (from your own goal,
 * 0-100; the QB game uses yards from scrimmage) to a canvas y. End zones are drawn only when on screen.
 */
export function paintField(
  ctx: CanvasRenderingContext2D,
  h: number,
  sy: (y: number) => number,
  yMin: number,
  yMax: number,
  opts: { numbers?: (y: number) => number | null; endZones?: { own: [string, string]; opp: [string, string] } } = {},
) {
  const W = FIELD_W;
  // 5-yard mowing stripes
  for (let y = Math.floor(yMin / 5) * 5; y < yMax; y += 5) {
    ctx.fillStyle = Math.floor(y / 5) % 2 === 0 ? "#2f6b3d" : "#2a6037";
    const top = sy(y + 5);
    ctx.fillRect(0, top, W, sy(y) - top);
  }
  if (opts.endZones) {
    const zones: [number, number, [string, string]][] = [
      [-10, 0, opts.endZones.own],
      [100, 110, opts.endZones.opp],
    ];
    for (const [a, b, [color, name]] of zones) {
      const top = sy(b);
      const bottom = sy(a);
      if (bottom < 0 || top > h) continue;
      ctx.fillStyle = color;
      ctx.fillRect(0, top, W, bottom - top);
      ctx.fillStyle = "rgba(255,255,255,.85)";
      ctx.font = displayFont(44);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(name, W / 2, (top + bottom) / 2 + 2);
    }
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let y = Math.ceil(yMin); y <= yMax; y++) {
    const py = sy(y);
    if (py < -30 || py > h + 30) continue;
    if (y % 5 === 0) {
      ctx.strokeStyle = y % 10 === 0 ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.3)";
      ctx.lineWidth = y === 0 || y === 100 ? 4 : 1.5;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(W, py);
      ctx.stroke();
      const n = opts.numbers?.(y);
      if (n != null && y % 10 === 0) {
        ctx.fillStyle = "rgba(255,255,255,.55)";
        ctx.font = displayFont(26);
        ctx.fillText(String(n), 34, py);
        ctx.fillText(String(n), W - 34, py);
      }
    } else {
      ctx.strokeStyle = "rgba(255,255,255,.35)";
      ctx.lineWidth = 1;
      for (const hx of HASH_X) {
        ctx.beginPath();
        ctx.moveTo(hx * PX - 5, py);
        ctx.lineTo(hx * PX + 5, py);
        ctx.stroke();
      }
    }
  }
}

export function line(ctx: CanvasRenderingContext2D, py: number, color: string, width = 3) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(0, py);
  ctx.lineTo(FIELD_W, py);
  ctx.stroke();
}

/** A player token: shadow, team-color body, optional ring, and a name tag underneath. */
export function token(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  opts: { r?: number; fill: string; ring?: string; ringWidth?: number; name?: string },
) {
  const r = opts.r ?? 10;
  ctx.fillStyle = "rgba(0,0,0,.3)";
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 4, r, r * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = opts.fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  if (opts.ring) {
    ctx.strokeStyle = opts.ring;
    ctx.lineWidth = opts.ringWidth ?? 3;
    ctx.stroke();
  }
  if (opts.name) {
    ctx.font = "bold 11px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const w = ctx.measureText(opts.name).width + 8;
    ctx.fillStyle = "rgba(21,21,21,.8)";
    ctx.fillRect(x - w / 2, y + r + 3, w, 15);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(opts.name, x, y + r + 5);
  }
}
