"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { CardData, Rarity } from "@/lib/cards-data";

const MONO = { fontFamily: "var(--font-geist-mono)" };
const BEBAS = { fontFamily: "var(--font-bebas-neue)" };

const FRAME: Record<Rarity, string> = {
  base: "linear-gradient(135deg,#f5f5f0,#d8d8d0)",
  foil: "linear-gradient(135deg,#e9edf2,#9aa4ae 30%,#f4f7fa 50%,#8e98a2 70%,#e9edf2)",
  gold: "linear-gradient(135deg,#f6e27a,#b8860b 30%,#fff3b0 50%,#a67c00 70%,#f6e27a)",
};
const TAG: Record<Rarity, string | null> = { base: null, foil: "FOIL", gold: "GOLD FOIL" };

/**
 * One retro trading card: photo front, stat-sheet back. Tap (or click/Enter) to flip. On desktop it
 * tilts toward the mouse with a moving glare; foil cards shimmer. Reduced motion: no tilt, instant flip.
 *
 * The flip is 2D (squeeze to zero width, swap faces, expand) rather than a 3D rotate with hidden
 * backfaces: Chrome stops painting images in some faces once a page has a dozen 3D card layers.
 */
export default function TradingCard({ card }: { card: CardData }) {
  const [flipped, setFlipped] = useState(false);
  const tilt = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);

  const flip = () => {
    const el = body.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFlipped((f) => !f);
      return;
    }
    const half = { duration: 160, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" as const };
    el.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], half).onfinish = () => {
      setFlipped((f) => !f);
      el.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { ...half, easing: "cubic-bezier(0,0,.2,1)" });
    };
  };

  const onMove = (e: React.PointerEvent) => {
    const el = tilt.current;
    if (!el || e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.transform = `rotateX(${((0.5 - y) * 14).toFixed(2)}deg) rotateY(${((x - 0.5) * 16).toFixed(2)}deg)`;
    el.style.setProperty("--gx", `${x * 100}%`);
    el.style.setProperty("--gy", `${y * 100}%`);
    el.style.setProperty("--glare", "1");
  };
  const onLeave = () => {
    const el = tilt.current;
    if (!el) return;
    el.style.transform = "";
    el.style.setProperty("--glare", "0");
  };

  const tag = TAG[card.rarity];
  const face = "absolute inset-0 rounded-[12px] p-[7px] shadow-[0_10px_24px_rgb(0_0_0/0.22)]";

  return (
    <button
      type="button"
      onClick={flip}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      aria-pressed={flipped}
      aria-label={`${card.name} card #${card.number}${tag ? `, ${tag.toLowerCase()}` : ""}. ${flipped ? "Showing stats" : "Showing front"}; tap to flip.`}
      className="block w-full max-w-[300px] mx-auto [perspective:1000px] text-left"
    >
      <div ref={tilt} className="transition-transform duration-200 ease-out motion-reduce:transition-none">
        <div ref={body} className="relative aspect-[5/7]">
          {/* Front */}
          <div className={`${face} ${flipped ? "hidden" : ""}`} style={{ background: FRAME[card.rarity] }}>
            <div className="relative h-full rounded-[7px] overflow-hidden bg-[#151515]">
              <Image src={card.image} alt="" fill sizes="300px" className="object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgb(0_0_0/0.75)_80%)]" />
              {card.rarity !== "base" && <div aria-hidden="true" className="card-foil absolute inset-0" />}
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none mix-blend-overlay transition-opacity duration-300"
                style={{ background: "radial-gradient(circle at var(--gx,50%) var(--gy,30%), rgb(255 255 255/0.55), transparent 45%)", opacity: "var(--glare,0)" }}
              />
              <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-[#151515] text-white text-[11px] font-bold tracking-[.1em]" style={MONO}>
                #{card.number}
              </span>
              {tag && (
                <span
                  className="absolute top-2 right-2 px-1.5 py-0.5 text-[9.5px] font-bold tracking-[.14em] text-[#151515]"
                  style={{ ...MONO, background: FRAME[card.rarity] }}
                >
                  {tag}
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 p-3">
                <div className="-skew-x-12 inline-block bg-[var(--accent)] px-2 py-0.5 mb-1.5">
                  <span className="skew-x-12 inline-block text-[10px] font-bold tracking-[.14em] text-white" style={MONO}>
                    {card.team.toUpperCase()}
                  </span>
                </div>
                <div className="text-[34px] leading-[.9] text-white" style={BEBAS}>
                  {card.name.toUpperCase()}
                </div>
                <div className="text-[10px] tracking-[.18em] text-[#c9c9c2] mt-1" style={MONO}>
                  MANAGER · SINCE {card.rookieYear}
                </div>
              </div>
            </div>
          </div>

          {/* Back */}
          <div className={`${face} ${flipped ? "" : "hidden"}`} style={{ background: FRAME[card.rarity] }}>
            <div className="h-full rounded-[7px] bg-[#f1ead8] text-[#151515] p-3.5 flex flex-col" style={MONO}>
              <div className="flex items-baseline justify-between border-b-2 border-[#151515] pb-1.5">
                <span className="text-[24px] leading-none" style={BEBAS}>
                  {card.name.toUpperCase()}
                </span>
                <span className="text-[11px] font-bold">#{card.number}</span>
              </div>
              <div className="text-[9px] tracking-[.16em] text-[#6b6455] mt-1">BLAKE&apos;S SHOES · SERIES 2026</div>
              <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1.5 text-[12px]">
                {[
                  ["SEASONS", String(card.seasons)],
                  ["RECORD", card.record],
                  ["WIN PCT", card.winPct],
                  ["PTS / GAME", card.ppg],
                  ["BEST FINISH", card.bestFinish ?? "—"],
                  ["ROOKIE YEAR", String(card.rookieYear)],
                ].map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-[#6b6455] tracking-[.1em]">{k}</dt>
                    <dd className="font-bold text-right tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 pt-2 border-t border-dashed border-[#151515]/40 text-[11px]">
                <span className="tracking-[.1em] text-[#6b6455]">TITLES </span>
                <span className="font-bold">{card.titleYears.length ? card.titleYears.join(" · ") : "Still hunting"}</span>
              </div>
              <div className="mt-auto text-center text-[9px] tracking-[.2em] text-[#6b6455]">TAP TO FLIP</div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
