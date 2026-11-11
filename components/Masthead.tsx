"use client";

import { useEffect, useRef } from "react";
import { easeOut } from "@/lib/count-up";

const EASE = "cubic-bezier(0.2, 0.7, 0.2, 1)";
const MONO = { fontFamily: "var(--font-geist-mono)" };
const TITLE = "BLAKE'S SHOES";

/**
 * The home page masthead with its load-in motion (design handoff: home motion). Real values are
 * server-rendered; globals.css hides the start states only under html.motion without reduced
 * motion, and the Web Animations API plays everything once on mount. `children` is the champions
 * reel, which sits full-bleed along the bottom.
 */
export default function Masthead({ seasonCount, children }: { seasonCount: number; children?: React.ReactNode }) {
  const header = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = header.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const all = (sel: string) => [...root.querySelectorAll<HTMLElement>(sel)];
    const fadeUp = (el: Element, delay: number) =>
      el.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], {
        duration: 700,
        delay,
        easing: EASE,
        fill: "both",
      });

    all("[data-hero='rule']").forEach((el) =>
      el.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 800, delay: 100, easing: EASE, fill: "both" }),
    );
    all("[data-hero='label']").forEach((el) => fadeUp(el, 150));
    all(".hero-char").forEach((el, i) =>
      el.animate([{ transform: "translateY(105%)" }, { transform: "none" }], {
        duration: 900,
        delay: 280 + i * 55,
        easing: EASE,
        fill: "both",
      }),
    );
    all("[data-hero='stat']").forEach((el, i) => fadeUp(el, 900 + i * 100));
    all("[data-hero='reel']").forEach((el) =>
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, delay: 1300, easing: EASE, fill: "both" }),
    );

    // Stat numbers count up from 1000ms: 12 and the season count from 0, 2012 from 1990.
    const counters = all("[data-hero-count]").map((el) => {
      const node = el.firstChild as Text;
      const to = Number(el.dataset.heroCount);
      const from = Number(el.dataset.heroFrom ?? 0);
      node.nodeValue = String(from);
      return { node, from, to };
    });
    let frame = 0;
    const startAt = performance.now() + 1000;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, now - startAt) / 1100);
      for (const c of counters) c.node.nodeValue = String(Math.round(c.from + (c.to - c.from) * easeOut(t)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      for (const c of counters) c.node.nodeValue = String(c.to);
    };
  }, []);

  // Cursor spotlight + title parallax: CSS variables written straight to the header, no React state.
  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
    el.style.setProperty("--px", String(x - 0.5));
    el.style.setProperty("--py", String(y - 0.5));
    el.style.setProperty("--spot", "1");
  };
  const onPointerLeave = (e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--px", "0");
    el.style.setProperty("--py", "0");
    el.style.setProperty("--spot", "0");
  };

  return (
    <header
      ref={header}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`relative overflow-hidden bg-[#151515] text-[#f5f5f0] text-center pt-10 md:pt-[60px] ${children ? "" : "pb-9 md:pb-12"}`}
    >
      <div aria-hidden="true" className="hero-spot pointer-events-none absolute inset-0" />
      <div className="relative px-4 md:px-10">
        <div className="flex items-center justify-center gap-3.5 mb-4 flex-wrap">
          <span data-hero="rule" className="w-4 md:w-8 h-0.5 bg-[var(--accent-light)] origin-right" />
          <span
            data-hero="label"
            className="text-[9.5px] md:text-[11px] font-semibold tracking-[.26em] text-[var(--accent-light)]"
            style={MONO}
          >
            FANTASY FOOTBALL LEAGUE
          </span>
          <span data-hero="rule" className="w-4 md:w-8 h-0.5 bg-[var(--accent-light)] origin-left" />
        </div>
        <h1
          aria-label={TITLE}
          className="hero-title flex justify-center overflow-hidden pt-[.06em] pb-[.02em] text-[58px] md:text-[124px] leading-[.86] tracking-[-.01em] mb-5"
          style={{ fontFamily: "var(--font-bebas-neue)" }}
        >
          {[...TITLE].map((c, i) => (
            <span key={i} aria-hidden="true" className="hero-char inline-block whitespace-pre cursor-default">
              {c}
            </span>
          ))}
        </h1>
        <div className="flex justify-center flex-wrap text-[10px] md:text-[12px] tracking-[.1em] text-[#d4d4d0]" style={MONO}>
          <span data-hero="stat" className="px-3 md:px-[22px] py-1 border-r border-[#3a3a38]">
            <b data-hero-count="12" className="text-white">12</b> TEAMS
          </span>
          <span data-hero="stat" className="px-3 md:px-[22px] py-1 border-r border-[#3a3a38]">
            <b data-hero-count={seasonCount} className="text-white">{seasonCount}</b> SEASONS
          </span>
          <span data-hero="stat" className="px-3 md:px-[22px] py-1">
            EST. <b data-hero-count="2012" data-hero-from="1990" className="text-white">2012</b>
          </span>
        </div>
      </div>
      {children}
    </header>
  );
}
