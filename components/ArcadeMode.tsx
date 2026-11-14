"use client";

import { useEffect, useSyncExternalStore } from "react";
import { keyInput, konamiMatcher, shouldStep, touchInput } from "@/lib/arcade";
import { airHorn, whistle } from "@/lib/arcade-sound";

const STORAGE = "bs-arcade";
const CHANGE = "bs-arcade-change";
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The mode lives in localStorage (remembered per browser); components read it through this tiny store.
const readMode = () => {
  try {
    return localStorage.getItem(STORAGE) === "1";
  } catch {
    return false;
  }
};
const subscribe = (cb: () => void) => {
  window.addEventListener(CHANGE, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CHANGE, cb);
    window.removeEventListener("storage", cb);
  };
};
function setMode(next: boolean, fanfare: boolean) {
  try {
    if (next) localStorage.setItem(STORAGE, "1");
    else localStorage.removeItem(STORAGE);
  } catch {}
  window.dispatchEvent(new Event(CHANGE));
  if (next && fanfare) {
    rain();
    airHorn();
  }
}

// A sneaker sole print: forefoot and heel pads.
const PRINT = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 40"><g fill="#2D5A3D"><ellipse cx="10" cy="11" rx="8" ry="10"/><ellipse cx="10" cy="31" rx="6" ry="7"/></g></svg>`,
)}`;

/** Sneakers rain down the screen (skipped with reduced motion). */
function rain() {
  if (reducedMotion()) return;
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText = "position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:65";
  for (let i = 0; i < 28; i++) {
    const img = document.createElement("img");
    const size = 34 + Math.random() * 34;
    img.src = "/arcade-sneaker.svg";
    img.alt = "";
    img.style.cssText = `position:absolute;top:0;left:${Math.random() * 96}%;width:${size}px;height:${size}px`;
    layer.appendChild(img);
    const spin = (Math.random() - 0.5) * 720;
    img.animate(
      [
        { transform: "translateY(-15vh) rotate(0deg)" },
        { transform: `translateY(115vh) rotate(${spin}deg)` },
      ],
      { duration: 1600 + Math.random() * 1200, delay: Math.random() * 900, easing: "cubic-bezier(.4,0,.8,.6)", fill: "both" },
    );
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 4000);
}

/** One footprint at (x, y) facing `angle`, nudged left/right like alternating steps; fades out. */
function step(x: number, y: number, angle: number, side: number) {
  const img = document.createElement("img");
  img.src = PRINT;
  img.alt = "";
  img.setAttribute("aria-hidden", "true");
  const off = side * 7;
  const px = x + Math.cos(angle + Math.PI / 2) * off;
  const py = y + Math.sin(angle + Math.PI / 2) * off;
  img.style.cssText = `position:fixed;left:${px - 6}px;top:${py - 12}px;width:12px;height:24px;pointer-events:none;z-index:60;transform:rotate(${angle + Math.PI / 2}rad)`;
  document.body.appendChild(img);
  img.animate([{ opacity: 0.55 }, { opacity: 0 }], { duration: 1200, easing: "ease-in", fill: "forwards" }).onfinish = () => img.remove();
}

/**
 * Hidden "Arcade mode", switched on and off with the Konami code (↑↑↓↓←→←→BA, or on a phone: swipe
 * up, up, down, down, left, right, left, right, then tap twice). Entering it rains sneakers and
 * sounds an air horn; while it's on, footprints follow the mouse and clicks blow a whistle.
 * Remembered per browser.
 */
export default function ArcadeMode() {
  const on = useSyncExternalStore(subscribe, readMode, () => false);

  // Listen for the code on keyboards and touch screens.
  useEffect(() => {
    const code = konamiMatcher();
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && t.closest("input, textarea, select, [contenteditable]");
    const onKey = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      if (code.push(keyInput(e.key))) setMode(!readMode(), true);
    };
    let start: { x: number; y: number } | null = null;
    let taps = 0;
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      start = { x: t.clientX, y: t.clientY };
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!start) return;
      const t = e.changedTouches[0];
      const input = touchInput(t.clientX - start.x, t.clientY - start.y, taps);
      taps = input === "a" || input === "b" ? taps + 1 : 0;
      start = null;
      if (code.push(input)) setMode(!readMode(), true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // While on: footprints behind the mouse, a whistle on every click.
  useEffect(() => {
    if (!on) return;
    let last: { x: number; y: number } | null = null;
    let side = 1;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || reducedMotion()) return;
      if (!shouldStep(last, e.clientX, e.clientY)) return;
      const angle = last ? Math.atan2(e.clientY - last.y, e.clientX - last.x) : -Math.PI / 2;
      step(e.clientX, e.clientY, angle, (side = -side));
      last = { x: e.clientX, y: e.clientY };
    };
    const onClick = () => whistle();
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("click", onClick, true);
    };
  }, [on]);

  if (!on) return null;
  return (
    <button
      type="button"
      onClick={() => setMode(false, false)}
      className="fixed bottom-4 left-4 z-[70] min-h-11 px-3.5 bg-[#151515] text-white border-2 border-[var(--accent-light)] text-[11px] font-semibold tracking-[.16em] flex items-center gap-2 shadow-[4px_4px_0_var(--accent)]"
      style={{ fontFamily: "var(--font-geist-mono)" }}
      aria-label="Arcade mode is on. Turn it off"
    >
      <span className="w-2 h-2 rounded-full bg-[var(--accent-light)] motion-safe:animate-pulse" aria-hidden="true" />
      ARCADE MODE <span className="text-[var(--accent-light)]">✕</span>
    </button>
  );
}
